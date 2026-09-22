import { requireSession } from "@/lib/auth/require-session";
import { askSpecialist } from "@/lib/knowledge";

export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { requester?: string; domain?: string; query?: string; purpose?: string; projectId?: string };
  if (!body.query?.trim() || !body.purpose?.trim()) return Response.json({ error: "query e purpose obrigatórios." }, { status: 400 });
  const response = await askSpecialist({ requester: body.requester || "authenticated-agent", domain: body.domain, query: body.query, purpose: body.purpose, projectId: body.projectId, scope: "PUBLIC" });
  return Response.json({ response, generatedAt: new Date().toISOString() });
}
