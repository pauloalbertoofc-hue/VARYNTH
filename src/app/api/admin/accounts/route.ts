import { requireOwner } from "@/lib/auth/require-session";
import { setUserStatus } from "@/lib/auth/user-store";

export const runtime = "nodejs";
function sameOrigin(request: Request) { const origin = request.headers.get("origin"); return Boolean(origin && origin === new URL(request.url).origin); }

export async function PATCH(request: Request) {
  if (!await requireOwner()) return Response.json({ error: "Acesso de proprietário necessário." }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { userId?: unknown; decision?: unknown };
  if (typeof body.userId !== "string" || !body.userId || (body.decision !== "approved" && body.decision !== "rejected")) return Response.json({ error: "Informe uma conta e uma decisão válidas." }, { status: 400 });
  try {
    if (!await setUserStatus(body.userId, body.decision)) return Response.json({ error: "Conta não encontrada." }, { status: 404 });
    return Response.json({ updated: true });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar a conta." }, { status: 409 }); }
}
