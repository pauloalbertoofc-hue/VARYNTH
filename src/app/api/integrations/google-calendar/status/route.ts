import { loadTokens, oauthConfig } from "@/lib/athena/integrations/google-calendar-oauth-server";
import { requireSession } from "@/lib/auth/require-session";
export const runtime = "nodejs";
export async function GET() { if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 }); const config = oauthConfig(); const workspaceEnabled = process.env.VARYNTH_GOOGLE_WORKSPACE_ENABLED === "true"; return Response.json({ configured: config.configured, missing: config.missing, connected: Boolean(await loadTokens()), readOnly: true, workspaceEnabled, storage: { driver: config.store.driver, persistent: config.store.persistent }, services: workspaceEnabled ? ["google-calendar", "google-drive", "gmail"] : ["google-calendar"] }); }
