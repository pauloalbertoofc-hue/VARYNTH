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
  | "JOB_STARTED"
  | "JOB_PROGRESS"
  | "JOB_COMPLETED"
  | "JOB_FAILED"
  | "JOB_CANCELLED"
  | "JOB_INTERRUPTED"
  | "SANDBOX_RUN_STARTED"
  | "SANDBOX_RUN_COMPLETED"
  | "SANDBOX_RUN_FAILED"
  | "SANDBOX_EXECUTION_COMPLETED"
  | "BACKUP_CREATED"
  | "BACKUP_RESTORED"
  | "MIGRATION_STARTED"
  | "MIGRATION_BACKUP_CREATED"
  | "MIGRATION_WRITE_COMPLETED"
  | "MIGRATION_VERIFICATION_PASSED"
  | "MIGRATION_COMMITTED"
  | "MIGRATION_ROLLED_BACK"
  | "MIGRATION_FAILED"
  | "PERMISSION_EVALUATED"
  | "ACTION_CONFIRMATION_REQUIRED"
  | "ACTION_CONFIRMATION_CONSUMED"
  | "ACTION_DENIED"
  | "ACTION_ALLOWED"
  | "ACTION_EXECUTED"
  | "ASSET_CREATED"
  | "ASSET_DELETED"
  | "ASSET_MISSING"
  | "ARTIFACT_VALIDATION_FAILED"
  | "ARTIFACT_VERSION_CREATED"
  | "ARTIFACT_VERSION_RESTORED"
  | "WEBSITE_CREATED"
  | "WEB_BUILD_STARTED"
  | "WEB_BUILD_COMPLETED"
  | "WEB_BUILD_FAILED"
  | "PREVIEW_SESSION_CREATED"
  | "PREVIEW_SESSION_TERMINATED"
  | "PREVIEW_PROTOCOL_ABUSE"
  | "ATHENA_CHANGESET_PROPOSED"
  | "ATHENA_CHANGESET_REJECTED"
  | "IMAGE_CREATED"
  | "IMAGE_RENDER_STARTED"
  | "IMAGE_RENDER_COMPLETED"
  | "IMAGE_EXPORT_COMPLETED"
  | "IMAGE_ASSET_MISSING"
  | "IMAGE_CHANGESET_APPLIED"
  | "AUDIO_CREATED"
  | "AUDIO_RENDER_STARTED"
  | "AUDIO_RENDER_COMPLETED"
  | "AUDIO_EXPORT_COMPLETED"
  | "AUDIO_ASSET_MISSING"
  | "AUDIO_CHANGESET_APPLIED"
  | "VIDEO_CREATED"
  | "VIDEO_RENDER_STARTED"
  | "VIDEO_RENDER_PROGRESS"
  | "VIDEO_RENDER_COMPLETED"
  | "VIDEO_RENDER_FAILED"
  | "VIDEO_EXPORT_COMPLETED"
  | "VIDEO_ASSET_MISSING"
  | "VIDEO_CHANGESET_APPLIED"
  | "GAME_CREATED"
  | "GAME_TEST_STARTED"
  | "GAME_TEST_COMPLETED"
  | "GAME_TEST_FAILED"
  | "GAME_BUILD_STARTED"
  | "GAME_BUILD_COMPLETED"
  | "GAME_BUILD_FAILED"
  | "GAME_EXPORT_COMPLETED"
  | "GAME_ASSET_MISSING"
  | "GAME_CHANGESET_APPLIED"
  | "ARTIFACT_LINKED"
  | "ARTIFACT_UNLINKED"
  | "DEPENDENCY_UPDATED"
  | "DEPENDENCY_STALE"
  | "DEPENDENCY_MISSING"
  | "DEPENDENCY_RESTORED";

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

    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(`[EventBus] Erro ao disparar listener para evento ${type}:`, err);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const athenaEventBus = new EventBus();
