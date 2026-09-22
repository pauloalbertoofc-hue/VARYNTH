import { requireSession } from "@/lib/auth/require-session";
import { requestDomainResponse } from "@/lib/knowledge";

export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { requester?: string; domain?: string; query?: string; projectId?: string; purpose?: string; scope?: "PUBLIC" | "PROJECT" | "DOMAIN" | "ALL" };
  if (!body.requester?.trim() || !body.domain?.trim() || !body.purpose?.trim()) return Response.json({ error: "requester, domain e purpose são obrigatórios." }, { status: 400 });
  return Response.json({ response: await requestDomainResponse({ ...body, requester: body.requester, domain: body.domain, purpose: body.purpose }), generatedAt: new Date().toISOString() });
}
