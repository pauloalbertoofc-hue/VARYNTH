import { euterpeAgent, musicAgentShouldConsultAthena, type MusicAthenaConsult } from "@/lib/athena/agents/council/music-curator";
import type { AthenaContext } from "@/lib/athena/domain/context";
import type { AthenaTask } from "@/lib/athena/domain/task";
import type { MusicDNA } from "./music-studio";
import type { MusicTrack } from "./types";

export { musicAgentShouldConsultAthena };
export interface MusicAgentTurnResult { agent: "euterpe"; text: string; consultedAthena: boolean; athenaMetadata?: Record<string, unknown> }

export async function runMusicAgentTurn(input: {
  message: string;
  track?: MusicTrack | null;
  dna?: MusicDNA;
  consultAthena: MusicAthenaConsult;
  context?: AthenaContext;
}): Promise<MusicAgentTurnResult> {
  const { message, track, dna } = input;
  const task = {
    id: `euterpe-chat-${Date.now()}`, title: "Conversa com Euterpe", rawPrompt: message,
    type: "GENERAL_DELIBERATION", priority: "media", status: "RUNNING", scope: "music", entities: {},
    metadata: { musicTrack: track ? { id: track.id, name: track.name, artist: track.artist } : undefined, musicDNA: dna },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  } as AthenaTask;
  const result = await euterpeAgent.converse(task, input.context ?? {} as AthenaContext, input.consultAthena);
  const metadata = result.metadata ?? {};
  return {
    agent: "euterpe", text: result.content,
    consultedAthena: metadata.consultedAthena === true,
    athenaMetadata: metadata.athenaMetadata && typeof metadata.athenaMetadata === "object" ? metadata.athenaMetadata as Record<string, unknown> : undefined,
  };
}
