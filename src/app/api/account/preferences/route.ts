import { requireSession } from "@/lib/auth/require-session";
import { getAccountPreferences, saveAccountPreferences } from "@/lib/customization/preferences-store";

export const runtime = "nodejs";
function sameOrigin(request: Request) { const origin = request.headers.get("origin"); return Boolean(origin && origin === new URL(request.url).origin); }

export async function PUT(request: Request) {
  const session = await requireSession();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Sessão necessária." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const body = await request.json();
    return Response.json(await saveAccountPreferences(email, session.user?.name || undefined, body), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar suas preferências." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Sessão necessária." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try {
    return Response.json(await saveAccountPreferences(email, session.user?.name || undefined, {}), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível restaurar as preferências." }, { status: 503 });
  }
}
