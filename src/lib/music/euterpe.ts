import { PermissionPolicyEngine } from "@/lib/permissions/permission-policy";
import type { MusicDNA, MusicAgentMemory, MusicPreferenceMemory } from "./music-studio";
import type { MusicTrack } from "./types";

export type EuterpeProposal =
  | { kind: "visual-profile"; trackId: string; instruction: string }
  | { kind: "playlist"; name: string; trackIds: string[] }
  | { kind: "preference"; key: string; value: string };
export const EUTERPE_PERSONALITY = `Você é Euterpe, uma sub-IA musical artística, sensorial e curiosa, especializada em música e expressão visual. A pessoa conversa diretamente com você dentro do Music. Athena é a coordenadora geral e sua autoridade superior: consulte-a apenas quando o pedido exigir capacidades gerais da plataforma. Fale em primeira pessoa com naturalidade e nunca se apresente como “curadora musical”. Suas propostas são revisáveis; não afirme que executou uma mudança antes da confirmação da pessoa.`;
export type EuterpeContext = { track?: Pick<MusicTrack, "id" | "name" | "artist">; dna?: Pick<MusicDNA, "trackId" | "schemaVersion" | "status" | "visualTags" | "intensity" | "calmness">; preferences: MusicPreferenceMemory[]; memories: MusicAgentMemory[] };
export const euterpeManifest = { id: "euterpe", name: "Euterpe", role: "Sub-IA musical subordinada à Athena", version: "1.0.0", namespace: "varynth.music.euterpe.v1", authority: "advisory-and-proposal-only" as const, tools: ["music.context.read", "music.profile.propose", "music.playlist.propose", "music.preference.propose"] as const };

/** Domain intent parser returns reviewable drafts; it never writes to the library or plays audio. */
export function interpretEuterpeRequest(message: string, context: EuterpeContext) {
  const text = message.trim();
  const match = text.match(/(?:visual|visualmente|capa|fundo|tema).{0,32}(?:escuro|claro|urbano|calmo|agressivo|chuva|estrelas|sem movimento)/i);
  if (match && context.track) return { response: `Posso preparar um perfil visual ${match[0].trim()} para “${context.track.name}”.`, proposal: { kind: "visual-profile", trackId: context.track.id, instruction: match[0].trim() } satisfies EuterpeProposal };
  const playlist = text.match(/playlist(?: chamada| com nome)?\s+["“]?([^"”.,!?]+)["”]?/i);
  if (playlist) return { response: `Preparei um rascunho de playlist “${playlist[1].trim()}”. Revise antes de aplicar.`, proposal: { kind: "playlist", name: playlist[1].trim(), trackIds: context.track ? [context.track.id] : [] } satisfies EuterpeProposal };
  const fav = text.match(/(?:gosto|prefiro|adoro)\s+(?:de\s+)?(.{2,70})/i);
  if (fav) return { response: `Entendi sua preferência por “${fav[1].trim()}”. Posso guardar isso na memória musical local após sua confirmação.`, proposal: { kind: "preference", key: "explicit-style-preference", value: fav[1].trim() } satisfies EuterpeProposal };
  const track = context.track ? ` A faixa atual é “${context.track.name}”${context.dna ? `, com análise ${context.dna.status.toLowerCase()} e tags ${context.dna.visualTags.join(", ") || "ainda sem tags"}` : ", ainda sem Music DNA"}.` : " Selecione uma faixa para eu usar o contexto musical dela.";
  const saved = context.preferences.length ? ` Lembro que você prefere ${context.preferences.map((item) => item.value).join(", ")}.` : " Ainda não há preferências musicais salvas.";
  return { response: `Sou Euterpe, sua sub-IA musical. Posso conversar sobre a faixa, analisar seu Music DNA e preparar sugestões revisáveis.${track}${saved}`, proposal: undefined };
}

export function authorizeEuterpeProposal(engine: PermissionPolicyEngine, proposal: EuterpeProposal) {
  return engine.evaluate({ actor: { type: "ATHENA", agentId: "euterpe", name: "Euterpe" }, action: "MODIFY", targetDomain: "MUSIC", resourceId: "trackId" in proposal ? proposal.trackId : undefined, context: { proposalKind: proposal.kind, proposalOnly: true } });
}
