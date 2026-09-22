import { requireSession } from "@/lib/auth/require-session";
import { listKnowledgeRelationships } from "@/lib/knowledge";

export async function GET(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || undefined;
  return Response.json({ relationships: await listKnowledgeRelationships(id), generatedAt: new Date().toISOString(), accessModel: "relationship-metadata" });
}
