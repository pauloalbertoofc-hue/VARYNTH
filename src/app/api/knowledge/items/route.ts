import { requireOwner, requireSession } from "@/lib/auth/require-session";
import { knowledgeAccountId, knowledgeAccountPersistenceMode, withKnowledgeAccount } from "@/lib/knowledge/knowledge-account-store";
import { knowledgeRepository } from "@/lib/persistence/repositories";
import { listKnowledgeLifecycleItems, revokeKnowledge } from "@/lib/knowledge/service";
import { canonicalVaultProjection } from "@/lib/knowledge/vault-sync";
import { persistVaultKnowledgeProjection } from "@/lib/knowledge/vault-persistence.server";

export const runtime = "nodejs";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  if (new URL(request.url).searchParams.get("view") === "lifecycle") {
    if (!await requireOwner()) return Response.json({ error: "Apenas o owner pode consultar o inventário de lifecycle." }, { status: 403 });
    try {
      const user = session.user as typeof session.user & { id?: string };
      const items = await withKnowledgeAccount(knowledgeAccountId(user), listKnowledgeLifecycleItems);
      return Response.json({ items, persistenceMode: knowledgeAccountPersistenceMode() });
    } catch {
      return Response.json({ error: "Knowledge persistente indisponível." }, { status: 503 });
    }
  }
  try {
    const user = session.user as typeof session.user & { id?: string };
    const itemCount = await withKnowledgeAccount(knowledgeAccountId(user), async () => (await knowledgeRepository.getAll()).filter((item) => !item.invalidatedAt).length);
    return Response.json({ itemCount, persistenceMode: knowledgeAccountPersistenceMode(), accessModel: "account_scoped" });
  } catch {
    return Response.json({ error: "Knowledge persistente indisponível." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { operation?: unknown; item?: unknown; id?: unknown };
  const user = session.user as typeof session.user & { id?: string };
  try {
    if (body.operation === "UPSERT_VAULT") {
      const projection = canonicalVaultProjection(body.item);
      if (!projection) return Response.json({ error: "Item do Vault inválido." }, { status: 400 });
      const item = await withKnowledgeAccount(knowledgeAccountId(user), () => persistVaultKnowledgeProjection(body.item as import("@/lib/types/vault").VaultItem));
      return Response.json({ item, persistenceMode: knowledgeAccountPersistenceMode(), persisted: true });
    }
    if (body.operation === "REVOKE_VAULT" && typeof body.id === "string" && body.id.startsWith("vault:")) {
      const item = await withKnowledgeAccount(knowledgeAccountId(user), () => revokeKnowledge(body.id as string));
      return Response.json({ item, persistenceMode: knowledgeAccountPersistenceMode(), persisted: true });
    }
    return Response.json({ error: "Operação inválida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao persistir Knowledge.";
    const unavailable = message.includes("PERSISTENCE_UNAVAILABLE") || message.includes("STORE_UNAVAILABLE");
    return Response.json({ error: unavailable ? "Persistência remota de Knowledge indisponível; a cópia local foi mantida." : message }, { status: unavailable ? 503 : 409 });
  }
}
