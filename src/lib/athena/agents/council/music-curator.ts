import type { AgentKnowledgeConsultation, AthenaAgent, AgentManifest } from "../base-agent";
import type { AthenaTask } from "../../domain/task";
import type { AthenaContext } from "../../domain/context";
import type { AgentResult } from "../../domain/result";
import type { MusicAgentMemory, MusicDNA, MusicPreferenceMemory } from "@/lib/music/music-studio";
import { EUTERPE_PERSONALITY } from "@/lib/music/euterpe";
import { interpretEuterpeRequest, type EuterpeContext, type EuterpeConversationTurn } from "@/lib/music/euterpe";
import { renderAgentPersona } from "../base-agent";
import type { MusicTrack } from "@/lib/music/types";
import { relevantExperienceGuidance } from "../experience-guidance";

export type MusicAthenaConsult = (userRequest: string, recentConversation?: EuterpeConversationTurn[]) => Promise<{ text: string; metadata?: Record<string, unknown> }>;

export function musicAgentShouldConsultAthena(message: string, conversation: EuterpeConversationTurn[] = []): boolean {
  const text = message.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  if (!text) return false;
  const explicitlyDeclinesAthena = /\b(?:nao|sem)\s+(?:consulte|chame|pergunte|fale com|envolva)\s+(?:a\s+)?athena\b/.test(text);
  if (explicitlyDeclinesAthena) return false;
  if (/\b(?:athena|athenas|inteligencia principal)\b/.test(text)) return true;
  if (/^(oi|ola|bom dia|boa tarde|boa noite|tudo bem|quem e voce|o que voce faz)[!.?\s]*$/.test(text)) return false;

  const contextualFollowUp = /^(?:e\s+)?(?:por que|porque|como assim|explica(?: melhor)?|me explica|fala mais|me conta mais|continua|continue|pode desenvolver|e depois|faz isso|faca isso|pode fazer isso)[!.?\s]*$/.test(text);
  if (contextualFollowUp) {
    const previousCuratorTurn = [...conversation].reverse().find((turn) => turn.sender === "curator");
    if (previousCuratorTurn?.consultedAthena) return true;
  }

  const musicTerms = /\b(music|musica|musical|faixa|cancao|playlist|music dna|onda sonora|visualizador|capa|fundo|euterpe|album|artista|genero|instrumento|letra|audio|som)\b/;
  const musicOnlyRequest = /\b(capa|fundo|perfil visual|visualizador|playlist|music dna|faixa|musica|cancao|album|artista|genero|instrumento|letra|audio)\b/;
  const platformTargets = /\b(projeto|tarefa|arquivo|documento|agenda|email|e-mail|reuniao|compromisso|conta|modulo|aplicativo|site|codigo|codigo-fonte|pesquisa juridica|processo|prazo)\b/;
  const requestLead = /\b(quero|preciso|pode|poderia|da pra|me ajuda|me ajude|ajudar|gostaria|faz|faca|cria|crie|monta|monte|montar|prepare|organiza|organize|altera|altere|apaga|apague|pesquisa|pesquise|planeja|planeje|publica|publique|execute|executa|abra|abre|salva|salve)\b/;
  const requestsPlatformWork = requestLead.test(text) && platformTargets.test(text);
  if (requestsPlatformWork) return true;

  // A clearly non-music question belongs to Athena even when it contains no
  // operational verb (e.g. "o que significa ...?"). Music vocabulary alone
  // does not override a separately requested platform action above.
  const asksGeneralQuestion = /\b(o que|quem|quando|onde|como|por que|porque|qual|quais|quanto|quantos|explique|defina|significa|me conta)\b/.test(text);
  const clearlyNonMusicTopic = /\b(clima|tempo|gravidade|contrato|lei|legislacao|justica|tarefa|projeto|arquivo|documento|agenda|reuniao|prazo|codigo|programacao|conta|athena)\b/.test(text);
  if (asksGeneralQuestion && clearlyNonMusicTopic) return true;
  const conversationalMusicFollowUp = /\b(o que voce acha|o que achou|e essa|e esse|e ela|e ele|por que|porque|como assim|me conta mais|fala mais|continua|continue|qual a vibe|que sensacao|o que percebeu|tudo bem|como voce esta)\b/.test(text);
  if (asksGeneralQuestion && !musicTerms.test(text) && !conversationalMusicFollowUp) return true;

  if (musicOnlyRequest.test(text)) return false;
  if (musicTerms.test(text)) return false;
  return clearlyNonMusicTopic;
}

function providedTrack(task: AthenaTask): MusicTrack | undefined {
  const value = task.metadata?.musicTrack;
  if (!value || typeof value !== "object") return undefined;
  const track = value as Partial<MusicTrack>;
  return typeof track.id === "string" && typeof track.name === "string"
    ? { id: track.id, name: track.name, artist: typeof track.artist === "string" ? track.artist : "Artista desconhecido", durationMs: Number(track.durationMs) || 0, mimeType: "", sizeBytes: 0, addedAt: "" }
    : undefined;
}

export class EuterpeAgent implements AthenaAgent {
  get personalityPrompt(): string { return `${EUTERPE_PERSONALITY} ${renderAgentPersona(this.manifest)}`; }
  manifest: AgentManifest = {
    id: "euterpe",
    name: "Euterpe",
    role: "Sub-IA musical Euterpe, subordinada à Athena",
    version: "1.0.0",
    description: "Sub-IA musical subordinada à Athena. Interlocutora do módulo Music; conversa, analisa contexto fornecido e prepara propostas revisáveis. Sem acesso direto a arquivos ou execução de ferramentas.",
    skills: ["music", "music-dna", "curadoria-musical", "playlists"],
    priority: 70,
    enabled: true,
    persona: { identity: "Sou Euterpe, presença musical própria e consultiva, subordinada à coordenação geral de Athena.", home: "Music, faixa atual, Music DNA, preferências e propostas visuais ou de playlist", voice: "artística, sensorial, curiosa e naturalmente próxima", approach: "uso a faixa, o DNA e as memórias musicais fornecidas; separo dado acústico de leitura estética", evidenceBoundary: "não invento análise de áudio nem acesso à biblioteca além do contexto entregue", authorityBoundary: "não acesso arquivos nem executo ações sem proposta revisável e confirmação" },
  };

  canHandle(task: AthenaTask): boolean {
    return /\b(music|música|musical|playlist|faixa|canção|álbum|artista|gênero)\b/i.test(task.rawPrompt);
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const track = providedTrack(task);
    const candidateDNA = task.metadata?.musicDNA;
    const dna = candidateDNA && typeof candidateDNA === "object" && [1, 2].includes(Number((candidateDNA as { schemaVersion?: unknown }).schemaVersion)) && (candidateDNA as MusicDNA).trackId === track?.id
      ? candidateDNA as MusicDNA
      : undefined;
    const candidatePreferences = task.metadata?.musicPreferences;
    const candidateMemories = task.metadata?.musicMemories;
    const candidateConversation = task.metadata?.musicConversation;
    const conversation: EuterpeConversationTurn[] = Array.isArray(candidateConversation)
      ? candidateConversation.slice(-12).flatMap((turn): EuterpeConversationTurn[] =>
        turn && typeof turn === "object"
          && ((turn as { sender?: unknown }).sender === "user" || (turn as { sender?: unknown }).sender === "curator")
          && typeof (turn as { text?: unknown }).text === "string"
          ? [{ sender: (turn as { sender: "user" | "curator" }).sender, text: (turn as { text: string }).text.slice(0, 2000) }]
          : [])
      : [];
    const musicContext: EuterpeContext = {
      track,
      dna: dna ? { trackId: dna.trackId, schemaVersion: dna.schemaVersion, status: dna.status, visualTags: dna.visualTags, intensity: dna.intensity, calmness: dna.calmness } : undefined,
      preferences: Array.isArray(candidatePreferences) ? candidatePreferences as MusicPreferenceMemory[] : [],
      memories: Array.isArray(candidateMemories) ? candidateMemories as MusicAgentMemory[] : [],
    };
    const interpretation = interpretEuterpeRequest(task.rawPrompt, musicContext, conversation);
    const priorOutcomes = relevantExperienceGuidance(context, this.manifest.id);
    const userDeclinedPreferenceRetention = /não vou propor guardar|não vou propor salvar/i.test(interpretation.response);
    const content = !interpretation.proposal && !userDeclinedPreferenceRetention && priorOutcomes.length
      ? `${interpretation.response}\n\n**Uma abordagem musical que pode valer testar:** ${priorOutcomes[0]}`
      : interpretation.response;
    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: interpretation.proposal ? 0.55 : dna ? 0.65 : track ? 0.5 : 0.35,
      sources: [...(track ? [`Faixa selecionada fornecida na tarefa: ${track.name} — ${track.artist}`] : []), ...(dna ? ["Music DNA fornecido na tarefa; estimativas derivadas de amostras de reprodução"] : []), ...(musicContext.preferences.length || musicContext.memories.length ? ["Preferências e memórias musicais fornecidas na tarefa"] : [])],
      recommendations: interpretation.proposal ? ["Revise a proposta e confirme antes de aplicar qualquer alteração."] : ["A decisão final e qualquer ação sobre a biblioteca pertencem à pessoa usuária."],
      metadata: { authority: "advisory-only", capabilities: ["CONSULT_ATHENA", "READ_PROVIDED_METADATA"], toolAccess: false, localFileAccess: false, ...(interpretation.proposal ? { proposal: interpretation.proposal } : {}), musicDNAUsed: Boolean(dna), proposalOnly: true, priorOutcomeHints: priorOutcomes.length, conversationTurnsUsed: conversation.length },
    };
  }

  async consultKnowledge(request: AgentKnowledgeConsultation): Promise<AgentResult> {
    const sources = request.sources.slice(0, 8);
    const content = sources.length
      ? `Euterpe consultou o pacote autorizado do domínio **${request.domain}** para responder a “${request.query}”. O material disponível traz estes dados, sem acrescentar fatos que não constem nas fontes:\n\n${sources.map((source) => `**${source.title}** (${source.id}${source.truncated ? "; trecho truncado" : ""})\n${source.content}`).join("\n\n")}\n\nEste retorno é uma leitura das fontes fornecidas; ${request.truncated ? "o pacote ou alguns trechos foram truncados; " : ""}não houve análise de áudio, acesso a arquivos locais nem verificação externa.`
      : "Não recebi fontes autorizadas para esta consulta musical; não vou inferir conteúdo ausente.";
    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: sources.length > 0,
      content,
      confidence: sources.length ? 0.55 : 0,
      sources: sources.map((source) => source.id),
      limitations: ["Somente fatos do KnowledgePacket autorizado foram considerados.", ...(request.truncated ? ["O pacote ou alguns trechos foram truncados por limite de contexto."] : []), "A implementação atual faz leitura de fontes, não análise neural ou inspeção de áudio."],
      metadata: { authority: "source-grounded", knowledgeConsultation: true, provider: this.manifest.id, purpose: request.purpose, toolAccess: false, localFileAccess: false },
    };
  }

  /** Only outbound capability: request cognition from Athena and relay it in the Curator's conversation. */
  async converse(task: AthenaTask, context: AthenaContext, consultAthena: MusicAthenaConsult): Promise<AgentResult> {
    const candidateConversation = task.metadata?.musicConversation;
    const conversation: EuterpeConversationTurn[] = Array.isArray(candidateConversation)
      ? candidateConversation.slice(-12).flatMap((turn): EuterpeConversationTurn[] =>
        turn && typeof turn === "object"
          && ((turn as { sender?: unknown }).sender === "user" || (turn as { sender?: unknown }).sender === "curator")
          && typeof (turn as { text?: unknown }).text === "string"
          ? [{
            sender: (turn as { sender: "user" | "curator" }).sender,
            text: (turn as { text: string }).text.slice(0, 2000),
            ...((turn as { consultedAthena?: unknown }).consultedAthena === true ? { consultedAthena: true } : {}),
          }]
          : [])
      : [];
    if (!musicAgentShouldConsultAthena(task.rawPrompt, conversation)) return this.execute(task, context);
    const precedingTurns = conversation.at(-1)?.sender === "user" && conversation.at(-1)?.text.trim() === task.rawPrompt.trim()
      ? conversation.slice(0, -1)
      : conversation;
    const response = await consultAthena(task.rawPrompt, precedingTurns.slice(-8));
    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content: `Consultei Athena sobre o seu pedido e trouxe o retorno para nossa conversa:\n\n${response.text}`,
      confidence: 0.7,
      metadata: { authority: "advisory-only", capabilities: ["CONSULT_ATHENA"], toolAccess: false, localFileAccess: false, consultedAthena: true, athenaMetadata: response.metadata },
    };
  }
}

export const euterpeAgent = new EuterpeAgent();
export { EuterpeAgent as MusicCuratorAgent };
/** Backward-compatible export for callers that used the prior implementation name. */
export const musicCuratorAgent = euterpeAgent;
