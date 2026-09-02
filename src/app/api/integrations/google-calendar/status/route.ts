import { loadTokens, oauthConfig } from "@/lib/athena/integrations/google-calendar-oauth-server";
export const runtime = "nodejs";
export async function GET() { const config = oauthConfig(); return Response.json({ configured: config.configured, missing: config.missing, connected: Boolean(await loadTokens()), readOnly: true }); }
