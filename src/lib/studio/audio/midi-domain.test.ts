import { notesToMidiSequence, midiSequenceToNotes, notesToMidiSequencesByTrack } from "./midi-domain";
const sequence = notesToMidiSequence([{ id: "c4", pitch: "C", accidental: "natural", octave: 4, startBeat: 0, durationBeats: 1, velocity: 96 }]);
if (sequence.events[0].midi !== 60 || midiSequenceToNotes(sequence)[0].durationBeats !== 1) throw new Error("MIDI roundtrip inválido");
const note = { id: "c4", pitch: "C" as const, accidental: "natural" as const, octave: 4, startBeat: 0, durationBeats: 1, velocity: 96 };
const tracks = notesToMidiSequencesByTrack([{ trackId: "piano", notes: [note] }, { trackId: "bass", notes: [{ ...note, id: "bass-c", octave: 2 }] }]);
if (tracks.length !== 2 || tracks[0].channel !== 0 || tracks[1].channel !== 1 || tracks[1].format !== 1) throw new Error("MIDI multifaixa inválido");
console.log("MIDI domain tests passed: note events and serializable roundtrip.");
