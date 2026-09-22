import { AudioBus, AudioTrack } from "./types";
import { audioBusRouteContains, isAudioTrackAudible, isAudioTrackDirectOutputAudible, isAudioTrackSendAudible, validateAudioBusRouting } from "./audio-routing";

const bus = (id: string, outputBusId?: string, solo = false): AudioBus => ({ id, name: id, volume: 1, pan: 0, muted: false, solo, effects: [], outputBusId });
const track = (overrides: Partial<AudioTrack> = {}): AudioTrack => ({ id: "track", name: "Track", type: "AUDIO", muted: false, solo: false, volume: 1, pan: 0, clips: [], effects: [], ...overrides });
const buses = [bus("group", "master-bus"), bus("master-bus")];
validateAudioBusRouting(buses);
if (!audioBusRouteContains("group", new Set(["master-bus"]), buses)) throw new Error("Nested route traversal failed.");
const selectedBus = [bus("group", "master-bus", true), bus("master-bus")];
const routed = track({ busId: "group" });
const unsoloed = track({ id: "other" });
if (!isAudioTrackAudible(routed, [routed, unsoloed], selectedBus)) throw new Error("A track routed through a solo bus must remain audible.");
if (isAudioTrackDirectOutputAudible(unsoloed, selectedBus)) throw new Error("A direct-to-master track must not leak while a bus is soloed.");
if (!isAudioTrackSendAudible(routed, "group", selectedBus) || isAudioTrackSendAudible(routed, "master-bus", selectedBus)) throw new Error("Solo bus must isolate sends to its route.");
const sendOnly = track({ id: "send-only", sends: [{ id: "send", busId: "group", level: 0.5, enabled: true }] });
if (!isAudioTrackAudible(sendOnly, [sendOnly], selectedBus) || isAudioTrackDirectOutputAudible(sendOnly, selectedBus)) throw new Error("Send-only bus solo must not leak the track's direct output.");
const cycle = [bus("a", "b"), bus("b", "a")];
let cycleRejected = false;
try { validateAudioBusRouting(cycle); } catch (error) { cycleRejected = error instanceof Error && error.message.includes("AUDIO_ROUTING_INVALID"); }
if (!cycleRejected) throw new Error("Cyclic bus routing must be rejected.");
let missingRejected = false;
try { validateAudioBusRouting([bus("orphan", "missing")]); } catch (error) { missingRejected = error instanceof Error && error.message.includes("AUDIO_ROUTING_INVALID"); }
if (!missingRejected) throw new Error("Missing bus destinations must be rejected.");
console.log("Audio routing tests passed: nested buses, bus solo isolation, sends, cycles and missing destinations.");
