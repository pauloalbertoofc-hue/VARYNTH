import { requireSession } from "@/lib/auth/require-session";
import { requestDomainResponse } from "@/lib/knowledge";
import { hydrateDomainRegistryFromPersistence } from "@/lib/knowledge/domain-registry-store";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try { await hydrateDomainRegistryFromPersistence(); } catch { return Response.json({ error: "Domain Registry persistente indisponível." }, { status: 503 }); }
  const body = await request.json().catch(() => ({})) as { domain?: string; query?: string; projectId?: string; purpose?: string };
  if (!body.domain?.trim() || !body.purpose?.trim()) return Response.json({ error: "domain e purpose são obrigatórios." }, { status: 400 });
  const userId = (session.user as typeof session.user & { id?: string }).id;
  const requester = userId ? `user:${userId}` : "authenticated-user";
  return Response.json({ response: await requestDomainResponse({ requester, domain: body.domain, query: body.query, projectId: body.projectId, purpose: body.purpose, scope: "PUBLIC" }), generatedAt: new Date().toISOString() });
}
