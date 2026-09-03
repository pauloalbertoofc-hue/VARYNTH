import { requireSession } from "@/lib/auth/require-session";
import { fetchDriveFiles, oauthConfig } from "@/lib/athena/integrations/google-calendar-oauth-server";
export const runtime = "nodejs";
function sameOrigin(request: Request) { const origin = request.headers.get("origin"); return Boolean(origin && origin === new URL(request.url).origin); }
export async function POST(request: Request) { if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 }); if (!sameOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 }); if (!oauthConfig().configured) return Response.json({ error: "OAuth não configurado." }, { status: 503 }); try { return Response.json({ files: await fetchDriveFiles(), syncedAt: new Date().toISOString(), readOnly: true }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Falha na leitura do Drive." }, { status: 502 }); } }
