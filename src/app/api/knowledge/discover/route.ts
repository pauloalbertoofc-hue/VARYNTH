import { requireSession } from "@/lib/auth/require-session";
import { discoverKnowledge } from "@/lib/knowledge";

export async function GET(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const url = new URL(request.url);
  const requester = url.searchParams.get("requester") || "athena";
  const domain = url.searchParams.get("domain") || undefined;
  const projectId = url.searchParams.get("projectId") || undefined;
  const scope = (url.searchParams.get("scope") || "ALL") as "PUBLIC" | "PROJECT" | "DOMAIN" | "ALL";
  const discovery = await discoverKnowledge({ requester, domain, projectId, scope, purpose: "knowledge discovery" });
  return Response.json({ discovery, generatedAt: new Date().toISOString(), accessModel: "metadata_without_unrestricted_content" });
}
