import { requireOwner } from "@/lib/auth/require-session";
import { listUsers } from "@/lib/auth/user-store";
import { oauthConfig } from "@/lib/athena/integrations/google-calendar-oauth-server";

export const runtime = "nodejs";

export async function GET() {
  if (!await requireOwner()) return Response.json({ error: "Acesso de proprietário necessário." }, { status: 403 });
  const oauth = oauthConfig();
  const users = await listUsers();
  return Response.json({
    users,
    authEnabled: process.env.VARYNTH_AUTH_ENABLED === "true",
    workspaceEnabled: process.env.VARYNTH_GOOGLE_WORKSPACE_ENABLED === "true",
    oauth: { configured: oauth.configured, missing: oauth.missing, storage: oauth.store },
  });
}
