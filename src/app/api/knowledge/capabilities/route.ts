import { requireSession } from "@/lib/auth/require-session";
import { listPublicCapabilities } from "@/lib/knowledge";
import { hydrateDomainRegistryFromPersistence } from "@/lib/knowledge/domain-registry-store";

export async function GET() {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try { await hydrateDomainRegistryFromPersistence(); } catch { return Response.json({ error: "Domain Registry persistente indisponível." }, { status: 503 }); }
  return Response.json({ capabilities: listPublicCapabilities(), generatedAt: new Date().toISOString(), policy: "public-agent-knowledge-only" });
}
