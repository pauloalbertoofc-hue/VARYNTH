import { midiToFrequency, midiToPitch } from "./music-domain";

export interface AudioAnalysis { peak: number; rms: number; clipping: boolean; frequencyHz?: number; midi?: number; note?: string; cents?: number; confidence: number; }

export type LoudnessAnalysisStatus = "OK" | "INSUFFICIENT_DURATION" | "BELOW_GATE" | "INVALID_INPUT" | "UNSUPPORTED_CHANNELS";
export interface ProgramLoudnessAnalysis {
  status: LoudnessAnalysisStatus;
  channels: number;
  durationSeconds: number;
  samplePeak: number;
  samplePeakDbfs: number;
  interpolatedPeak: number;
  interpolatedPeakDbfs: number;
  rms: number;
  rmsDbfs: number;
  integratedLufs: number | null;
  windowCount: number;
}

export type RhythmAnalysisStatus = "OK" | "INSUFFICIENT_DURATION" | "NO_PULSES" | "INVALID_INPUT";
export interface RhythmAnalysis {
  status: RhythmAnalysisStatus;
  bpm: number | null;
  confidence: number;
  transientTimesMs: number[];
  durationSeconds: number;
}

interface BiquadCoefficients { b0: number; b1: number; b2: number; a1: number; a2: number; }

function kWeightingCoefficients(sampleRate: number): [BiquadCoefficients, BiquadCoefficients] {
  const shelfFrequency = 1681.974450955533;
  const shelfGainDb = 3.999843853973347;
  const shelfQ = 0.7071752369554196;
  const shelfK = Math.tan(Math.PI * shelfFrequency / sampleRate);
  const shelfVh = 10 ** (shelfGainDb / 20);
  const shelfVb = shelfVh ** 0.4996667741545416;
  const shelfA0 = 1 + shelfK / shelfQ + shelfK * shelfK;
  const shelf: BiquadCoefficients = {
    b0: (shelfVh + shelfVb * shelfK / shelfQ + shelfK * shelfK) / shelfA0,
    b1: 2 * (shelfK * shelfK - shelfVh) / shelfA0,
    b2: (shelfVh - shelfVb * shelfK / shelfQ + shelfK * shelfK) / shelfA0,
    a1: 2 * (shelfK * shelfK - 1) / shelfA0,
    a2: (1 - shelfK / shelfQ + shelfK * shelfK) / shelfA0,
  };
  const highPassFrequency = 38.13547087602444;
  const highPassQ = 0.5003270373238773;
  const highPassK = Math.tan(Math.PI * highPassFrequency / sampleRate);
  const highPassA0 = 1 + highPassK / highPassQ + highPassK * highPassK;
  const highPass: BiquadCoefficients = {
    b0: 1 / highPassA0, b1: -2 / highPassA0, b2: 1 / highPassA0,
    a1: 2 * (highPassK * highPassK - 1) / highPassA0,
    a2: (1 - highPassK / highPassQ + highPassK * highPassK) / highPassA0,
  };
  return [shelf, highPass];
}

function applyBiquad(samples: Float32Array | Float64Array, coefficients: BiquadCoefficients): Float64Array {
  const output = new Float64Array(samples.length);
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let index = 0; index < samples.length; index++) {
    const x0 = samples[index];
    const y0 = coefficients.b0 * x0 + coefficients.b1 * x1 + coefficients.b2 * x2 - coefficients.a1 * y1 - coefficients.a2 * y2;
    output[index] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return output;
}

/** 4x Catmull-Rom peak scan: a useful inter-sample warning, not certified true peak. */
export function estimateInterpolatedPeak(samples: Float32Array | Float64Array, oversample = 4): number {
  if (samples.length === 0 || oversample < 2) return 0;
  let peak = 0;
  for (let index = 0; index < samples.length; index++) {
    const p0 = samples[Math.max(0, index - 1)] ?? 0;
    const p1 = samples[index] ?? 0;
    const p2 = samples[Math.min(samples.length - 1, index + 1)] ?? 0;
    const p3 = samples[Math.min(samples.length - 1, index + 2)] ?? 0;
    for (let step = 0; step < oversample; step++) {
      const t = step / oversample;
      const value = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
      peak = Math.max(peak, Math.abs(value));
    }
  }
  return peak;
}

/** Integrated loudness for mono/stereo PCM using ITU-R BS.1770 K-weighting and gating. */
export function analyzeProgramLoudness(channels: readonly Float32Array[], sampleRate: number): ProgramLoudnessAnalysis {
  const channelCount = channels.length;
  const sampleCount = channels[0]?.length ?? 0;
  const durationSeconds = sampleRate > 0 ? sampleCount / sampleRate : 0;
  let samplePeak = 0; let totalSquare = 0; let totalSamples = 0;
  const base = (status: LoudnessAnalysisStatus, integratedLufs: number | null = null, windowCount = 0): ProgramLoudnessAnalysis => {
    const rms = totalSamples ? Math.sqrt(totalSquare / totalSamples) : 0;
    const interpolatedPeak = channels[0] ? Math.max(...channels.map((channel) => estimateInterpolatedPeak(channel))) : 0;
    return { status, channels: channelCount, durationSeconds, samplePeak, samplePeakDbfs: samplePeak > 0 ? 20 * Math.log10(samplePeak) : -Infinity, interpolatedPeak, interpolatedPeakDbfs: interpolatedPeak > 0 ? 20 * Math.log10(interpolatedPeak) : -Infinity, rms, rmsDbfs: rms > 0 ? 20 * Math.log10(rms) : -Infinity, integratedLufs, windowCount };
  };
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || channelCount === 0 || sampleCount === 0 || channels.some((channel) => channel.length !== sampleCount)) return base("INVALID_INPUT");
  if (channelCount > 2) return base("UNSUPPORTED_CHANNELS");
  for (const channel of channels) for (const sample of channel) {
    if (!Number.isFinite(sample)) return base("INVALID_INPUT");
    samplePeak = Math.max(samplePeak, Math.abs(sample)); totalSquare += sample * sample; totalSamples++;
  }
  const windowSize = Math.round(sampleRate * 0.4);
  if (sampleCount < windowSize) return base("INSUFFICIENT_DURATION");
  const [shelf, highPass] = kWeightingCoefficients(sampleRate);
  const weighted = channels.map((channel) => applyBiquad(applyBiquad(channel, shelf), highPass));
  const step = Math.max(1, Math.round(windowSize * 0.25));
  const energies: number[] = [];
  for (let start = 0; start + windowSize <= sampleCount; start += step) {
    let energy = 0;
    for (const channel of weighted) {
      let channelEnergy = 0;
      for (let index = start; index < start + windowSize; index++) channelEnergy += channel[index] ** 2;
      energy += channelEnergy / windowSize;
    }
    energies.push(energy);
  }
  const loudness = (energy: number) => energy > 0 ? -0.691 + 10 * Math.log10(energy) : -Infinity;
  const absoluteGate = energies.filter((energy) => loudness(energy) >= -70);
  if (!absoluteGate.length) return base("BELOW_GATE", null, energies.length);
  const ungatedMean = absoluteGate.reduce((sum, energy) => sum + energy, 0) / absoluteGate.length;
  const relativeThreshold = loudness(ungatedMean) - 10;
  const gated = absoluteGate.filter((energy) => loudness(energy) >= relativeThreshold);
  if (!gated.length) return base("BELOW_GATE", null, energies.length);
  const integrated = loudness(gated.reduce((sum, energy) => sum + energy, 0) / gated.length);
  return base("OK", integrated, energies.length);
}

/**
 * Estimates tempo from a mono energy-onset envelope and returns detected onsets.
 * This is intentionally a bounded heuristic: it reports confidence and never
 * pretends to replace a beat tracker for polymetric or heavily syncopated audio.
 */
export function analyzeRhythm(samples: Float32Array, sampleRate: number): RhythmAnalysis {
  const durationSeconds = sampleRate > 0 ? samples.length / sampleRate : 0;
  const invalid = { status: "INVALID_INPUT" as RhythmAnalysisStatus, bpm: null, confidence: 0, transientTimesMs: [], durationSeconds };
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !samples.length || samples.some((sample) => !Number.isFinite(sample))) return invalid;
  if (samples.length < sampleRate * 1.5) return { ...invalid, status: "INSUFFICIENT_DURATION" };
  const frameSize = Math.max(128, Math.round(sampleRate * 0.02));
  const hop = Math.max(64, Math.round(sampleRate * 0.01));
  const energy: number[] = [];
  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    let sum = 0;
    for (let index = start; index < start + frameSize; index++) sum += samples[index] * samples[index];
    energy.push(Math.sqrt(sum / frameSize));
  }
  const onset = energy.map((value, index) => Math.max(0, value - (energy[index - 1] ?? value)));
  const mean = onset.reduce((sum, value) => sum + value, 0) / onset.length;
  const variance = onset.reduce((sum, value) => sum + (value - mean) ** 2, 0) / onset.length;
  const deviation = Math.sqrt(variance);
  if (deviation < 1e-5) return { ...invalid, status: "NO_PULSES" };
  const threshold = mean + deviation * 0.8;
  const transients: number[] = [];
  for (let index = 1; index < onset.length - 1; index++) {
    if (onset[index] < threshold || onset[index] < onset[index - 1] || onset[index] < onset[index + 1]) continue;
    const previousMs = transients[transients.length - 1] ?? -Infinity;
    const timeMs = (index * hop + frameSize / 2) / sampleRate * 1000;
    if (timeMs - previousMs >= 80) transients.push(timeMs);
  }
  if (transients.length < 3) return { ...invalid, status: "NO_PULSES", transientTimesMs: transients };
  const intervals = transients.slice(1).map((time, index) => time - transients[index]);
  const candidates: Array<{ bpm: number; score: number }> = [];
  for (let bpm = 40; bpm <= 240; bpm++) {
    const target = 60000 / bpm;
    const score = intervals.reduce((sum, interval) => sum + Math.exp(-(((interval - target) / Math.max(12, target * 0.08)) ** 2)), 0) / intervals.length;
    candidates.push({ bpm, score });
  }
  candidates.sort((left, right) => right.score - left.score);
  const best = candidates[0];
  const second = candidates[1];
  const confidence = Math.max(0, Math.min(1, best.score * 0.72 + Math.max(0, best.score - second.score) * 2));
  return { status: confidence >= 0.35 ? "OK" : "NO_PULSES", bpm: confidence >= 0.35 ? best.bpm : null, confidence, transientTimesMs: transients, durationSeconds };
}

/** YIN difference-function pitch estimate, with an explicit confidence threshold. */
export function detectPitchYin(samples: Float32Array, sampleRate: number, options: { threshold?: number; minFrequencyHz?: number; maxFrequencyHz?: number } = {}): { frequencyHz: number; confidence: number } | undefined {
  const threshold = Math.min(0.4, Math.max(0.05, options.threshold ?? 0.15));
  const minFrequency = Math.max(20, options.minFrequencyHz ?? 50);
  const maxFrequency = Math.min(sampleRate / 2, options.maxFrequencyHz ?? 1200);
  if (sampleRate <= 0 || samples.length < 8 || minFrequency >= maxFrequency) return undefined;
  let mean = 0;
  for (const sample of samples) mean += sample;
  mean /= samples.length;
  let energy = 0;
  for (const sample of samples) energy += (sample - mean) ** 2;
  if (energy / samples.length < 1e-8) return undefined;

  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxTau = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(samples.length / 2));
  if (maxTau <= minTau) return undefined;
  const difference = new Float64Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    const limit = samples.length - tau;
    for (let index = 0; index < limit; index++) {
      const delta = (samples[index] - mean) - (samples[index + tau] - mean);
      sum += delta * delta;
    }
    difference[tau] = sum;
  }
  const normalized = new Float64Array(maxTau + 1);
  normalized[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += difference[tau];
    normalized[tau] = running > 0 ? difference[tau] * tau / running : 1;
  }
  let tauEstimate = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (normalized[tau] < threshold) {
      while (tau < maxTau && normalized[tau + 1] < normalized[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate < 0) return undefined;
  const left = normalized[Math.max(1, tauEstimate - 1)];
  const center = normalized[tauEstimate];
  const right = normalized[Math.min(maxTau, tauEstimate + 1)];
  const denominator = left - 2 * center + right;
  const offset = Math.abs(denominator) > 1e-12 ? 0.5 * (left - right) / denominator : 0;
  const period = tauEstimate + Math.max(-1, Math.min(1, offset));
  const frequencyHz = sampleRate / period;
  if (!Number.isFinite(frequencyHz) || frequencyHz < minFrequency || frequencyHz > maxFrequency) return undefined;
  return { frequencyHz, confidence: Math.max(0, Math.min(1, 1 - center)) };
}

export function analyzeSamples(samples: Float32Array, sampleRate: number): AudioAnalysis {
  if (!samples.length || sampleRate <= 0) return { peak: 0, rms: 0, clipping: false, confidence: 0 };
  let peak = 0;
  let sum = 0;
  for (const value of samples) { peak = Math.max(peak, Math.abs(value)); sum += value * value; }
  const rms = Math.sqrt(sum / samples.length);
  const estimate = detectPitchYin(samples, sampleRate);
  if (!estimate) return { peak, rms, clipping: peak >= 1, confidence: 0 };
  const midi = Math.round(69 + 12 * Math.log2(estimate.frequencyHz / 440));
  const cents = 1200 * Math.log2(estimate.frequencyHz / midiToFrequency(midi));
  const pitch = midiToPitch(midi);
  return { peak, rms, clipping: peak >= 1, frequencyHz: estimate.frequencyHz, midi, note: `${pitch.pitch}${pitch.accidental === "sharp" ? "#" : pitch.accidental === "flat" ? "b" : ""}${pitch.octave}`, cents, confidence: estimate.confidence };
}
