export type AthenaEventType =
  | "TASK_CREATED"
  | "TASK_PLANNED"
  | "WORKFLOW_STARTED"
  | "STEP_EXECUTED"
  | "ACTION_INVOKED"
  | "AGENT_CONTRIBUTION"
  | "DELIBERATION_COMPLETED"
  | "REFLECTION_COMPLETED"
  | "RESPONSE_READY"
  | "ERROR_OCCURRED";

export interface AthenaEvent<T = unknown> {
  type: AthenaEventType;
  taskId?: string;
  payload: T;
  timestamp: string;
}

type EventListener<T = unknown> = (event: AthenaEvent<T>) => void;

class EventBus {
  private listeners: Map<AthenaEventType, Set<EventListener<any>>> = new Map();

  on<T = unknown>(type: AthenaEventType, listener: EventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  emit<T = unknown>(type: AthenaEventType, payload: T, taskId?: string): void {
    const event: AthenaEvent<T> = {
      type,
      taskId,
      payload,
      timestamp: new Date().toISOString(),
    };

    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch {
          // ignore error in event handler to prevent pipeline crashes
        }
      });
    }
  }
}

export const athenaEventBus = new EventBus();

