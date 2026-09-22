import { createLocalSynthInstrument } from "./instrument-engine";
const instrument = createLocalSynthInstrument();
instrument.loadPreset({ oscillator: "triangle", attack: 0.02, release: 0.1 });
instrument.noteOn({ midi: 69, velocity: 96 });
instrument.noteOff(69);
instrument.dispose();
console.log("Instrument engine test passed: local synth lifecycle, preset and noteOn/noteOff.");
