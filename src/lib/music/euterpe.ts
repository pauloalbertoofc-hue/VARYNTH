import { PermissionPolicyEngine } from "@/lib/permissions/permission-policy";
import type { MusicDNA, MusicAgentMemory, MusicPreferenceMemory } from "./music-studio";
import type { MusicTrack } from "./types";
import type { ExperienceContext } from "@/lib/experience/context-builder";
import { confirmedAgentGuidance } from "@/lib/athena/agents/experience-guidance";

export type EuterpeProposal =
  | { kind: "visual-profile"; trackId: string; instruction: string }
  | { kind: "playlist"; name: string; trackIds: string[] }
  | { kind: "preference"; key: string; value: string };
export const EUTERPE_PERSONALITY = `Você é Euterpe, uma sub-IA musical artística, sensorial e curiosa, especializada em música e expressão visual. A pessoa conversa diretamente com você dentro do Music. Athena é a coordenadora geral e sua autoridade superior: consulte-a apenas quando o pedido exigir capacidades gerais da plataforma. Fale em primeira pessoa com naturalidade e nunca se apresente como “curadora musical”. Suas propostas são revisáveis; não afirme que executou uma mudança antes da confirmação da pessoa.`;
export type EuterpeContext = { track?: Pick<MusicTrack, "id" | "name" | "artist">; dna?: Pick<MusicDNA, "trackId" | "schemaVersion" | "status" | "visualTags" | "intensity" | "calmness">; preferences: MusicPreferenceMemory[]; memories: MusicAgentMemory[]; experienceContext?: ExperienceContext };
export type EuterpeConversationTurn = { sender: "user" | "curator"; text: string; consultedAthena?: boolean };
export const euterpeManifest = { id: "euterpe", name: "Euterpe", role: "Sub-IA musical subordinada à Athena", version: "1.0.0", namespace: "varynth.music.euterpe.v1", authority: "advisory-and-proposal-only" as const, tools: ["music.context.read", "music.profile.propose", "music.playlist.propose", "music.preference.propose"] as const };

function resolveEuterpeFollowUp(message: string, context: EuterpeContext, conversation: EuterpeConversationTurn[]): string | undefined {
  const normalized = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const shortTurn = normalized.split(/\s+/).length <= 10;
  const isWhy = shortTurn && /^(?:(?:mas|e)\s+)?(?:por que|porque|qual o motivo|qual a razao)\b/.test(normalized);
  const isExplain = shortTurn && /\b(como assim|(?:me )?explica(?:r)?(?: melhor)?|poderia explicar|explique melhor|o que quis dizer|qual delas|me conta mais)\b/.test(normalized);
  const isContinue = shortTurn && /\b(continua|continue|fala mais|me fala mais|aprofunda|detalha mais|pode desenvolver|desenvolva mais)\b/.test(normalized);
  if (!isWhy && !isExplain && !isContinue) return undefined;

  const currentUserIndex = conversation.map((turn) => turn.sender).lastIndexOf("user");
  if (currentUserIndex < 0) return "Posso continuar, mas não encontrei a mensagem anterior a que você está se referindo. Pode apontar o trecho?";
  const previousAssistant = conversation.slice(0, currentUserIndex).reverse().find((turn) => turn.sender === "curator")?.text;
  const previousUser = conversation.slice(0, currentUserIndex).reverse().find((turn) => turn.sender === "user")?.text;
  if (!previousAssistant) return "Não tenho uma resposta anterior nesta conversa para explicar. Diga qual faixa ou aspecto musical quer explorar.";

  if (isWhy) {
    if (previousUser && context.track && /\b(visual|capa|fundo|tema|aparencia|atmosfera|clima|escuro|claro|urbano|calmo|chuva|estrelas)\b/i.test(previousUser)) {
      return `A proposta anterior veio do seu pedido “${previousUser.trim().slice(0, 180)}”. Eu o converti em uma opção visual revisável; isso não significa que eu tenha concluído que o áudio da faixa “${context.track.name}” tenha essas características.`;
    }
    if (context.dna?.visualTags.length && previousAssistant.includes("Music DNA")) {
      return `A leitura anterior se apoiou nas tags registradas no Music DNA: ${context.dna.visualTags.join(", ")}. Elas são metadados disponíveis, não uma nova análise que eu tenha feito agora.`;
    }
    return "Não registrei uma justificativa específica além do que foi dito na resposta anterior, então não vou inventar uma razão. Se você indicar a frase ou decisão, explico o que veio do contexto e o que seria apenas interpretação.";
  }

  if (isExplain) {
    if (context.dna?.visualTags.length && previousAssistant.includes("Music DNA")) {
      return `Quando mencionei o Music DNA, referia-me às tags já disponíveis para “${context.track?.name ?? context.dna.trackId}”: ${context.dna.visualTags.join(", ")}. Isso não descreve aspectos que não estejam nessas tags.`;
    }
    return "Posso explicar, mas a resposta anterior não identifica com precisão qual parte ficou ambígua. Aponte a frase ou escolha a opção que quer esclarecer, e eu a destrincho sem acrescentar fatos.";
  }

  if (context.dna) {
    const tags = context.dna.visualTags.length ? context.dna.visualTags.join(", ") : "sem tags visuais registradas";
    const measurements = [`intensidade ${context.dna.intensity}`, `calmaria ${context.dna.calmness}`].join(" e ");
    return `Posso ampliar o que há nos dados de “${context.track?.name ?? context.dna.trackId}”: o Music DNA está ${context.dna.status.toLowerCase()}, registra ${tags}, ${measurements}. Isso é o limite da evidência disponível; não estou inferindo letra, gênero ou instrumento.`;
  }
  return `Posso continuar a partir do contexto disponível: ${context.track ? `a faixa selecionada é “${context.track.name}”, de ${context.track.artist},` : "não há uma faixa selecionada,"} mas não recebi Music DNA para descrever o áudio. Se quiser, diga qual aspecto você percebeu e desenvolvo a leitura junto com você.`;
}

function describeSelectedTrack(context: EuterpeContext, formal: boolean): string {
  if (!context.track) return formal
    ? "Não há uma faixa selecionada nesta conversa. Selecione uma faixa ou diga o título para eu saber a que você se refere."
    : "Ainda não tenho uma faixa selecionada para saber a que você se refere. Escolha uma ou me diga o nome?";

  const opening = formal ? "A faixa selecionada é" : "A que está selecionada é";
  if (!context.dna || context.dna.trackId !== context.track.id) {
    return `${opening} “${context.track.name}”, de ${context.track.artist}. Ainda não recebi Music DNA correspondente a essa faixa, então não vou fingir que ouvi ou inferir gênero, instrumentos ou clima. O que você percebeu nela? Posso desenvolver a leitura a partir disso.`;
  }

  const tags = context.dna.visualTags.length ? context.dna.visualTags.join(", ") : "sem tags visuais registradas";
  const intensity = Math.round(context.dna.intensity * 100);
  const calmness = Math.round(context.dna.calmness * 100);
  return `${opening} “${context.track.name}”, de ${context.track.artist}. No Music DNA ${context.dna.status === "COMPLETE" ? "marcado como completo" : "ainda parcial"}, há as tags “${tags}” e estimativas de intensidade (${intensity}%) e calmaria (${calmness}%). São medidas do áudio amostrado durante a reprodução — não identificam, por si sós, gênero, instrumentos, letra ou qualidade artística. O que chamou sua atenção nela?`;
}

/** Domain intent parser returns reviewable drafts; it never writes to the library or plays audio. */
export function interpretEuterpeRequest(message: string, context: EuterpeContext, conversation: EuterpeConversationTurn[] = []) {
  const text = message.trim();
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const explicitInformal = /\b(informal|casual|descontraid[oa])\b/.test(normalized);
  const explicitFormal = /\b(senhor|senhora|gostaria|poderia|por gentileza|formal(?:mente)?)\b/.test(normalized) && !/\b(?:nao|não)\s+(?:quero|precisa|precise|seja|ser)\s+(?:ser\s+)?formal\b/.test(normalized);
  const savedFormality = confirmedAgentGuidance({ experienceContext: context.experienceContext }, "euterpe", "formality", text);
  const formal = explicitFormal || (!explicitInformal && savedFormality === "formal");
  const followUpResponse = resolveEuterpeFollowUp(text, context, conversation);
  if (followUpResponse) return { response: followUpResponse, proposal: undefined };
  const match = text.match(/(?:visual(?:mente)?|capa|fundo|tema|apar[eê]ncia|atmosfera|clima).{0,48}(?:escur[oa]|clar[oa]|urban[oa]|calm[oa]|agressiv[oa]|chuva|estrelas|sem movimento|noturn[oa]|minimalista|quente|fri[oa]|cinematogr[aá]fic[oa]|suave|dram[aá]tic[oa])/i)
    ?? text.match(/(?:deixe|deixa|quero|fa[cç]a|fazer|coloque|coloca).{0,32}(?:escuro|claro|urbano|calmo|agressivo|chuva|estrelas|noturno|minimalista|quente|frio|cinematogr[aá]fico|suave|dram[aá]tico|est[aá]tico)/i);
  if (match && context.track) return { response: `Posso preparar um perfil visual ${match[0].trim()} para “${context.track.name}”.`, proposal: { kind: "visual-profile", trackId: context.track.id, instruction: match[0].trim() } satisfies EuterpeProposal };
  const playlist = text.match(/playlist(?: chamada| com nome)?\s+["“]?([^"”.,!?]+)["”]?/i);
  if (playlist) return { response: `Preparei um rascunho de playlist “${playlist[1].trim()}”. Revise antes de aplicar.`, proposal: { kind: "playlist", name: playlist[1].trim(), trackIds: context.track ? [context.track.id] : [] } satisfies EuterpeProposal };
  const negatedPreference = /\b(?:nao|nunca|jamais)\s+(?:gosto|prefiro|adoro|curto|me interessa)\b|\bnao\s+guarde\b|\bnao\s+salve\b/.test(normalized);
  if (negatedPreference && /\b(?:gosto|prefiro|adoro|curto|me interessa)\b/.test(normalized)) return { response: "Entendi que isso não é uma preferência sua; não vou propor guardar essa informação como gosto musical.", proposal: undefined };
  if (/\bnao\s+(?:guarde|salve)\b/.test(normalized)) return { response: "Entendido. Não vou propor guardar isso na memória musical.", proposal: undefined };
  if (/\b(estilo|gosto|preferencia|preferência|combina comigo|meu gosto)\b/.test(normalized)) {
    const savedValues = [...new Set([...context.preferences.map((item) => item.value), ...context.memories.map((item) => item.value)].map((value) => value.trim()).filter(Boolean))].slice(0, 5);
    if (savedValues.length) return { response: `Pelo que está salvo na sua memória musical local, aparecem ${savedValues.join(", ")}. Posso usar isso como pista para conversar — não como certeza sobre tudo de que você gosta. Alguma dessas referências você quer priorizar agora?`, proposal: undefined };
    if (/combina comigo|meu gosto/.test(normalized)) return { response: "Ainda não tenho preferências musicais salvas para personalizar essa sugestão. Você pode me dizer dois ou três artistas, estilos ou faixas de que gosta; vou tratá-los como referências suas, não como uma regra fixa.", proposal: undefined };
  }
  const fav = text.match(/(?:gosto|prefiro|adoro|curto|me interessa|tenho apre[cç]o por)\s+(?:muito\s+)?(?:de\s+)?(.{2,70})/i);
  if (fav) return { response: `Entendi sua preferência por “${fav[1].trim()}”. Posso guardar isso na memória musical local após sua confirmação.`, proposal: { kind: "preference", key: "explicit-style-preference", value: fav[1].trim() } satisfies EuterpeProposal };
  const asksCurrentTrack = /\b(o que acha|o que voce acha|e essa|e esse|e ela|e essa faixa|e essa musica|o que sente|que sensacao|qual a vibe|qual o clima|combina comigo|o que percebeu)\b/.test(normalized);
  const asksForListening = /\b(analise|analisa|descreva|descreve|o que sente|que sensacao|qual a vibe|qual o clima|o que percebeu)\b/.test(normalized);
  if (asksCurrentTrack || asksForListening) {
    return { response: describeSelectedTrack(context, formal), proposal: undefined };
  }
  const track = context.track ? ` A faixa atual é “${context.track.name}”${context.dna ? `, com análise ${context.dna.status.toLowerCase()} e tags ${context.dna.visualTags.join(", ") || "ainda sem tags"}` : ", ainda sem Music DNA"}.` : " Selecione uma faixa para eu usar o contexto musical dela.";
  const saved = context.preferences.length || context.memories.length ? ` Nas suas memórias musicais locais constam ${[...context.preferences.map((item) => item.value), ...context.memories.map((item) => item.value)].slice(0, 5).join(", ")}.` : " Ainda não há preferências musicais salvas.";
  const style = formal ? "Sou Euterpe. Posso ajudá-lo a explorar essa faixa, interpretar o Music DNA disponível ou preparar uma proposta para sua revisão." : "Sou Euterpe. Posso explorar essa faixa com você, interpretar o Music DNA disponível ou preparar uma proposta para você revisar.";
  return { response: `${style}${track}${saved}`, proposal: undefined };
}

export function authorizeEuterpeProposal(engine: PermissionPolicyEngine, proposal: EuterpeProposal) {
  return engine.evaluate({ actor: { type: "ATHENA", agentId: "euterpe", name: "Euterpe" }, action: "MODIFY", targetDomain: "MUSIC", resourceId: "trackId" in proposal ? proposal.trackId : undefined, context: { proposalKind: proposal.kind, proposalOnly: true } });
}
