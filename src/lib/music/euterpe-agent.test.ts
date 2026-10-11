import assert from "node:assert/strict";
import { EuterpeAgent, decideEuterpeBehavior, visualStateForMusic } from "./euterpe-agent";
import { euterpeAgent } from "@/lib/athena/agents/council/music-curator";
import { idlePhase } from "./euterpe-living";
import { varynthEventBus } from "@/lib/events/varynth-event-bus";
import type { AthenaContext } from "@/lib/athena/domain/context";
import type { AthenaTask } from "@/lib/athena/domain/task";

const behaviorAgent = new EuterpeAgent();
void (async () => {
const greetingTask = { rawPrompt: "Olá, o que você faz?", title: "Olá", scope: "music", metadata: {} } as AthenaTask;
const nativeGreeting = await euterpeAgent.converseWithFeedback!(greetingTask, { experienceContext: { preferences: [] } } as unknown as AthenaContext);
const delegatedGreeting = await euterpeAgent.converseWithFeedback!(greetingTask, { responseAudience: "ATHENA", experienceContext: { preferences: [] } } as unknown as AthenaContext);
assert.match(nativeGreeting.content, /Sou Euterpe/);
assert.doesNotMatch(delegatedGreeting.content, /Sou Euterpe/);
assert.equal(delegatedGreeting.metadata?.conversationAudience, "ATHENA");
})().catch((error) => { console.error(error); process.exitCode = 1; });
const seen: string[] = [];
const off = varynthEventBus.on("MUSIC.PLAYING", (event) => { seen.push(event.payload.trackId); behaviorAgent.observe(event, 10); });
varynthEventBus.emit("MUSIC.PLAYING", { trackId: "song-1", title: "Song" }); off();
assert.deepEqual(seen, ["song-1"]);
assert.equal(behaviorAgent.visualState, "PLAYING");
assert.equal(behaviorAgent.currentMusicState, "PLAYING");

const athenaEvent = { type: "ATHENA.REQUEST", payload: { sessionId: "s1" }, occurredAt: "now" } as const;
const decision = decideEuterpeBehavior(athenaEvent, { currentState: "IDLE", musicState: "PLAYING", rareEventsEnabled: false, agentsPresent: ["athena"], now: 100, cooldowns: {} });
assert.equal(decision.behavior?.id, "agent.athena-request");
assert.ok(decision.eligibleBehaviorIds.includes("agent.athena-request"));
assert.match(decision.reason, /solicitação real/);
const rare = decideEuterpeBehavior({ type: "WEATHER.RAIN_STARTED", payload: { observedAt: "now", source: "test" }, occurredAt: "now" }, { currentState: "IDLE", musicState: "IDLE", rareEventsEnabled: false, agentsPresent: [], now: 100, cooldowns: {} });
assert.equal(rare.behavior, undefined, "environment contracts do not trigger unimplemented weather reactions");
assert.equal(visualStateForMusic("PLAYING"), "MUSIC_REACTIVE");
assert.equal(visualStateForMusic("PAUSED"), "MUSIC_PAUSED");
assert.equal(idlePhase(29_999), "ACTIVE_IDLE");
assert.equal(idlePhase(30_000), "RELAXED_IDLE");
assert.equal(idlePhase(180_000), "REST_ELIGIBLE");
console.log("Euterpe agent emits auditable decisions from real music and agent events; rare behavior stays opt-in.");
