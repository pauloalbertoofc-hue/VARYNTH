import { requireOwner } from "@/lib/auth/require-session";
import { updateKnowledge } from "@/lib/knowledge";
import { knowledgeAccountId, withKnowledgeAccount } from "@/lib/knowledge/knowledge-account-store";

export async function PATCH(request: Request) {
  const session = await requireOwner();
  if (!session) return Response.json({ error: "Apenas o owner pode atualizar conhecimento." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: string; patch?: Record<string, unknown> };
  if (!body.id || !body.patch || typeof body.patch !== "object") return Response.json({ error: "id e patch obrigatórios." }, { status: 400 });
  const allowed = new Set(["title", "content", "primaryDomain", "relatedDomains", "categories", "tags", "ownerAgent", "visibility", "sensitivity", "lifecycleState", "classification", "validFrom", "validUntil"]);
  if (Object.keys(body.patch).some((key) => !allowed.has(key))) return Response.json({ error: "O patch contém campos não editáveis." }, { status: 400 });
  try {
    const user = session.user as typeof session.user & { id?: string };
    const item = await withKnowledgeAccount(knowledgeAccountId(user), () => updateKnowledge(body.id!, "system", body.patch!, { type: "USER", id: "owner" }));
    return Response.json({ item, updatedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("[KNOWLEDGE_LIFECYCLE_")) {
      return Response.json({ error: error.message.replace(/^\[[^\]]+\]\s*/u, "") }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith("[KNOWLEDGE_PATCH_INVALID]")) return Response.json({ error: error.message.replace(/^\[[^\]]+\]\s*/u, "") }, { status: 400 });
    return Response.json({ error: "Knowledge persistente indisponível." }, { status: 503 });
  }
}
