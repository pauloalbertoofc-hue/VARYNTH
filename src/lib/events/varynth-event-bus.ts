export type VarynthEventMap = {
  "MUSIC.PLAYING": { trackId: string; title?: string };
  "MUSIC.PAUSED": { trackId: string; title?: string };
  "MUSIC.TRACK_CHANGED": { trackId: string; title?: string; previousTrackId?: string };
  "MUSIC.IDLE": { trackId?: string };
  "AGENT.LISTENING": { agentId: string };
  "AGENT.THINKING": { agentId: string; delegatedTo?: "athena" };
  "AGENT.RESULT": { agentId: string; outcome: "response" | "proposal" | "error" };
  "ATHENA.ENTERED_CONTEXT": { sessionId?: string };
  "ATHENA.REQUEST": { sessionId?: string; requestId?: string };
  "ATHENA.RESPONSE": { sessionId?: string; requestId?: string };
  "AGENT.SHARED_EVENT": { from: string; to: string; kind: string };
  "WEATHER.RAIN_STARTED": { observedAt: string; source: string };
  "WEATHER.RAIN_STOPPED": { observedAt: string; source: string };
  "TIME.PERIOD_CHANGED": { period: "morning" | "afternoon" | "evening" | "night"; observedAt: string };
  "CALENDAR.EVENT_STARTED": { eventId: string; observedAt: string };
  "SOCIAL.PRESENCE_CHANGED": { actorId: string; present: boolean };
  "SYSTEM.FOCUS_CHANGED": { enabled: boolean };
};

export type VarynthEventType = keyof VarynthEventMap;
export type VarynthEvent<K extends VarynthEventType = VarynthEventType> = K extends VarynthEventType
  ? { type: K; payload: VarynthEventMap[K]; occurredAt: string }
  : never;
type Listener<K extends VarynthEventType> = (event: VarynthEvent<K>) => void;

/** App-level domain events. Athena's governance/audit bus remains a separate concern. */
export class VarynthEventBus {
  private listeners = new Map<VarynthEventType, Set<(event: VarynthEvent) => void>>();

  on<K extends VarynthEventType>(type: K, listener: Listener<K>): () => void {
    const set = this.listeners.get(type) ?? new Set<(event: VarynthEvent) => void>();
    const wrapped = listener as (event: VarynthEvent) => void;
    set.add(wrapped);
    this.listeners.set(type, set);
    return () => { set.delete(wrapped); if (!set.size) this.listeners.delete(type); };
  }

  emit<K extends VarynthEventType>(type: K, payload: VarynthEventMap[K]): void {
    const event = { type, payload, occurredAt: new Date().toISOString() } as VarynthEvent<K>;
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      try { listener(event); } catch (error) { if (process.env.NODE_ENV !== "production") console.error(`[VarynthEventBus] Listener failed for ${type}`, error); }
    }
  }
}

export const varynthEventBus = new VarynthEventBus();
