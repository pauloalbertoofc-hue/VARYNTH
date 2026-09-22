import { midiToPitch, MusicalNote } from "./music-domain";

export type MidiRecordedEvent = { phase: "NOTE_ON" | "NOTE_OFF"; midi: number; velocity: number; timeMs: number };

export function midiEventsToNotes(events: MidiRecordedEvent[], bpm: number, closeTimeMs?: number): MusicalNote[] {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  const beatMs = 60000 / safeBpm;
  const open = new Map<number, MidiRecordedEvent>();
  const notes: MusicalNote[] = [];
  for (const event of [...events].sort((a, b) => a.timeMs - b.timeMs)) {
    if (!Number.isFinite(event.midi) || event.midi < 0 || event.midi > 127 || !Number.isFinite(event.timeMs)) continue;
    if (event.phase === "NOTE_ON" && event.velocity > 0) open.set(event.midi, event);
    else if (event.phase === "NOTE_OFF") {
      const start = open.get(event.midi);
      if (!start) continue;
      const durationBeats = Math.max(1 / 32, (Math.max(start.timeMs + 1, event.timeMs) - start.timeMs) / beatMs);
      const pitch = midiToPitch(event.midi);
      notes.push({ id: `midi-recorded-${start.timeMs}-${event.midi}-${notes.length}`, ...pitch, startBeat: Math.max(0, start.timeMs / beatMs), durationBeats, velocity: Math.max(1, Math.min(127, start.velocity)), originalStartBeat: Math.max(0, start.timeMs / beatMs), originalVelocity: Math.max(1, Math.min(127, start.velocity)) });
      open.delete(event.midi);
    }
  }
  if (closeTimeMs !== undefined && Number.isFinite(closeTimeMs)) {
    for (const start of open.values()) {
      const pitch = midiToPitch(start.midi);
      const startBeat = Math.max(0, start.timeMs / beatMs);
      notes.push({ id: `midi-recorded-${start.timeMs}-${start.midi}-${notes.length}`, ...pitch, startBeat, durationBeats: Math.max(1 / 32, (Math.max(start.timeMs + 1, closeTimeMs) - start.timeMs) / beatMs), velocity: Math.max(1, Math.min(127, start.velocity)), originalStartBeat: startBeat, originalVelocity: Math.max(1, Math.min(127, start.velocity)) });
    }
  }
  return notes.sort((a, b) => a.startBeat - b.startBeat || a.octave - b.octave);
}
