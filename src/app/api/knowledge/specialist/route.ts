import { requireSession } from "@/lib/auth/require-session";
import { askSpecialist } from "@/lib/knowledge";
import { hydrateDomainRegistryFromPersistence } from "@/lib/knowledge/domain-registry-store";
import { knowledgeAccountId, withKnowledgeAccount } from "@/lib/knowledge/knowledge-account-store";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try { await hydrateDomainRegistryFromPersistence(); } catch { return Response.json({ error: "Domain Registry persistente indisponível." }, { status: 503 }); }
  const body = await request.json().catch(() => ({})) as { domain?: string; query?: string; purpose?: string; projectId?: string };
  if (!body.query?.trim() || !body.purpose?.trim()) return Response.json({ error: "query e purpose obrigatórios." }, { status: 400 });
  const userId = (session.user as typeof session.user & { id?: string }).id;
  const requester = userId ? `user:${userId}` : "authenticated-user";
  try {
    const response = await withKnowledgeAccount(knowledgeAccountId(session.user as typeof session.user & { id?: string }), () => askSpecialist({ requester, domain: body.domain, query: body.query!, purpose: body.purpose!, projectId: body.projectId, scope: "PUBLIC" }));
    return Response.json({ response, generatedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "Knowledge persistente indisponível." }, { status: 503 });
  }
}
