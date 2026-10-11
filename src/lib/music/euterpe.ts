import { PermissionPolicyEngine } from "@/lib/permissions/permission-policy";
import type { MusicDNA, MusicAgentMemory, MusicPreferenceMemory } from "./music-studio";
import type { MusicTrack } from "./types";

export type EuterpeProposal =
  | { kind: "visual-profile"; trackId: string; instruction: string }
  | { kind: "playlist"; name: string; trackIds: string[] }
  | { kind: "preference"; key: string; value: string };
export const EUTERPE_PERSONALITY = `Você é Euterpe, uma sub-IA musical artística, sensorial e curiosa, especializada em música e expressão visual. A pessoa conversa diretamente com você dentro do Music. Athena é a coordenadora geral e sua autoridade superior: consulte-a apenas quando o pedido exigir capacidades gerais da plataforma. Fale em primeira pessoa com naturalidade e nunca se apresente como “curadora musical”. Suas propostas são revisáveis; não afirme que executou uma mudança antes da confirmação da pessoa.`;
export type EuterpeContext = { track?: Pick<MusicTrack, "id" | "name" | "artist">; dna?: Pick<MusicDNA, "trackId" | "schemaVersion" | "status" | "visualTags" | "intensity" | "calmness">; preferences: MusicPreferenceMemory[]; memories: MusicAgentMemory[] };
export type EuterpeConversationTurn = { sender: "user" | "curator"; text: string };
export const euterpeManifest = { id: "euterpe", name: "Euterpe", role: "Sub-IA musical subordinada à Athena", version: "1.0.0", namespace: "varynth.music.euterpe.v1", authority: "advisory-and-proposal-only" as const, tools: ["music.context.read", "music.profile.propose", "music.playlist.propose", "music.preference.propose"] as const };

/** Domain intent parser returns reviewable drafts; it never writes to the library or plays audio. */
export function interpretEuterpeRequest(message: string, context: EuterpeContext, conversation: EuterpeConversationTurn[] = []) {
  const text = message.trim();
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const formal = /\b(senhor|senhora|gostaria|poderia|por gentileza|formalmente)\b/.test(normalized);
  const match = text.match(/(?:visual(?:mente)?|capa|fundo|tema|apar[eê]ncia|atmosfera|clima).{0,48}(?:escuro|claro|urbano|calmo|agressivo|chuva|estrelas|sem movimento|noturno|minimalista|quente|frio|cinematogr[aá]fico|suave|dram[aá]tico)/i)
    ?? text.match(/(?:deixe|deixa|quero|fa[cç]a|fazer|coloque|coloca).{0,32}(?:escuro|claro|urbano|calmo|agressivo|chuva|estrelas|noturno|minimalista|quente|frio|cinematogr[aá]fico|suave|dram[aá]tico|est[aá]tico)/i);
  if (match && context.track) return { response: `Posso preparar um perfil visual ${match[0].trim()} para “${context.track.name}”.`, proposal: { kind: "visual-profile", trackId: context.track.id, instruction: match[0].trim() } satisfies EuterpeProposal };
  const playlist = text.match(/playlist(?: chamada| com nome)?\s+["“]?([^"”.,!?]+)["”]?/i);
  if (playlist) return { response: `Preparei um rascunho de playlist “${playlist[1].trim()}”. Revise antes de aplicar.`, proposal: { kind: "playlist", name: playlist[1].trim(), trackIds: context.track ? [context.track.id] : [] } satisfies EuterpeProposal };
  const fav = text.match(/(?:gosto|prefiro|adoro|curto|me interessa|tenho apre[cç]o por)\s+(?:muito\s+)?(?:de\s+)?(.{2,70})/i);
  if (fav) return { response: `Entendi sua preferência por “${fav[1].trim()}”. Posso guardar isso na memória musical local após sua confirmação.`, proposal: { kind: "preference", key: "explicit-style-preference", value: fav[1].trim() } satisfies EuterpeProposal };
  const followup = conversation.slice(-6).reverse().find((turn) => turn.sender === "user")?.text;
  const conversational = /\b(por que|por quê|como assim|me explica|explique melhor|qual delas|o que acha|e essa|e esse|fala mais|continua)\b/i.test(normalized);
  const requested = conversation.slice(-6).reverse().find((turn) => turn.sender === "curator")?.text;
  if (conversational && requested) return { response: `Entendi que você está retomando o que eu disse sobre “${followup ?? "a faixa"}”. ${requested} Posso aprofundar uma parte específica, se quiser.`, proposal: undefined };
  if (/\b(analise|analisa|descreva|descreve|o que sente|que sensacao|que sensação|qual a vibe|qual o clima)\b/i.test(normalized) && context.track) {
    const evidence = context.dna?.visualTags.length ? `O Music DNA disponível marca ${context.dna.visualTags.join(", ")}; essa leitura vem dessas tags, não de uma análise subjetiva do áudio.` : "Ainda não há Music DNA suficiente para descrever características sonoras verificadas; se você me disser o que percebe, construo a leitura junto com você.";
    return { response: `${formal ? "A faixa" : "Essa faixa"} “${context.track.name}”, de ${context.track.artist}, está selecionada. ${evidence}`, proposal: undefined };
  }
  const track = context.track ? ` A faixa atual é “${context.track.name}”${context.dna ? `, com análise ${context.dna.status.toLowerCase()} e tags ${context.dna.visualTags.join(", ") || "ainda sem tags"}` : ", ainda sem Music DNA"}.` : " Selecione uma faixa para eu usar o contexto musical dela.";
  const saved = context.preferences.length || context.memories.length ? ` Nas suas memórias musicais locais constam ${[...context.preferences.map((item) => item.value), ...context.memories.map((item) => item.value)].slice(0, 5).join(", ")}.` : " Ainda não há preferências musicais salvas.";
  const style = formal ? "Sou Euterpe. Posso ajudá-lo a explorar essa faixa, interpretar o Music DNA disponível ou preparar uma proposta para sua revisão." : "Sou Euterpe. Posso explorar essa faixa com você, interpretar o Music DNA disponível ou preparar uma proposta para você revisar.";
  return { response: `${style}${track}${saved}`, proposal: undefined };
}

export function authorizeEuterpeProposal(engine: PermissionPolicyEngine, proposal: EuterpeProposal) {
  return engine.evaluate({ actor: { type: "ATHENA", agentId: "euterpe", name: "Euterpe" }, action: "MODIFY", targetDomain: "MUSIC", resourceId: "trackId" in proposal ? proposal.trackId : undefined, context: { proposalKind: proposal.kind, proposalOnly: true } });
}
