import type { AthenaAgent, AgentManifest } from "../base-agent";
import type { AthenaTask } from "../../domain/task";
import type { AthenaContext } from "../../domain/context";
import type { AgentResult } from "../../domain/result";
import { musicSpecialist, type MusicDNA } from "@/lib/music/music-studio";
import { EUTERPE_PERSONALITY } from "@/lib/music/euterpe";
import { renderAgentPersona } from "../base-agent";
import type { MusicTrack } from "@/lib/music/types";

export type MusicAthenaConsult = (userRequest: string) => Promise<{ text: string; metadata?: Record<string, unknown> }>;

export function musicAgentShouldConsultAthena(message: string): boolean {
  const text = message.trim().toLocaleLowerCase("pt-BR");
  if (/\b(athena|athenas|inteligência principal|inteligencia principal)\b/.test(text)) return true;
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|tudo bem|quem é você|quem e voce|o que você faz|o que voce faz)[!.?\s]*$/i.test(text)) return false;
  const musicDomain = /\b(music|música|musica|musical|faixa|canção|cancao|playlist|music dna|onda sonora|visualizador|capa|fundo|euterpe|álbum|album|artista|gênero|genero)\b/.test(text);
  if (musicDomain) return false;
  return /\b(crie|criar|execute|executar|publique|publicar|abra|abrir|pesquise|pesquisar|organize|organizar|altere|alterar|apague|apagar|integre|integrar|planeje|planejar|consulte|pergunte)\b/.test(text);
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

  async execute(task: AthenaTask, _context: AthenaContext): Promise<AgentResult> {
    const track = providedTrack(task);
    const candidateDNA = task.metadata?.musicDNA;
    const dna = candidateDNA && typeof candidateDNA === "object" && [1, 2].includes(Number((candidateDNA as { schemaVersion?: unknown }).schemaVersion)) && (candidateDNA as MusicDNA).trackId === track?.id
      ? candidateDNA as MusicDNA
      : undefined;
    const normalized = task.rawPrompt.trim().toLowerCase();
    const greeting = /^(oi|olá|ola|bom dia|boa tarde|boa noite|tudo bem|quem é você|quem e voce)[!.?\s]*$/i.test(normalized);
    const content = greeting
      ? "Oi! Eu sou Euterpe, sua sub-IA musical, subordinada à Athena. Aqui no Music eu converso diretamente com você; quando o pedido precisar de capacidades gerais da plataforma, consulto Athena e retorno nesta conversa."
      : track ? musicSpecialist.suggest(track, dna) : "Sou Euterpe e posso conversar sobre música, faixas e Music DNA com o contexto fornecido pelo módulo. Para recursos gerais da plataforma, consulto Athena. Não acesso a arquivos nem executo alterações por conta própria.";
    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: dna ? 0.7 : 0.45,
      sources: [dna ? "Music DNA fornecido na tarefa" : "Prompt e metadados fornecidos na tarefa"],
      recommendations: ["A decisão final e qualquer ação sobre a biblioteca pertencem à pessoa usuária."],
      metadata: { authority: "advisory-only", capabilities: ["CONSULT_ATHENA", ...musicSpecialist.capabilities], toolAccess: false, localFileAccess: false },
    };
  }

  /** Only outbound capability: request cognition from Athena and relay it in the Curator's conversation. */
  async converse(task: AthenaTask, context: AthenaContext, consultAthena: MusicAthenaConsult): Promise<AgentResult> {
    if (!musicAgentShouldConsultAthena(task.rawPrompt)) return this.execute(task, context);
    const response = await consultAthena(task.rawPrompt);
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
