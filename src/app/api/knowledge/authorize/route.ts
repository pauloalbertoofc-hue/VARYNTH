import { requireOwner } from "@/lib/auth/require-session";

const operations = new Set(["CLASSIFY", "PUBLISH", "REVOKE"]);

export async function POST(request: Request) {
  if (!await requireOwner()) return Response.json({ error: "Apenas o owner pode alterar Knowledge Items." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { operation?: string; itemId?: string };
  if (!body.itemId || !body.operation || !operations.has(body.operation)) return Response.json({ error: "Operação ou item inválido." }, { status: 400 });
  return Response.json({ authorized: true, operation: body.operation, itemId: body.itemId, grantedAt: new Date().toISOString() });
}
