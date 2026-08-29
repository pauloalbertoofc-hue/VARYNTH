import { notificationStore } from "./notification-store";
import { VarynthNotification, NotificationSeverity, NotificationSource, NotificationFilter } from "./types";
import { athenaEventBus } from "../athena/events/event-bus";

export class NotificationService {
  constructor() {
    this.bindEventBus();
  }

  private bindEventBus(): void {
    // Listen for documentation updates
    athenaEventBus.on("DOCUMENTATION_UPDATED", (event: any) => {
      const data = event?.payload || event;
      if (data?.status === "APPROVED") {
        this.create({
          type: "DOCUMENTATION_PUBLISHED",
          title: "Documentação Publicada",
          message: `O documento "${data.title || data.reviewId}" foi aprovado e integrado a /docs.`,
          severity: "SUCCESS",
          source: "DOCUMENTATION",
          targetPath: "/modules/technical-archive",
        });
      } else if (data?.status === "REJECTED") {
        this.create({
          type: "DOCUMENTATION_REJECTED",
          title: "Proposta Rejeitada",
          message: `A proposta "${data.reviewId}" foi rejeitada: "${data.reason || 'Sem motivo'}"`,
          severity: "INFO",
          source: "DOCUMENTATION",
          targetPath: "/modules/technical-archive",
        });
      }
    });

    // Listen for general system warnings
    athenaEventBus.on("SYSTEM_ALERT", (event: any) => {
      const data = event?.payload || event;
      if (data?.title && data?.message) {
        this.create({
          type: data.type || "SYSTEM_ALERT",
          title: data.title,
          message: data.message,
          severity: data.severity || "WARNING",
          source: data.source || "SYSTEM",
          targetPath: data.targetPath,
        });
      }
    });
  }

  public create(params: {
    type: string;
    title: string;
    message: string;
    severity?: NotificationSeverity;
    source?: NotificationSource;
    entityId?: string;
    entityType?: string;
    targetPath?: string;
  }): VarynthNotification {
    return notificationStore.add(params);
  }

  public markAsRead(id: string): boolean {
    return notificationStore.markAsRead(id);
  }

  public markAllAsRead(): void {
    notificationStore.markAllAsRead();
  }

  public remove(id: string): boolean {
    return notificationStore.remove(id);
  }

  public clearAll(): void {
    notificationStore.clearAll();
  }

  public listAll(): VarynthNotification[] {
    return notificationStore.getAll();
  }

  public listUnread(): VarynthNotification[] {
    return notificationStore.getUnread();
  }

  public getUnreadCount(): number {
    return notificationStore.getUnreadCount();
  }

  public filterNotifications(
    list: VarynthNotification[],
    filter: NotificationFilter
  ): VarynthNotification[] {
    switch (filter) {
      case "UNREAD":
        return list.filter((n) => !n.read);
      case "CRITICAL":
        return list.filter((n) => n.severity === "CRITICAL" || n.severity === "WARNING");
      case "ALL":
      default:
        return list;
    }
  }
}

export const notificationService = new NotificationService();
