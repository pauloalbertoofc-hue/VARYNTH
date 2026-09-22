import { requireSession } from "@/lib/auth/require-session";
import { decomposeKnowledgeTask } from "@/lib/knowledge";
import { hydrateDomainRegistryFromPersistence } from "@/lib/knowledge/domain-registry-store";

export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try { await hydrateDomainRegistryFromPersistence(); } catch { return Response.json({ error: "Domain Registry persistente indisponível." }, { status: 503 }); }
  const body = await request.json().catch(() => ({})) as { task?: string; currentModule?: string; projectId?: string };
  if (!body.task?.trim()) return Response.json({ error: "task obrigatório." }, { status: 400 });
  return Response.json({ decomposition: decomposeKnowledgeTask({ ...body, task: body.task }), generatedAt: new Date().toISOString() });
}
