import { requireOwner } from "@/lib/auth/require-session";
import { publishKnowledge, revokeKnowledge } from "@/lib/knowledge";

export async function POST(request: Request) {
  if (!await requireOwner()) return Response.json({ error: "Apenas o owner pode publicar conhecimento." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: string; visibility?: "PUBLIC_TO_AGENTS" | "DOMAIN" | "CROSS_DOMAIN" };
  if (!body.id) return Response.json({ error: "id obrigatório." }, { status: 400 });
  return Response.json({ item: await publishKnowledge(body.id, "system", body.visibility || "PUBLIC_TO_AGENTS"), publishedAt: new Date().toISOString() });
}

export async function DELETE(request: Request) {
  if (!await requireOwner()) return Response.json({ error: "Apenas o owner pode revogar conhecimento." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id obrigatório." }, { status: 400 });
  return Response.json({ item: await revokeKnowledge(id), revokedAt: new Date().toISOString() });
}
