import { requireSession } from "@/lib/auth/require-session";
import { requestDomainResponse } from "@/lib/knowledge";
import { hydrateDomainRegistryFromPersistence } from "@/lib/knowledge/domain-registry-store";
import { knowledgeAccountId, withKnowledgeAccount } from "@/lib/knowledge/knowledge-account-store";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try { await hydrateDomainRegistryFromPersistence(); } catch { return Response.json({ error: "Domain Registry persistente indisponível." }, { status: 503 }); }
  const body = await request.json().catch(() => ({})) as { domain?: string; category?: string; query?: string; projectId?: string; purpose?: string };
  if (!body.domain?.trim() || !body.purpose?.trim()) return Response.json({ error: "domain e purpose são obrigatórios." }, { status: 400 });
  const userId = (session.user as typeof session.user & { id?: string }).id;
  const requester = userId ? `user:${userId}` : "authenticated-user";
  try {
    const response = await withKnowledgeAccount(knowledgeAccountId(session.user as typeof session.user & { id?: string }), () => requestDomainResponse({ requester, domain: body.domain!, category: body.category, query: body.query, projectId: body.projectId, purpose: body.purpose!, scope: "PUBLIC" }));
    return Response.json({ response, generatedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "Knowledge persistente indisponível." }, { status: 503 });
  }
}
