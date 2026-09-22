import { requireSession } from "@/lib/auth/require-session";
import { domainRegistry, getPublicKnowledgeProfile } from "@/lib/knowledge";

export async function GET(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const domain = new URL(request.url).searchParams.get("domain");
  const profiles = domain ? [getPublicKnowledgeProfile(domain)].filter(Boolean) : domainRegistry.listDomains().map((entry) => getPublicKnowledgeProfile(entry.id)).filter(Boolean);
  return Response.json({ profiles, generatedAt: new Date().toISOString(), policy: "PUBLIC_TO_AGENTS_ONLY" });
}
