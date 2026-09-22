import { requireSession } from "@/lib/auth/require-session";
import { domainRegistry } from "@/lib/knowledge";

export async function GET() {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  return Response.json({ domains: domainRegistry.listDomains(), awarenessIndex: domainRegistry.getAwarenessIndex(), generatedAt: new Date().toISOString(), accessModel: "awareness_without_unrestricted_content" });
}
