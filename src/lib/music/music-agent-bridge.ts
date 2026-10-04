import { euterpeAgent, musicAgentShouldConsultAthena, type MusicAthenaConsult } from "@/lib/athena/agents/council/music-curator";
import type { AthenaContext } from "@/lib/athena/domain/context";
import type { AthenaTask } from "@/lib/athena/domain/task";
import type { MusicDNA } from "./music-studio";
import type { MusicTrack } from "./types";
import type { EuterpeContext, EuterpeConversationTurn, EuterpeProposal } from "./euterpe";

export { musicAgentShouldConsultAthena };
export interface MusicAgentTurnResult { agent: "euterpe"; text: string; consultedAthena: boolean; athenaMetadata?: Record<string, unknown>; proposal?: EuterpeProposal }

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
