import { VarynthNotification, NotificationSeverity, NotificationSource } from "./types";

const STORAGE_KEY = "varynth_notifications_v4";
const NOTIFICATION_EVENT = "varynth_notification_updated";

export class NotificationStore {
  private notifications: VarynthNotification[] = [];
  private isLoaded: boolean = false;

  constructor() {
    this.init();
    this.setupStorageListener();
  }

  private setupStorageListener(): void {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY) {
          this.reloadFromStorage();
          this.emitUpdate();
        }
      });
    }
  }

  private emitUpdate(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
    }
  }

  private init(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.notifications = parsed;
          } else {
            this.notifications = this.getSeedNotifications();
            this.saveToStorage();
          }
        } else {
          this.notifications = this.getSeedNotifications();
          this.saveToStorage();
        }
        this.isLoaded = true;
        return;
      } catch (err) {
        console.warn("[NotificationStore] Falha ao carregar do localStorage, usando fallback em memória:", err);
      }
    }

    // SSR / Node.js test fallback
    this.notifications = this.getSeedNotifications();
    this.isLoaded = true;
  }

  private saveToStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
      } catch (err) {
        console.error("[NotificationStore] Erro ao persistir notificações:", err);
      }
    }
  }

  public reloadFromStorage(): void {
    this.init();
  }

  public getAll(): VarynthNotification[] {
    return JSON.parse(JSON.stringify(this.notifications));
  }

  public getUnread(): VarynthNotification[] {
    return JSON.parse(JSON.stringify(this.notifications.filter((n) => !n.read)));
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  public getById(id: string): VarynthNotification | undefined {
    const item = this.notifications.find((n) => n.id === id);
    return item ? JSON.parse(JSON.stringify(item)) : undefined;
  }

  public add(params: {
    type: string;
    title: string;
    message: string;
    severity?: NotificationSeverity;
    source?: NotificationSource;
    entityId?: string;
    entityType?: string;
    targetPath?: string;
  }): VarynthNotification {
    const newNotif: VarynthNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity || "INFO",
      source: params.source || "SYSTEM",
      entityId: params.entityId,
      entityType: params.entityType,
      targetPath: params.targetPath,
      read: false,
      createdAt: new Date().toISOString(),
    };

    this.notifications.unshift(newNotif);
    this.saveToStorage();
    this.emitUpdate();
    return JSON.parse(JSON.stringify(newNotif));
  }

  public markAsRead(id: string): boolean {
    const item = this.notifications.find((n) => n.id === id);
    if (!item) return false;

    if (!item.read) {
      item.read = true;
      item.readAt = new Date().toISOString();
      this.saveToStorage();
      this.emitUpdate();
    }
    return true;
  }

  public markAllAsRead(): void {
    const now = new Date().toISOString();
    let hasChanges = false;

    this.notifications.forEach((n) => {
      if (!n.read) {
        n.read = true;
        n.readAt = now;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveToStorage();
      this.emitUpdate();
    }
  }

  public remove(id: string): boolean {
    const idx = this.notifications.findIndex((n) => n.id === id);
    if (idx === -1) return false;

    this.notifications.splice(idx, 1);
    this.saveToStorage();
    this.emitUpdate();
    return true;
  }

  public clearAll(): void {
    this.notifications = [];
    this.saveToStorage();
    this.emitUpdate();
  }

  public resetToSeed(): void {
    this.notifications = this.getSeedNotifications();
    this.saveToStorage();
    this.emitUpdate();
  }

  private getSeedNotifications(): VarynthNotification[] {
    return [
      {
        id: "notif-001",
        type: "DOCUMENTATION_REVIEW_REQUIRED",
        title: "Revisão Documental Necessária",
        message: "ADR-007 (Draft) e Lição #05 aguardam sua inspeção no Centro de Revisão.",
        severity: "WARNING",
        source: "DOCUMENTATION",
        entityId: "REV-001",
        entityType: "ADR",
        targetPath: "/modules/technical-archive",
        read: false,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
      },
      {
        id: "notif-002",
        type: "DEADLINE_APPROACHING",
        title: "Prazo no Chronos se Aproximando",
        message: "Marco 'Revisão de Soberania Local-First' possui entrega programada para breve.",
        severity: "WARNING",
        source: "CHRONOS",
        entityId: "chronos-event-1",
        entityType: "EVENT",
        targetPath: "/modules/chronos",
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      },
      {
        id: "notif-003",
        type: "ATHENA_QUALITY_GATE",
        title: "Guardião de Regressão Operacional",
        message: "73/73 casos da suíte de regressão histórica continuam 100% íntegros (Zero Drift).",
        severity: "SUCCESS",
        source: "ATHENA",
        targetPath: "/modules/technical-archive",
        read: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      },
    ];
  }
}

export const notificationStore = new NotificationStore();

