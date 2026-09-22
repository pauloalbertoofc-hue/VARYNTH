import { encodeMidiFile, encodeMidiFileByTracks, parseMidiFile, parseMidiFileByTracks } from "./midi-file";
const bytes = encodeMidiFile([{ id: "a4", pitch: "A", accidental: "natural", octave: 4, startBeat: 0, durationBeats: 1, velocity: 100 }]);
const parsed = parseMidiFile(bytes.buffer);
if (parsed.notes.length !== 1 || parsed.notes[0].pitch !== "A" || parsed.notes[0].octave !== 4 || parsed.notes[0].durationBeats !== 1) throw new Error("MIDI file roundtrip inválido");
const multi = encodeMidiFileByTracks([{ trackId: "piano", notes: [{ id: "a", pitch: "A", accidental: "natural", octave: 4, startBeat: 0, durationBeats: 1, velocity: 100 }] }, { trackId: "bass", notes: [{ id: "e", pitch: "E", accidental: "natural", octave: 2, startBeat: 0, durationBeats: 2, velocity: 90 }] }]);
if (String.fromCharCode(...multi.slice(0, 4)) !== "MThd" || new DataView(multi.buffer).getUint16(10) !== 2) throw new Error("MIDI multifaixa não gerou duas trilhas");
const parsedMulti = parseMidiFileByTracks(multi.buffer);
if (parsedMulti.tracks.length !== 2 || parsedMulti.tracks[1].notes[0].pitch !== "E") throw new Error("MIDI multifaixa não foi separado na importação");
console.log("MIDI file tests passed: Standard MIDI File format 0 encode/decode.");
