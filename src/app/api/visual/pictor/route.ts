import { NextResponse } from "next/server";
import { pictorAgent } from "@/lib/athena/agents/council/pictor";
import type { AthenaContext } from "@/lib/athena/domain/context";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { prompt?: unknown; visualQuality?: unknown } | null;
  if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) return NextResponse.json({ error: "PROMPT_REQUIRED" }, { status: 400 });
  const now = new Date().toISOString();
  const context: AthenaContext = { scope: "geral", relevantProjects: [], relevantTasks: [], relevantVaultItems: [], relevantChronosEvents: [], relevantTheses: [], relevantEvidences: [], relevantOpportunities: [], systemTime: now };
  const visualQuality = body.visualQuality && typeof body.visualQuality === "object" ? body.visualQuality : undefined;
  const result = await pictorAgent.execute({ id: `visual-${Date.now()}`, title: "Consulta visual", rawPrompt: body.prompt.trim(), type: "GENERAL_DELIBERATION", priority: "media", status: "CREATED", scope: "visual", entities: {}, metadata: visualQuality ? { visualQuality } : undefined, createdAt: now, updatedAt: now }, context);
  return NextResponse.json({ content: result.content, recommendations: result.recommendations ?? [], metadata: result.metadata });
}
