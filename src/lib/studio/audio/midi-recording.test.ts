import { midiEventsToNotes } from "./midi-recording";

const notes = midiEventsToNotes([{ phase: "NOTE_ON", midi: 60, velocity: 100, timeMs: 0 }, { phase: "NOTE_OFF", midi: 60, velocity: 0, timeMs: 500 }], 120);
if (notes.length !== 1 || notes[0].pitch !== "C" || notes[0].octave !== 4 || notes[0].durationBeats !== 1) throw new Error("MIDI recording conversion failed");
const closed = midiEventsToNotes([{ phase: "NOTE_ON", midi: 64, velocity: 90, timeMs: 250 }], 120, 750);
if (closed.length !== 1 || closed[0].startBeat !== 0.5 || closed[0].durationBeats !== 1) throw new Error("Open MIDI note was not closed at stop");
console.log("MIDI recording tests passed: paired notes, beat conversion and close-on-stop.");
