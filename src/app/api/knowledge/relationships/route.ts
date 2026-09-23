import { requireSession } from "@/lib/auth/require-session";
import { listKnowledgeRelationships } from "@/lib/knowledge";
import { knowledgeAccountId, withKnowledgeAccount } from "@/lib/knowledge/knowledge-account-store";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || undefined;
  try {
    const relationships = await withKnowledgeAccount(knowledgeAccountId(session.user as typeof session.user & { id?: string }), () => listKnowledgeRelationships(id));
    return Response.json({ relationships, generatedAt: new Date().toISOString(), accessModel: "relationship-metadata" });
  } catch {
    return Response.json({ error: "Knowledge persistente indisponível." }, { status: 503 });
  }
}
