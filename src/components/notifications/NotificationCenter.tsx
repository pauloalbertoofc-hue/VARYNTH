"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Archive,
  Cpu,
} from "lucide-react";
import { notificationStore } from "@/lib/notifications/notification-store";
import { notificationService } from "@/lib/notifications/notification-service";
import {
  VarynthNotification,
  NotificationFilter,
  NotificationSource,
  NotificationSeverity,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { athenaProactiveMonitor } from "@/lib/athena/insights/proactive-monitor";
import type { NotificationAction } from "@/lib/notifications/types";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [notifications, setNotifications] = useState<VarynthNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const varynthStore = useVarynthStore();

  const syncNotifications = () => {
    notificationStore.reloadFromStorage();
    setNotifications(notificationStore.getAll());
  };

  useEffect(() => {
    syncNotifications();

    const handleUpdate = () => syncNotifications();
    window.addEventListener("varynth_notification_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("varynth_notification_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(
    () => notificationService.filterNotifications(notifications, filter),
    [notifications, filter]
  );

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    notificationService.markAsRead(id);
    syncNotifications();
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    syncNotifications();
  };

  const handleRemove = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    notificationService.remove(id);
    syncNotifications();
  };

  const handleNavigate = (notification: VarynthNotification) => {
    if (!notification.read) {
      notificationService.markAsRead(notification.id);
      syncNotifications();
    }
    setIsOpen(false);
    if (notification.targetPath) {
      router.push(notification.targetPath);
    }
  };

  const handleAction = (notification: VarynthNotification, action: NotificationAction, event: React.MouseEvent) => {
    event.stopPropagation();
    if (action.type === "COMPLETE_TASK" && action.payload?.taskId) {
      varynthStore.updateTask(action.payload.taskId, { status: "concluida", completedAt: new Date().toISOString() }, "athena");
    } else if (action.type === "CREATE_TASK" && action.payload?.title) {
      const duplicate = varynthStore.tasks.some((task) => task.projectId === action.payload?.projectId && task.title === action.payload?.title && task.status !== "concluida");
      if (!duplicate) varynthStore.addTask({ title: action.payload.title, projectId: action.payload.projectId, priority: notification.severity === "CRITICAL" ? "urgente" : "alta", status: "a_fazer", tags: ["athena", "notificacao"] }, "athena");
    } else if (action.type === "SNOOZE" && action.payload?.fingerprint) {
      athenaProactiveMonitor.snooze(action.payload.fingerprint, new Date(Date.now() + 86_400_000));
    }
    notificationService.markAsRead(notification.id);
    if (action.type === "SNOOZE") notificationService.remove(notification.id);
    syncNotifications();
  };

  const getSourceIcon = (source: NotificationSource) => {
    switch (source) {
      case "ATHENA":
        return <Cpu className="w-3.5 h-3.5 text-[var(--vly-accent)]" />;
      case "DOCUMENTATION":
        return <BookOpen className="w-3.5 h-3.5 text-[var(--vly-info)]" />;
      case "CHRONOS":
        return <Calendar className="w-3.5 h-3.5 text-[var(--vly-warning)]" />;
      case "PROJECTS":
        return <Layers className="w-3.5 h-3.5 text-[var(--vly-success)]" />;
      case "TRASH":
        return <Archive className="w-3.5 h-3.5 text-[var(--vly-danger)]" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-[var(--vly-text-muted)]" />;
    }
  };

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] text-[var(--vly-danger)] border border-[var(--vly-border-danger)] text-[9px] font-mono font-bold flex items-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5" /> CRÍTICO
          </span>
        );
      case "WARNING":
        return (
          <span className="px-1.5 py-0.5 rounded bg-[var(--vly-surface-warning)] text-[var(--vly-warning)] border border-[var(--vly-border-warning)] text-[9px] font-mono font-bold flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> ATENÇÃO
          </span>
        );
      case "SUCCESS":
        return (
          <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] text-[var(--vly-success)] border border-[var(--vly-border-success)] text-[9px] font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> SUCESSO
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)] border border-[var(--vly-border-info)] text-[9px] font-mono font-bold flex items-center gap-1">
            <Info className="w-2.5 h-2.5" /> INFO
          </span>
        );
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return "agora mesmo";
      if (mins < 60) return `há ${mins}m`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `há ${hours}h`;
      const days = Math.floor(hours / 24);
      return `há ${days}d`;
    } catch {
      return "recente";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* SINO DO HEADER (INTERATIVO COM BADGE REAL) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="notification-panel"
        className={cn(
          "vly-interactive relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer",
          isOpen
            ? "bg-[var(--vly-surface-active)] border-[var(--vly-border-accent)] text-[var(--vly-accent-hover)]"
            : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)] border border-[var(--vly-border-subtle)] hover:border-[var(--vly-border-accent)]"
        )}
        title={unreadCount > 0 ? `${unreadCount} notificações não lidas` : "Notificações do Sistema"}
        aria-label="Abrir central de notificações"
        data-testid="notification-bell-button"
      >
        <Bell size={14} />

        {/* BADGE DERIVADO DO STORE */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--vly-success)] text-[var(--vly-accent-contrast)] text-[9px] font-extrabold flex items-center justify-center shadow-lg animate-pulse"
            data-testid="notification-unread-badge"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN FLYOUT PANEL */}
      {isOpen && (
        <div
          id="notification-panel"
          role="region"
          aria-labelledby="notification-panel-title"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[var(--vly-surface-floating)] border border-[var(--vly-border-strong)] shadow-2xl shadow-black/30 z-50 overflow-hidden flex flex-col vly-motion-enter text-[var(--vly-text-secondary)]"
          data-testid="notification-panel"
        >
          {/* HEADER */}
          <div className="p-4 border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[var(--vly-surface-active)] border border-[var(--vly-border-accent)] flex items-center justify-center text-[var(--vly-accent)]">
                <Bell size={12} />
              </div>
              <h3 id="notification-panel-title" className="text-xs font-bold text-[var(--vly-text-primary)] tracking-wide">
                Central de Notificações
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--vly-surface-success)] text-[var(--vly-success)] border border-[var(--vly-border-success)] font-bold">
                  {unreadCount} nova(s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="vly-interactive px-2 py-1 rounded-md text-[10px] font-semibold text-[var(--vly-text-muted)] hover:text-[var(--vly-info)] hover:bg-[var(--vly-surface-hover)] transition-colors flex items-center gap-1"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={12} />
                  <span>Ler todas</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar central de notificações"
                className="vly-interactive p-1 rounded-md text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* FILTER TABS */}
          <div role="tablist" aria-label="Filtros de notificações" className="px-3 py-2 border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] flex items-center gap-1.5 text-[11px] font-mono">
            {[
              { id: "ALL", label: `Todas (${notifications.length})` },
              { id: "UNREAD", label: `Não Lidas (${unreadCount})` },
              {
                id: "CRITICAL",
                label: `Alertas (${
                  notifications.filter(
                    (n) => n.severity === "CRITICAL" || n.severity === "WARNING"
                  ).length
                })`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as NotificationFilter)}
                role="tab"
                aria-selected={filter === tab.id}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  filter === tab.id
                    ? "bg-[var(--vly-surface-active)] text-[var(--vly-accent-hover)] font-bold border border-[var(--vly-border-accent)]"
                    : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* NOTIFICATION LIST */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--vly-border-subtle)]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] border border-[var(--vly-border-success)] text-[var(--vly-success)] mx-auto flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <p className="text-xs font-bold text-[var(--vly-text-primary)]">Tudo tranquilo por aqui.</p>
                <p className="text-[11px] text-[var(--vly-text-muted)]">Nenhuma notificação pendente no filtro atual.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNavigate(notif)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${notif.title}${notif.read ? "" : " (não lida)"}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleNavigate(notif);
                    }
                  }}
                  className={cn(
                    "p-3.5 transition-all cursor-pointer group flex flex-col space-y-2 relative",
                    notif.read
                      ? "bg-transparent hover:bg-[var(--vly-surface-hover)] opacity-75 hover:opacity-100"
                      : "bg-[var(--vly-surface-active)] hover:bg-[var(--vly-surface-hover)] border-l-2 border-l-[var(--vly-info)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getSourceIcon(notif.source)}
                      <span className="text-[10px] font-mono text-[var(--vly-text-muted)] uppercase">
                        {notif.source}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {getSeverityBadge(notif.severity)}
                      <span className="text-[9px] font-mono text-[var(--vly-text-disabled)] flex items-center gap-0.5">
                        <Clock size={9} />
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--vly-text-primary)] group-hover:text-[var(--vly-info)] transition-colors leading-snug">
                      {notif.title}
                    </h4>
                    <p className="text-[11px] text-[var(--vly-text-secondary)] mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {notif.reason && (
                    <details onClick={(event) => event.stopPropagation()} className="rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface)] px-2.5 py-1.5 text-[10px] text-[var(--vly-text-muted)]">
                      <summary className="cursor-pointer font-semibold text-[var(--vly-text-secondary)]">Por que recebi isto?</summary>
                      <p className="mt-1 leading-relaxed">{notif.reason}</p>
                      {notif.evidence?.length ? <ul className="mt-1 list-disc pl-4 text-[var(--vly-text-disabled)]">{notif.evidence.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                    </details>
                  )}

                  {notif.actions?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {notif.actions.map((action) => <button type="button" key={action.id} onClick={(event) => handleAction(notif, action, event)} className="vly-interactive rounded-md border border-[var(--vly-border-accent)] bg-[var(--vly-surface-active)] px-2 py-1 text-[9px] font-bold text-[var(--vly-accent-hover)] hover:bg-[var(--vly-surface-hover)]">{action.label}</button>)}
                    </div>
                  ) : null}

                  {/* ACTION FOOTER */}
                  <div className="pt-1.5 flex items-center justify-between text-[10px]">
                    {notif.targetPath ? (
                        <span className="text-[var(--vly-info)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Acessar contexto</span>
                        <ExternalLink size={10} />
                      </span>
                    ) : (
                      <span className="text-[var(--vly-text-disabled)]">Notificação informativa</span>
                    )}

                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          aria-label="Marcar notificação como lida"
                          className="vly-interactive p-1 rounded bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                          title="Marcar como lida"
                        >
                          <Check size={11} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleRemove(notif.id, e)}
                        aria-label="Remover notificação"
                        className="vly-interactive p-1 rounded bg-[var(--vly-surface-raised)] hover:bg-[color-mix(in_srgb,var(--vly-danger)_16%,var(--vly-surface-raised))] text-[var(--vly-text-muted)] hover:text-[var(--vly-danger)]"
                        title="Remover notificação"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FOOTER */}
          <div className="p-2.5 bg-[var(--vly-surface)] border-t border-[var(--vly-border-subtle)] text-center text-[10px] text-[var(--vly-text-disabled)] flex items-center justify-between px-4">
            <span className="font-mono">VARYNTH Notification Center</span>
            <button
              type="button"
              onClick={() => {
                notificationService.clearAll();
                syncNotifications();
              }}
              className="vly-interactive text-[10px] text-[var(--vly-text-muted)] hover:text-[var(--vly-danger)] transition-colors"
            >
              Limpar todas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
