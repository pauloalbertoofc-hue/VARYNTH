import type { ExperienceRecord } from "@/lib/experience/contracts";

function suppressHistoricalGuidance(instruction: string): boolean {
  const normalized = instruction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(?:nao\s+(?:use|considere|aplique|consulte)|sem|ignore|desconsidere)\b.{0,80}\b(?:experien|historico|memoria|preferenc|personaliz)\w*/i.test(normalized);
}

export function buildProjectExperienceGuidance(input: {
  records: readonly ExperienceRecord[];
  projectId?: string;
  currentInstruction: string;
  limit?: number;
}): { text: string; experienceIds: string[] } {
  if (!input.projectId || suppressHistoricalGuidance(input.currentInstruction)) {
    return { text: "", experienceIds: [] };
  }

  const limit = Math.max(0, Math.min(2, Math.floor(input.limit ?? 2)));
  const relevant = input.records
    .filter((record) => record.scope === "PROJECT"
      && record.scopeId === input.projectId
      && record.situation.trim().length > 0
      && record.action.trim().length > 0
      && record.outcome.trim().length > 0
      && record.evidence.length > 0
      && record.confidence >= 0.5
      && (record.usefulness ?? 0) > 0)
    .sort((a, b) => (b.usefulness ?? 0) - (a.usefulness ?? 0) || b.confidence - a.confidence)
    .slice(0, limit);

  if (!relevant.length) return { text: "", experienceIds: [] };

  const notes = relevant.map((record) =>
    `Situação registrada: “${record.situation.slice(0, 180)}”; ação: “${record.action.slice(0, 180)}”; resultado: “${record.outcome.slice(0, 180)}”.`
  );
  return {
    text: `\n\n**Experiência registrada neste projeto (referência, não fato sobre o pedido atual):** ${notes.join(" ")} Considere-a apenas como hipótese metodológica e descarte-a se não se aplicar ao que você pediu agora.`,
    experienceIds: relevant.map((record) => record.id),
  };
}
