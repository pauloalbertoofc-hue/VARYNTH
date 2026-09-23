import { experienceEventRepository } from "@/lib/persistence/repositories";
import { audioLearningAdapter } from "./audio-learning-adapter";
import { collectAudioLearningObservations } from "./audio-learning-adapter";
import type { AudioDocumentState } from "@/lib/studio/audio/types";
import { defaultMusicProject } from "@/lib/studio/audio/music-domain";

async function run() {
  await experienceEventRepository.clear();
  const event = await audioLearningAdapter.record({ action: "BPM_CHANGED", projectId: "audio-project", before: 68, after: 74 });
  if (event.moduleId !== "audio" || event.domain !== "audio" || event.actionType !== "USER_ACTION" || event.metadata.audioAction !== "BPM_CHANGED" || JSON.stringify(event.metadata.preferenceSignal) !== JSON.stringify({ key: "tempoDirection", value: "increase" })) throw new Error("audio adapter mapping failed");
  const accepted = await audioLearningAdapter.record({ action: "COMPOSITION_PROPOSAL_ACCEPTED", targetId: "proposal-1" });
  if (accepted.actionType !== "PROPOSAL_ACCEPTED") throw new Error("proposal acceptance mapping failed");
  const track = { id: "audio-track-1", name: "Track", type: "AUDIO" as const, muted: false, solo: false, volume: 1, pan: 0, clips: [], effects: [] };
  const initial: AudioDocumentState = { artifactId: "audio-artifact", timeline: { durationMs: 1000, zoom: 30, markers: [], snapToGrid: true, timeUnit: "ms" }, tracks: [track], selectedClipIds: [], playheadMs: 0, updatedAt: new Date().toISOString(), music: { ...defaultMusicProject(), tempoMap: [{ beat: 0, bpm: 120 }] } };
  const changed: AudioDocumentState = { ...initial, tracks: [], music: { ...initial.music!, tempoMap: [{ beat: 0, bpm: 90 }] } };
  const observations = collectAudioLearningObservations(initial, changed);
  if (!observations.some((item) => item.action === "BPM_CHANGED") || !observations.some((item) => item.action === "TRACK_REMOVED")) throw new Error("audio editor changes were not translated into observations");
  console.log("Audio learning adapter validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
