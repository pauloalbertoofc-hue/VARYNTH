import { requireSession } from "@/lib/auth/require-session";
import { decomposeKnowledgeTask } from "@/lib/knowledge";

export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { task?: string; currentModule?: string; projectId?: string };
  if (!body.task?.trim()) return Response.json({ error: "task obrigatório." }, { status: 400 });
  return Response.json({ decomposition: decomposeKnowledgeTask(body), generatedAt: new Date().toISOString() });
}
