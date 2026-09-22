import { analyzeProgramLoudness, analyzeRhythm, analyzeSamples, detectPitchYin, estimateInterpolatedPeak } from "./audio-analysis";

function tone(frequency: number, sampleRate = 44100, seconds = 0.1, harmonics = false): Float32Array {
  return Float32Array.from({ length: Math.floor(sampleRate * seconds) }, (_, index) => {
    const phase = 2 * Math.PI * frequency * index / sampleRate;
    return 0.4 * Math.sin(phase) + (harmonics ? 0.22 * Math.sin(phase * 2.03) + 0.1 * Math.sin(phase * 3.07) : 0);
  });
}

const a4 = tone(440);
const result = analyzeSamples(a4, 44100);
if (result.peak < 0.39 || result.rms < 0.25 || !result.frequencyHz || Math.abs(result.frequencyHz - 440) > 1 || result.note !== "A4" || Math.abs(result.cents || 0) > 1) throw new Error("YIN should accurately identify a clean A4");
for (const frequency of [82.41, 110, 196, 329.63, 523.25, 880]) {
  const estimate = detectPitchYin(tone(frequency, 48000, 0.12, true), 48000);
  if (!estimate || Math.abs(estimate.frequencyHz - frequency) / frequency > 0.015 || estimate.confidence < 0.8) throw new Error(`Harmonic-rich pitch ${frequency}Hz was not estimated reliably: ${JSON.stringify(estimate)}`);
}
const silent = analyzeSamples(new Float32Array(4096), 44100);
if (silent.frequencyHz !== undefined || silent.confidence !== 0) throw new Error("Silence must not invent a tuner reading");
let seed = 0x12345678;
const noisy = Float32Array.from({ length: 8192 }, () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed / 0x80000000) * 0.01; });
const noiseEstimate = detectPitchYin(noisy, 44100);
if (noiseEstimate && noiseEstimate.confidence > 0.75) throw new Error("Broadband-like noise must not produce a high-confidence pitch");
if (detectPitchYin(tone(440), 0) !== undefined || detectPitchYin(new Float32Array(4), 44100) !== undefined) throw new Error("Invalid sampling inputs must be safely rejected");
const lufsTone = (amplitude: number, seconds = 1): Float32Array => Float32Array.from({ length: 48000 * seconds }, (_, index) => amplitude * Math.sin(2 * Math.PI * 1000 * index / 48000));
const monoLoudness = analyzeProgramLoudness([lufsTone(1)], 48000);
if (monoLoudness.status !== "OK" || monoLoudness.integratedLufs === null || Math.abs(monoLoudness.integratedLufs - (-3.01)) > 0.2) throw new Error(`ITU loudness reference tone failed: ${JSON.stringify(monoLoudness)}`);
const quieter = analyzeProgramLoudness([lufsTone(0.5)], 48000);
if (quieter.integratedLufs === null || Math.abs((monoLoudness.integratedLufs! - quieter.integratedLufs) - 6.02) > 0.1) throw new Error("LUFS should follow a 6.02 dB amplitude change");
const stereo = analyzeProgramLoudness([lufsTone(0.5), lufsTone(0.5)], 48000);
if (stereo.integratedLufs === null || Math.abs(stereo.integratedLufs - (quieter.integratedLufs! + 3.01)) > 0.1) throw new Error("Stereo energy summation is incorrect");
if (analyzeProgramLoudness([new Float32Array(48000)], 48000).status !== "BELOW_GATE") throw new Error("Silence must fall below the loudness gate");
if (analyzeProgramLoudness([lufsTone(0.5, 0.2)], 48000).status !== "INSUFFICIENT_DURATION") throw new Error("Sub-400ms clip should be identified as too short");
if (analyzeProgramLoudness([new Float32Array(48000), new Float32Array(48000), new Float32Array(48000)], 48000).status !== "UNSUPPORTED_CHANNELS") throw new Error("Multichannel loudness must not be reported using stereo assumptions");
if (analyzeProgramLoudness([Float32Array.of(0, Number.NaN)], 48000).status !== "INVALID_INPUT") throw new Error("Non-finite samples must be rejected");
const interSample = estimateInterpolatedPeak(Float32Array.from([0, 0.95, 0.1, 0.9, 0]));
if (interSample < 0.949 || !Number.isFinite(interSample)) throw new Error(`Interpolated peak must not miss sample peak: ${interSample}`);
const measuredSamples = new Float32Array(19200); measuredSamples.set([0, 0.95, 0.1, 0.9, 0]);
const measuredPeak = analyzeProgramLoudness([measuredSamples], 48000);
if (measuredPeak.interpolatedPeak < measuredPeak.samplePeak) throw new Error("Program analysis must retain the interpolated peak estimate");
const clickTrack = Float32Array.from({ length: 8 * 44100 }, (_, index) => { const beat = Math.round(index / (44100 * 0.5)) * 44100 * 0.5; const distance = index - beat; return distance >= 0 && distance < 900 ? 0.8 * Math.exp(-distance / 180) : 0; });
const rhythm = analyzeRhythm(clickTrack, 44100);
if (rhythm.status !== "OK" || rhythm.bpm === null || Math.abs(rhythm.bpm - 120) > 3 || rhythm.transientTimesMs.length < 10 || rhythm.confidence < 0.35) throw new Error(`Click-track tempo/transients failed: ${JSON.stringify(rhythm)}`);
if (analyzeRhythm(new Float32Array(44100), 44100).status !== "INSUFFICIENT_DURATION") throw new Error("Short rhythm input must be rejected honestly");
if (analyzeRhythm(new Float32Array(4 * 44100), 44100).status !== "NO_PULSES") throw new Error("Silence must not invent tempo or transients");
console.log("Audio analysis tests passed: YIN, LUFS, gating, tempo, transients, channel scope and invalid input.");
