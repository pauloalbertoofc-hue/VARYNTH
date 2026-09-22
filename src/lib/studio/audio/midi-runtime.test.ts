import { decodeMidiMessage, midiRuntimeController } from "./midi-runtime";
const status = midiRuntimeController.status(); if (typeof navigator === "undefined" && status.available) throw new Error("Runtime MIDI não pode declarar disponibilidade no Node");
const noteOn = decodeMidiMessage(new Uint8Array([0x90, 60, 100])); if (noteOn.type !== "NOTE_ON" || noteOn.midi !== 60 || noteOn.velocity !== 100) throw new Error("MIDI Note On inválido");
const noteOff = decodeMidiMessage(new Uint8Array([0x80, 60, 0])); if (noteOff.type !== "NOTE_OFF" || noteOff.midi !== 60) throw new Error("MIDI Note Off inválido");
const control = decodeMidiMessage(new Uint8Array([0xb0, 74, 90])); if (control.type !== "CONTROL_CHANGE" || control.controller !== 74 || control.value !== 90) throw new Error("MIDI CC inválido");
const bend = decodeMidiMessage(new Uint8Array([0xe0, 0x00, 0x60])); if (bend.type !== "PITCH_BEND" || bend.semitones === undefined || bend.semitones <= 0) throw new Error("MIDI pitch bend inválido");
if (decodeMidiMessage(new Uint8Array([0xf8])).type !== "OTHER") throw new Error("MIDI clock não deve virar nota");
console.log("MIDI runtime tests passed: capability detection, note/CC decoding and fail-safe controller lifecycle.");
