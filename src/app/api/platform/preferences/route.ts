import { requireOwner, requireSession } from "@/lib/auth/require-session";
import { getAccountPreferences, savePlatformPreferences } from "@/lib/customization/preferences-store";

export const runtime = "nodejs";
function sameOrigin(request: Request) { const origin = request.headers.get("origin"); return Boolean(origin && origin === new URL(request.url).origin); }
export async function GET() {
  const session = await requireSession(); const email = session?.user?.email;
  if (!email) return Response.json({ error: "Sessão necessária." }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const name = session.user?.name || undefined;
  try { return Response.json({ preferences: await getAccountPreferences(email, name), canPublishDefault: role === "owner" }, { headers: { "cache-control": "no-store" } }); }
  catch { return Response.json({ error: "Não foi possível carregar as preferências." }, { status: 503 }); }
}
export async function PUT(request: Request) {
  const owner = await requireOwner(); if (!owner?.user?.email) return Response.json({ error: "Acesso de proprietário necessário." }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try { const body = await request.json(); return Response.json(await savePlatformPreferences(owner.user.email, body), { headers: { "cache-control": "no-store" } }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar as preferências." }, { status: 503 }); }
}
