export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export type NotificationSource =
  | "ATHENA"
  | "CHRONOS"
  | "PROJECTS"
  | "DOCUMENTATION"
  | "TRASH"
  | "SYSTEM"
  | "RESEARCH"
  | "OPPORTUNITIES"
  | "OTHER";

export type NotificationActionType = "CREATE_TASK" | "COMPLETE_TASK" | "SNOOZE";

export interface NotificationAction {
  id: string;
  label: string;
  type: NotificationActionType;
  payload?: { taskId?: string; projectId?: string; title?: string; fingerprint?: string };
}

export interface VarynthNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  source: NotificationSource;
  entityId?: string;
  entityType?: string;
  targetPath?: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
  reason?: string;
  evidence?: string[];
  fingerprint?: string;
  actions?: NotificationAction[];
}

export type NotificationFilter = "ALL" | "UNREAD" | "CRITICAL";
