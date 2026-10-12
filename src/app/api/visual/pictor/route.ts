import { NextResponse } from "next/server";
import { pictorAgent } from "@/lib/athena/agents/council/pictor";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { prompt?: unknown } | null;
  if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) return NextResponse.json({ error: "PROMPT_REQUIRED" }, { status: 400 });
  const now = new Date().toISOString();
  const result = await pictorAgent.execute({ id: `visual-${Date.now()}`, title: "Consulta visual", rawPrompt: body.prompt.trim(), type: "GENERAL_DELIBERATION", priority: "media", status: "CREATED", scope: "visual", entities: {}, createdAt: now, updatedAt: now }, {});
  return NextResponse.json({ content: result.content, recommendations: result.recommendations ?? [], metadata: result.metadata });
}
