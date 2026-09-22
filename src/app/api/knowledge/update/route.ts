import { requireOwner } from "@/lib/auth/require-session";
import { updateKnowledge } from "@/lib/knowledge";

export async function PATCH(request: Request) {
  if (!await requireOwner()) return Response.json({ error: "Apenas o owner pode atualizar conhecimento." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: string; patch?: Record<string, unknown> };
  if (!body.id || !body.patch || typeof body.patch !== "object") return Response.json({ error: "id e patch obrigatórios." }, { status: 400 });
  return Response.json({ item: await updateKnowledge(body.id, "system", body.patch), updatedAt: new Date().toISOString() });
}
