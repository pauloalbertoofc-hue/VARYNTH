import { MusicalNote, midiToPitch, pitchToMidi } from "./music-domain";
import { MidiSequence, midiSequenceToNotes, notesToMidiSequence, notesToMidiSequencesByTrack } from "./midi-domain";

function readVlq(data: Uint8Array, cursor: { value: number }): number { let value = 0; let byte = 0; do { byte = data[cursor.value++]; value = (value << 7) | (byte & 0x7f); } while (byte & 0x80); return value; }
function writeVlq(value: number): number[] { const bytes = [value & 0x7f]; while ((value >>= 7) > 0) bytes.unshift((value & 0x7f) | 0x80); return bytes; }
function ascii(value: string): number[] { return [...value].map((char) => char.charCodeAt(0)); }
function u32(value: number): number[] { return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]; }
function u16(value: number): number[] { return [(value >>> 8) & 255, value & 255]; }

export function parseMidiFile(input: ArrayBufferLike): { sequence: MidiSequence; notes: MusicalNote[] } {
  const data = new Uint8Array(input); const view = new DataView(input); if (String.fromCharCode(...data.slice(0, 4)) !== "MThd") throw new Error("[MIDI_INVALID_HEADER] Arquivo MIDI inválido.");
  const headerLength = view.getUint32(4); const format = view.getUint16(8) as 0 | 1; const ticksPerBeat = view.getUint16(12); let offset = 8 + headerLength; const events: MidiSequence["events"] = []; let tempoBpm = 120; let absoluteTick = 0; const active = new Map<string, { midi: number; channel: number; velocity: number; tick: number }>();
  if (String.fromCharCode(...data.slice(offset, offset + 4)) !== "MTrk") throw new Error("[MIDI_MISSING_TRACK] Arquivo MIDI sem trilha."); offset += 4; const length = view.getUint32(offset); offset += 4; const end = offset + length; let runningStatus = 0;
  while (offset < end) { const cursor = { value: offset }; absoluteTick += readVlq(data, cursor); offset = cursor.value; let status = data[offset++]; if (status < 0x80) { offset--; status = runningStatus; } else runningStatus = status; if (status === 0xff) { const type = data[offset++]; const sizeCursor = { value: offset }; const size = readVlq(data, sizeCursor); offset = sizeCursor.value; if (type === 0x51 && size === 3) tempoBpm = 60000000 / ((data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]); offset += size; continue; } if (status === 0xf0 || status === 0xf7) { const sizeCursor = { value: offset }; const size = readVlq(data, sizeCursor); offset = sizeCursor.value + size; continue; } const command = status & 0xf0; const channel = status & 0x0f; const midi = data[offset++]; const velocity = command === 0xc0 || command === 0xd0 ? 0 : data[offset++]; if (command === 0x90 && velocity > 0) active.set(`${channel}:${midi}`, { midi, channel, velocity, tick: absoluteTick }); else if (command === 0x80 || (command === 0x90 && velocity === 0)) { const start = active.get(`${channel}:${midi}`); if (start) { events.push({ type: "noteOn", channel, midi, velocity: start.velocity, tick: start.tick }, { type: "noteOff", channel, midi, velocity: 0, tick: absoluteTick }); active.delete(`${channel}:${midi}`); } } }
  const sequence: MidiSequence = { format, ticksPerBeat, tempoBpm, events: events.sort((a, b) => a.tick - b.tick) }; return { sequence, notes: midiSequenceToNotes(sequence) };
}

export function parseMidiFileByTracks(input: ArrayBufferLike): { sequence: MidiSequence; tracks: Array<{ trackIndex: number; notes: MusicalNote[]; sequence: MidiSequence }> } {
  const data = new Uint8Array(input); const view = new DataView(input);
  if (String.fromCharCode(...data.slice(0, 4)) !== "MThd") throw new Error("[MIDI_INVALID_HEADER] Arquivo MIDI inválido.");
  const headerLength = view.getUint32(4); const format = view.getUint16(8) as 0 | 1; const trackCount = view.getUint16(10); const ticksPerBeat = view.getUint16(12); let offset = 8 + headerLength;
  const tracks: Array<{ trackIndex: number; notes: MusicalNote[]; sequence: MidiSequence }> = [];
  for (let trackIndex = 0; trackIndex < trackCount && offset + 8 <= data.length; trackIndex++) {
    if (String.fromCharCode(...data.slice(offset, offset + 4)) !== "MTrk") break;
    const length = view.getUint32(offset + 4); const trackEnd = Math.min(data.length, offset + 8 + length);
    const header = [...ascii("MThd"), ...u32(6), ...u16(0), ...u16(1), ...u16(ticksPerBeat)];
    const trackBytes = Array.from(data.slice(offset, trackEnd)); const parsed = parseMidiFile(new Uint8Array([...header, ...trackBytes]).buffer);
    tracks.push({ trackIndex, notes: parsed.notes, sequence: { ...parsed.sequence, format } }); offset = trackEnd;
  }
  return { sequence: { format, ticksPerBeat, tempoBpm: tracks[0]?.sequence.tempoBpm || 120, events: tracks.flatMap((track) => track.sequence.events) }, tracks };
}

export function encodeMidiFile(notes: MusicalNote[], tempoBpm = 120, ticksPerBeat = 480): Uint8Array {
  const sequence = notesToMidiSequence(notes, tempoBpm, ticksPerBeat); const track: number[] = []; const tempo = Math.round(60000000 / tempoBpm); track.push(0, 0xff, 0x51, 3, (tempo >>> 16) & 255, (tempo >>> 8) & 255, tempo & 255); let previous = 0;
  for (const event of sequence.events) { track.push(...writeVlq(event.tick - previous), event.type === "noteOn" ? 0x90 : 0x80, event.midi, event.type === "noteOn" ? event.velocity : 0); previous = event.tick; } track.push(0, 0xff, 0x2f, 0);
  const result = [...ascii("MThd"), ...u32(6), ...u16(0), ...u16(1), ...u16(ticksPerBeat), ...ascii("MTrk"), ...u32(track.length), ...track]; return new Uint8Array(result);
}

export function encodeMidiFileByTracks(tracks: Array<{ trackId: string; notes: MusicalNote[] }>, tempoBpm = 120, ticksPerBeat = 480): Uint8Array {
  const sequences = notesToMidiSequencesByTrack(tracks, tempoBpm, ticksPerBeat);
  const encodedTracks = sequences.map((sequence, index) => {
    const events: number[] = [];
    if (index === 0) { const tempo = Math.round(60000000 / tempoBpm); events.push(0, 0xff, 0x51, 3, (tempo >>> 16) & 255, (tempo >>> 8) & 255, tempo & 255); }
    let previous = 0;
    for (const event of sequence.events) { events.push(...writeVlq(event.tick - previous), event.type === "noteOn" ? 0x90 | sequence.channel : 0x80 | sequence.channel, event.midi, event.type === "noteOn" ? event.velocity : 0); previous = event.tick; }
    events.push(0, 0xff, 0x2f, 0);
    return [...ascii("MTrk"), ...u32(events.length), ...events];
  });
  const header = [...ascii("MThd"), ...u32(6), ...u16(1), ...u16(Math.max(1, encodedTracks.length)), ...u16(ticksPerBeat)];
  return new Uint8Array([...header, ...encodedTracks.flat()]);
}
