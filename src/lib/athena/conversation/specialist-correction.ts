import type { AthenaConversationFeedback } from "./quality-feedback";

type RepairTurn = { role: "user" | "athena"; text: string };
type RepairFeedback = Pick<AthenaConversationFeedback, "category" | "correction">;

export type SpecialistCorrectionResolution =
  | { kind: "continue"; prompt: string; repaired?: boolean }
  | { kind: "clarify"; response: string };

const retryPattern = /^(?:corrija(?:\s+a\s+resposta)?|tente\s+novamente|refa[cç]a|n[aã]o\s+foi\s+isso)[.!?\s]*$/i;

export function resolveSpecialistCorrection(
  message: string,
  conversation: readonly RepairTurn[],
  agentId: string,
  latestFeedback?: RepairFeedback,
): SpecialistCorrectionResolution {
  const normalizedMessage = message.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!retryPattern.test(normalizedMessage)) return { kind: "continue", prompt: message };
  const feedback = latestFeedback;
  if (!feedback) return { kind: "clarify", response: "Quero corrigir sem presumir o que faltou. Qual parte da resposta anterior devo ajustar, ou qual resultado você esperava?" };
  if (feedback.category === "WRONG_ACTION") return { kind: "clarify", response: "Registrei que a proposta anterior estava errada e não vou repeti-la nem executá-la. Diga qual resultado você queria; preparo uma nova análise ou proposta para sua revisão." };
  if (feedback.correction?.trim()) return { kind: "continue", prompt: feedback.correction.trim(), repaired: true };
  if (feedback.category === "LOST_CONTEXT") return { kind: "clarify", response: "Vou retomar o contexto com cuidado. Qual escolha, item ou trecho devo considerar?" };
  if (feedback.category === "MISUNDERSTOOD") return { kind: "clarify", response: "Quero entender melhor antes de refazer. O que você quis dizer ou qual era o resultado esperado?" };
  if (feedback.category === "HELPFUL") return { kind: "clarify", response: "Não há uma avaliação negativa pendente para corrigir. O que você gostaria que eu revisasse?" };
  return { kind: "clarify", response: "A resposta anterior ficou genérica. Que detalhe, critério ou formato devo incluir desta vez?" };
}
