import { requireSession } from "@/lib/auth/require-session";
import { listPublicCapabilities } from "@/lib/knowledge";

export async function GET() {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  return Response.json({ capabilities: listPublicCapabilities(), generatedAt: new Date().toISOString(), policy: "public-agent-knowledge-only" });
}
