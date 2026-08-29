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
}

export type NotificationFilter = "ALL" | "UNREAD" | "CRITICAL";

