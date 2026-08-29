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

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [notifications, setNotifications] = useState<VarynthNotification[]>(() =>
    notificationStore.getAll()
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  const getSourceIcon = (source: NotificationSource) => {
    switch (source) {
      case "ATHENA":
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
      case "DOCUMENTATION":
        return <BookOpen className="w-3.5 h-3.5 text-cyan-400" />;
      case "CHRONOS":
        return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
      case "PROJECTS":
        return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
      case "TRASH":
        return <Archive className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5" /> CRÍTICO
          </span>
        );
      case "WARNING":
        return (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> ATENÇÃO
          </span>
        );
      case "SUCCESS":
        return (
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> SUCESSO
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
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
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer",
          isOpen
            ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
            : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-[#1e1e30] hover:border-violet-500/30"
        )}
        title={unreadCount > 0 ? `${unreadCount} notificações não lidas` : "Notificações do Sistema"}
        aria-label="Abrir central de notificações"
        data-testid="notification-bell-button"
      >
        <Bell size={14} />

        {/* BADGE DERIVADO DO STORE */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-black text-[9px] font-extrabold flex items-center justify-center shadow-lg animate-pulse"
            data-testid="notification-unread-badge"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN FLYOUT PANEL */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0a0a0f] border border-[#1e1e30] shadow-2xl shadow-black/80 z-50 overflow-hidden flex flex-col animate-fade-in text-slate-200"
          data-testid="notification-panel"
        >
          {/* HEADER */}
          <div className="p-4 border-b border-[#1e1e30] bg-[#10101a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Bell size={12} />
              </div>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Central de Notificações
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  {unreadCount} nova(s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors flex items-center gap-1"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={12} />
                  <span>Ler todas</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="px-3 py-2 border-b border-[#1e1e30] bg-[#0c0c14] flex items-center gap-1.5 text-[11px] font-mono">
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
                onClick={() => setFilter(tab.id as NotificationFilter)}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  filter === tab.id
                    ? "bg-violet-600/30 text-violet-300 font-bold border border-violet-500/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* NOTIFICATION LIST */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#1e1e30]/60">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <p className="text-xs font-bold text-white">Tudo tranquilo por aqui.</p>
                <p className="text-[11px] text-slate-400">Nenhuma notificação pendente no filtro atual.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNavigate(notif)}
                  className={cn(
                    "p-3.5 transition-all cursor-pointer group flex flex-col space-y-2 relative",
                    notif.read
                      ? "bg-transparent hover:bg-white/[0.02] opacity-75 hover:opacity-100"
                      : "bg-violet-950/20 hover:bg-violet-950/30 border-l-2 border-l-cyan-400"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getSourceIcon(notif.source)}
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {notif.source}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {getSeverityBadge(notif.severity)}
                      <span className="text-[9px] font-mono text-slate-500 flex items-center gap-0.5">
                        <Clock size={9} />
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                      {notif.title}
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* ACTION FOOTER */}
                  <div className="pt-1.5 flex items-center justify-between text-[10px]">
                    {notif.targetPath ? (
                      <span className="text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Acessar contexto</span>
                        <ExternalLink size={10} />
                      </span>
                    ) : (
                      <span className="text-slate-500">Notificação informativa</span>
                    )}

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title="Marcar como lida"
                        >
                          <Check size={11} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleRemove(notif.id, e)}
                        className="p-1 rounded bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300"
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
          <div className="p-2.5 bg-[#0e0e18] border-t border-[#1e1e30] text-center text-[10px] text-slate-500 flex items-center justify-between px-4">
            <span className="font-mono">VARYNTH Notification Center</span>
            <button
              onClick={() => {
                notificationService.clearAll();
                syncNotifications();
              }}
              className="text-[10px] text-slate-400 hover:text-red-400 transition-colors"
            >
              Limpar todas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

