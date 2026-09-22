import assert from "node:assert/strict";
import { EuterpeAgent, decideEuterpeBehavior, visualStateForMusic } from "./euterpe-agent";
import { varynthEventBus } from "@/lib/events/varynth-event-bus";

const agent = new EuterpeAgent();
const seen: string[] = [];
const off = varynthEventBus.on("MUSIC.PLAYING", (event) => { seen.push(event.payload.trackId); agent.observe(event, 10); });
varynthEventBus.emit("MUSIC.PLAYING", { trackId: "song-1", title: "Song" }); off();
assert.deepEqual(seen, ["song-1"]);
assert.equal(agent.visualState, "PLAYING");
assert.equal(agent.currentMusicState, "PLAYING");

const athenaEvent = { type: "ATHENA.REQUEST", payload: { sessionId: "s1" }, occurredAt: "now" } as const;
const decision = decideEuterpeBehavior(athenaEvent, { currentState: "IDLE", musicState: "PLAYING", rareEventsEnabled: false, agentsPresent: ["athena"], now: 100, cooldowns: {} });
assert.equal(decision.behavior?.id, "agent.athena-request");
assert.ok(decision.eligibleBehaviorIds.includes("agent.athena-request"));
assert.match(decision.reason, /solicitação real/);
const rare = decideEuterpeBehavior({ type: "WEATHER.RAIN_STARTED", payload: { observedAt: "now", source: "test" }, occurredAt: "now" }, { currentState: "IDLE", musicState: "IDLE", rareEventsEnabled: false, agentsPresent: [], now: 100, cooldowns: {} });
assert.equal(rare.behavior, undefined, "environment contracts do not trigger unimplemented weather reactions");
assert.equal(visualStateForMusic("PLAYING"), "MUSIC_REACTIVE");
assert.equal(visualStateForMusic("PAUSED"), "MUSIC_PAUSED");
console.log("Euterpe agent emits auditable decisions from real music and agent events; rare behavior stays opt-in.");
