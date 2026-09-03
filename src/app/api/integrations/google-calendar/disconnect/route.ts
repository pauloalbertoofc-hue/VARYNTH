import { disconnectGoogleCalendar } from "@/lib/athena/integrations/google-calendar-oauth-server";
import { requireSession } from "@/lib/auth/require-session";
export const runtime = "nodejs";
function sameOrigin(request: Request) { const origin = request.headers.get("origin"); return !origin || origin === new URL(request.url).origin; }
export async function DELETE(request: Request) { if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 }); if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 }); await disconnectGoogleCalendar(); return Response.json({ disconnected: true }); }
