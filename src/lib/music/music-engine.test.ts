import assert from "node:assert/strict";
import { varynthEventBus } from "@/lib/events/varynth-event-bus";
import { MusicEngine, waveformPeaksFromPcm } from "./music-engine";

const engine = new MusicEngine();
const events: string[] = [];
const offs = [
  varynthEventBus.on("MUSIC.TRACK_CHANGED", (event) => events.push(`${event.type}:${event.payload.trackId}`)),
  varynthEventBus.on("MUSIC.PLAYING", (event) => events.push(`${event.type}:${event.payload.trackId}`)),
  varynthEventBus.on("MUSIC.PAUSED", (event) => events.push(`${event.type}:${event.payload.trackId}`)),
];
engine.loadTrack({ id: "song", name: "Título" });
assert.equal(engine.playbackState, "PAUSED");
engine.confirmPlaying(); engine.confirmPaused();
for (const off of offs) off();
assert.deepEqual(events, ["MUSIC.TRACK_CHANGED:song", "MUSIC.PLAYING:song", "MUSIC.PAUSED:song"]);

const peaks = waveformPeaksFromPcm([new Float32Array([0, .2, 0, .8, 0, .1, 0, .6])], 4);
assert.deepEqual(peaks, [.2, .8, .1, .6]);
assert.equal(waveformPeaksFromPcm([new Float32Array([1])], 0).length, 0);
assert.deepEqual(waveformPeaksFromPcm([], 8), []);
console.log("MusicEngine reports confirmed playback changes; waveform peaks come from historical PCM, independently of FFT.");
