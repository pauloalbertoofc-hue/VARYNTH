import { NextResponse } from "next/server";
import { pictorAgent } from "@/lib/athena/agents/council/pictor";
import type { AthenaContext } from "@/lib/athena/domain/context";

const MAX_PICTOR_PROMPT_LENGTH = 4000;
const VISUAL_CONTEXT_KEYS = ["captureId", "mode", "capturedAt", "source", "originalAssetId", "imageArtifactId"] as const;

function sanitizeVisualContext(value: unknown): Record<string, string | boolean> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Record<string, unknown>;
  const result: Record<string, string | boolean> = {};
  for (const key of VISUAL_CONTEXT_KEYS)
    if (typeof input[key] === "string" && input[key].trim()) result[key] = input[key].trim().slice(0, 160);
  if (typeof input.generated === "boolean") result.generated = input.generated;
  return Object.keys(result).length ? result : undefined;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    prompt?: unknown;
    visualQuality?: unknown;
    visualContext?: unknown;
  } | null;
  if (!body || typeof body.prompt !== "string" || !body.prompt.trim())
    return NextResponse.json({ error: "PROMPT_REQUIRED" }, { status: 400 });
  if (body.prompt.trim().length > MAX_PICTOR_PROMPT_LENGTH)
    return NextResponse.json(
      { error: "PROMPT_TOO_LONG", maxLength: MAX_PICTOR_PROMPT_LENGTH },
      { status: 413 },
    );
  const now = new Date().toISOString();
  const context: AthenaContext = {
    scope: "geral",
    relevantProjects: [],
    relevantTasks: [],
    relevantVaultItems: [],
    relevantChronosEvents: [],
    relevantTheses: [],
    relevantEvidences: [],
    relevantOpportunities: [],
    systemTime: now,
  };
  const visualQuality =
    body.visualQuality && typeof body.visualQuality === "object"
      ? body.visualQuality
      : undefined;
  const visualContext = sanitizeVisualContext(body.visualContext);
  const result = await pictorAgent.execute(
    {
      id: `visual-${Date.now()}`,
      title: "Consulta visual",
      rawPrompt: body.prompt.trim(),
      type: "GENERAL_DELIBERATION",
      priority: "media",
      status: "CREATED",
      scope: "visual",
      entities: {},
      metadata: visualQuality || visualContext ? { visualQuality, visualContext } : undefined,
      createdAt: now,
      updatedAt: now,
    },
    context,
  );
  return NextResponse.json({
    content: result.content,
    recommendations: result.recommendations ?? [],
    metadata: result.metadata,
  });
}
