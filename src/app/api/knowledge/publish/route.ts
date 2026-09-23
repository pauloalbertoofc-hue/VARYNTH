import { requireOwner } from "@/lib/auth/require-session";
import { publishKnowledge, revokeKnowledge } from "@/lib/knowledge";
import { knowledgeAccountId, withKnowledgeAccount } from "@/lib/knowledge/knowledge-account-store";

export async function POST(request: Request) {
  const session = await requireOwner();
  if (!session) return Response.json({ error: "Apenas o owner pode publicar conhecimento." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: string; visibility?: "PUBLIC_TO_AGENTS" | "DOMAIN" | "CROSS_DOMAIN" };
  if (!body.id) return Response.json({ error: "id obrigatório." }, { status: 400 });
  try {
    const item = await withKnowledgeAccount(knowledgeAccountId(session.user as typeof session.user & { id?: string }), () => publishKnowledge(body.id!, "system", body.visibility || "PUBLIC_TO_AGENTS"));
    return Response.json({ item, publishedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "Knowledge persistente indisponível." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireOwner();
  if (!session) return Response.json({ error: "Apenas o owner pode revogar conhecimento." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id obrigatório." }, { status: 400 });
  try {
    const item = await withKnowledgeAccount(knowledgeAccountId(session.user as typeof session.user & { id?: string }), () => revokeKnowledge(id));
    return Response.json({ item, revokedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "Knowledge persistente indisponível." }, { status: 503 });
  }
}
