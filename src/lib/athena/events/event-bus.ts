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
  | "ERROR_OCCURRED"
  | "COMPONENT_CREATED"
  | "COMPONENT_REMOVED"
  | "MODULE_ADDED"
  | "ACTION_REGISTERED"
  | "AGENT_REGISTERED"
  | "INTERFACE_CHANGED"
  | "SCHEMA_CHANGED"
  | "ARCHITECTURE_CHANGED"
  | "DOCUMENTATION_OUTDATED"
  | "DOCUMENTATION_UPDATED"
  | "DOCUMENTATION_REVIEW_REQUIRED"
  | "SYSTEM_ALERT"
  | "DEADLINE_APPROACHING"
  | "TASK_OVERDUE"
  | "ARTIFACT_CREATED"
  | "ARTIFACT_UPDATED"
  | "ARTIFACT_VERSION_SNAPSHOTTED"
  | "ARTIFACT_RELATIONSHIP_LINKED"
  | "JOB_QUEUED"
  | "JOB_PROGRESS"
  | "JOB_COMPLETED"
  | "JOB_FAILED"
  | "JOB_CANCELLED"
  | "SANDBOX_EXECUTION_COMPLETED"
  | "BACKUP_CREATED"
  | "BACKUP_RESTORED"
  | "MIGRATION_STARTED"
  | "MIGRATION_BACKUP_CREATED"
  | "MIGRATION_WRITE_COMPLETED"
  | "MIGRATION_VERIFICATION_PASSED"
  | "MIGRATION_COMMITTED"
  | "MIGRATION_ROLLED_BACK"
  | "MIGRATION_FAILED";

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

