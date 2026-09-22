import type { VarynthEvent, VarynthEventType } from "@/lib/events/varynth-event-bus";

export type EuterpeAgentState = "IDLE" | "LISTENING" | "THINKING" | "RESULT" | "PLAYING" | "PAUSED" | "TRACK_CHANGED" | "ATHENA_DELEGATION";
export type BehaviorCategory = "COMMON" | "PERSONALITY_VARIATION" | "COMEDIC" | "SPECIAL_INTERACTION" | "RARE_EVENT";
export type EuterpeMusicState = "IDLE" | "PLAYING" | "PAUSED";
export type HarpAction = { id: string; intent: "play" | "protect" | "comfort" | "celebrate"; trigger: "user" | "agent" | "environment" };
export type MagicEffect = { id: string; source: "harp"; target: "environment" | "character"; reversible: boolean };
export type MusicalEffect = { id: string; notes: readonly string[]; durationMs: number; audioReactive: boolean };
export interface EuterpeVoiceProvider { readonly id: string; readonly capabilities: { speechToText: boolean; textToSpeech: boolean }; listen(signal?: AbortSignal): Promise<string>; speak(text: string, signal?: AbortSignal): Promise<void> }

export type EuterpeBehavior = {
  id: string;
  category: BehaviorCategory;
  priority: number;
  weight: number;
  cooldownMs: number;
  durationMs: number;
  interruptible: boolean;
  eligible: (event: VarynthEvent, context: EuterpeBehaviorContext) => boolean;
  state: EuterpeAgentState;
  reason: string;
};

export type EuterpeBehaviorContext = {
  currentState: EuterpeAgentState;
  musicState: EuterpeMusicState;
  rareEventsEnabled: boolean;
  agentsPresent: readonly string[];
  now: number;
  cooldowns: Readonly<Record<string, number>>;
};

export type EuterpeBehaviorDecision = {
  eventType: VarynthEventType;
  eligibleBehaviorIds: string[];
  behavior?: EuterpeBehavior;
  reason: string;
  decidedAt: number;
};

export const EUTERPE_BEHAVIORS: readonly EuterpeBehavior[] = [
  { id: "agent.listening", category: "COMMON", priority: 80, weight: 1, cooldownMs: 0, durationMs: 0, interruptible: true, eligible: (e) => e.type === "AGENT.LISTENING", state: "LISTENING", reason: "A pessoa iniciou uma interação com Euterpe." },
  { id: "agent.thinking", category: "COMMON", priority: 90, weight: 1, cooldownMs: 0, durationMs: 0, interruptible: true, eligible: (e) => e.type === "AGENT.THINKING" && e.payload.agentId === "euterpe", state: "THINKING", reason: "Existe uma resposta sendo processada agora." },
  { id: "agent.athena-request", category: "COMMON", priority: 100, weight: 1, cooldownMs: 0, durationMs: 0, interruptible: true, eligible: (e) => e.type === "ATHENA.REQUEST", state: "ATHENA_DELEGATION", reason: "Uma solicitação real foi encaminhada à Athena." },
  { id: "agent.result", category: "COMMON", priority: 85, weight: 1, cooldownMs: 0, durationMs: 1200, interruptible: true, eligible: (e) => e.type === "AGENT.RESULT" && e.payload.agentId === "euterpe" && e.payload.outcome !== "error", state: "RESULT", reason: "Euterpe recebeu uma resposta ou proposta." },
  { id: "agent.error", category: "COMMON", priority: 95, weight: 1, cooldownMs: 0, durationMs: 1200, interruptible: true, eligible: (e) => e.type === "AGENT.RESULT" && e.payload.agentId === "euterpe" && e.payload.outcome === "error", state: "IDLE", reason: "A solicitação terminou com falha; nenhuma comemoração deve ser mostrada." },
  { id: "music.track-changed", category: "COMMON", priority: 70, weight: 1, cooldownMs: 500, durationMs: 950, interruptible: true, eligible: (e) => e.type === "MUSIC.TRACK_CHANGED", state: "TRACK_CHANGED", reason: "A faixa mudou no player." },
  { id: "music.playing", category: "COMMON", priority: 60, weight: 1, cooldownMs: 0, durationMs: 0, interruptible: true, eligible: (e) => e.type === "MUSIC.PLAYING", state: "PLAYING", reason: "O elemento de áudio confirmou início da reprodução." },
  { id: "music.paused", category: "COMMON", priority: 60, weight: 1, cooldownMs: 0, durationMs: 0, interruptible: true, eligible: (e) => e.type === "MUSIC.PAUSED", state: "PAUSED", reason: "O elemento de áudio confirmou pausa." },
  { id: "music.idle", category: "COMMON", priority: 50, weight: 1, cooldownMs: 0, durationMs: 0, interruptible: true, eligible: (e) => e.type === "MUSIC.IDLE", state: "IDLE", reason: "Nenhuma faixa está tocando." },
  { id: "agent.shared-event", category: "SPECIAL_INTERACTION", priority: 75, weight: 1, cooldownMs: 0, durationMs: 900, interruptible: true, eligible: (e) => e.type === "AGENT.SHARED_EVENT" && e.payload.to === "euterpe", state: "ATHENA_DELEGATION", reason: "Outro agente enviou um evento real para Euterpe." },
  { id: "athena.entered", category: "COMMON", priority: 30, weight: 1, cooldownMs: 10_000, durationMs: 800, interruptible: true, eligible: (e) => e.type === "ATHENA.ENTERED_CONTEXT", state: "IDLE", reason: "Athena entrou no contexto por um evento real." },
];

/** Deterministic and auditable; weight breaks priority ties and never triggers random animation. */
export function decideEuterpeBehavior(event: VarynthEvent, context: EuterpeBehaviorContext, behaviors: readonly EuterpeBehavior[] = EUTERPE_BEHAVIORS): EuterpeBehaviorDecision {
  const eligible = behaviors.filter((behavior) => {
    if (behavior.category === "RARE_EVENT" && !context.rareEventsEnabled) return false;
    if ((context.cooldowns[behavior.id] ?? 0) > context.now) return false;
    if (context.currentState !== "IDLE" && !behavior.interruptible) return false;
    return behavior.eligible(event, context);
  }).sort((a, b) => b.priority - a.priority || b.weight - a.weight || a.id.localeCompare(b.id));
  const behavior = eligible[0];
  const decision: EuterpeBehaviorDecision = { eventType: event.type, eligibleBehaviorIds: eligible.map((item) => item.id), behavior, reason: behavior?.reason ?? "Nenhum comportamento está elegível para este evento e contexto.", decidedAt: context.now };
  if (process.env.NODE_ENV !== "production") console.debug("[EuterpeBehaviorDecision]", decision);
  return decision;
}

export class EuterpeAgent {
  private state: EuterpeAgentState = "IDLE";
  private musicState: EuterpeMusicState = "IDLE";
  private cooldowns: Record<string, number> = {};
  private rareEventsEnabled = false;

  get visualState() { return this.state; }
  get currentMusicState() { return this.musicState; }
  setRareEventsEnabled(enabled: boolean) { this.rareEventsEnabled = enabled; }
  setState(state: EuterpeAgentState) { this.state = state; }

  observe(event: VarynthEvent, now = Date.now()): EuterpeBehaviorDecision {
    if (event.type === "MUSIC.PLAYING") this.musicState = "PLAYING";
    if (event.type === "MUSIC.PAUSED") this.musicState = "PAUSED";
    if (event.type === "MUSIC.IDLE") this.musicState = "IDLE";
    const decision = decideEuterpeBehavior(event, { currentState: this.state, musicState: this.musicState, rareEventsEnabled: this.rareEventsEnabled, agentsPresent: [], now, cooldowns: this.cooldowns });
    if (decision.behavior) {
      this.state = decision.behavior.state;
      if (decision.behavior.cooldownMs) this.cooldowns[decision.behavior.id] = now + decision.behavior.cooldownMs;
    }
    return decision;
  }
}

export function visualStateForMusic(state: EuterpeAgentState): "IDLE" | "LISTENING" | "THINKING" | "HAPPY" | "SLEEP" | "MUSIC_REACTIVE" | "MUSIC_PAUSED" | "TRACK_CHANGED" | "ATHENA_DELEGATION" {
  if (state === "PLAYING") return "MUSIC_REACTIVE";
  if (state === "PAUSED") return "MUSIC_PAUSED";
  if (state === "RESULT" || state === "TRACK_CHANGED") return "TRACK_CHANGED";
  if (state === "ATHENA_DELEGATION") return "ATHENA_DELEGATION";
  if (state === "THINKING") return "THINKING";
  if (state === "LISTENING") return "LISTENING";
  return state === "IDLE" ? "SLEEP" : "IDLE";
}
