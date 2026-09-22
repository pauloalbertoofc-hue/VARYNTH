import { requireSession } from "@/lib/auth/require-session";
import { discoverKnowledge } from "@/lib/knowledge";
import { hydrateDomainRegistryFromPersistence } from "@/lib/knowledge/domain-registry-store";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try { await hydrateDomainRegistryFromPersistence(); } catch { return Response.json({ error: "Domain Registry persistente indisponível." }, { status: 503 }); }
  const url = new URL(request.url);
  const userId = (session.user as typeof session.user & { id?: string }).id;
  const requester = userId ? `user:${userId}` : "authenticated-user";
  const domain = url.searchParams.get("domain") || undefined;
  const projectId = url.searchParams.get("projectId") || undefined;
  const scope = (url.searchParams.get("scope") || "ALL") as "PUBLIC" | "PROJECT" | "DOMAIN" | "ALL";
  const discovery = await discoverKnowledge({ requester, domain, projectId, scope, purpose: "knowledge discovery" });
  return Response.json({ discovery, generatedAt: new Date().toISOString(), accessModel: "metadata_without_unrestricted_content" });
}
