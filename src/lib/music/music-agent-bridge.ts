import { euterpeAgent, musicAgentShouldConsultAthena, type MusicAthenaConsult } from "@/lib/athena/agents/council/music-curator";
import type { AthenaContext } from "@/lib/athena/domain/context";
import type { AthenaTask } from "@/lib/athena/domain/task";
import type { MusicDNA } from "./music-studio";
import type { MusicTrack } from "./types";
import type { EuterpeContext, EuterpeConversationTurn, EuterpeProposal } from "./euterpe";

export { musicAgentShouldConsultAthena };
export interface MusicAgentTurnResult { agent: "euterpe"; text: string; consultedAthena: boolean; athenaMetadata?: Record<string, unknown>; proposal?: EuterpeProposal }

export type EuterpeCorrectionFeedback = {
  category: "HELPFUL" | "MISUNDERSTOOD" | "GENERIC_RESPONSE" | "LOST_CONTEXT" | "WRONG_ACTION";
  correction?: string;
};

export type EuterpeCorrectionResolution =
  | { kind: "continue"; prompt: string }
  | { kind: "clarify"; response: string };

const correctionRequestPattern = /^(corrija a resposta|corrija|tente novamente|nao foi isso)[.!?]*$/i;

/** Resolve an explicit repair request only from Euterpe's own saved feedback. */
export function resolveEuterpeCorrectionRequest(message: string, feedback?: EuterpeCorrectionFeedback): EuterpeCorrectionResolution {
  const normalized = message.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!correctionRequestPattern.test(normalized)) return { kind: "continue", prompt: message };
  if (!feedback) return { kind: "clarify", response: "Posso corrigir, mas não encontrei uma avaliação recente desta conversa. Qual resposta ou trecho você quer ajustar?" };
  if (feedback.category === "HELPFUL") return { kind: "clarify", response: "Não há uma correção negativa pendente desta conversa. Qual resposta ou parte você gostaria que eu revisasse?" };
  if (feedback.category === "WRONG_ACTION") return { kind: "clarify", response: "Registrei que a ação proposta estava errada e não vou repeti-la automaticamente. Diga qual resultado você queria; vou preparar uma nova proposta para sua revisão." };
  if (feedback.correction?.trim()) return { kind: "continue", prompt: feedback.correction.trim() };
  if (feedback.category === "LOST_CONTEXT") return { kind: "clarify", response: "Vou retomar o contexto sem presumir qual parte faltou. Qual faixa, escolha ou trecho da conversa devo considerar?" };
  if (feedback.category === "MISUNDERSTOOD") return { kind: "clarify", response: "Quero entender corretamente desta vez. O que você quis dizer ou qual era o resultado esperado?" };
  return { kind: "clarify", response: "A resposta anterior ficou genérica. Que detalhe, estilo ou critério devo incluir para torná-la útil?" };
}

export async function runMusicAgentTurn(input: {
  message: string;
  track?: MusicTrack | null;
  dna?: MusicDNA;
  preferences?: EuterpeContext["preferences"];
  memories?: EuterpeContext["memories"];
  conversation?: EuterpeConversationTurn[];
  consultAthena: MusicAthenaConsult;
  context?: AthenaContext;
}): Promise<MusicAgentTurnResult> {
  const { message, track, dna } = input;
  const task = {
    id: `euterpe-chat-${Date.now()}`, title: "Conversa com Euterpe", rawPrompt: message,
    type: "GENERAL_DELIBERATION", priority: "media", status: "RUNNING", scope: "music", entities: {},
    metadata: {
      musicTrack: track ? { id: track.id, name: track.name, artist: track.artist } : undefined,
      musicDNA: dna,
      musicPreferences: input.preferences,
      musicMemories: input.memories,
      musicConversation: input.conversation?.slice(-12),
    },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  } as AthenaTask;
  const result = await euterpeAgent.converse(task, input.context ?? {} as AthenaContext, input.consultAthena);
  const metadata = result.metadata ?? {};
  return {
    agent: "euterpe", text: result.content,
    consultedAthena: metadata.consultedAthena === true,
    athenaMetadata: metadata.athenaMetadata && typeof metadata.athenaMetadata === "object" ? metadata.athenaMetadata as Record<string, unknown> : undefined,
    proposal: metadata.proposal && typeof metadata.proposal === "object" ? metadata.proposal as EuterpeProposal : undefined,
  };
}
