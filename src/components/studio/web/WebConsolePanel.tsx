"use client";

import React, { useState, useEffect } from "react";
import { WebConsoleLogEntry } from "@/lib/studio/web/types";
import { webPreviewBridge } from "@/lib/studio/web/web-preview-bridge";
import { Terminal, AlertTriangle, AlertCircle, Info, Trash2 } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";

interface WebConsolePanelProps {
  previewSessionId?: string;
  buildLogs?: string[];
  buildErrors?: string[];
}

export function WebConsolePanel({
  previewSessionId,
  buildLogs = [],
  buildErrors = [],
}: WebConsolePanelProps) {
  const [activeTab, setActiveTab] = useState<"console" | "build" | "problems">("console");
  const [logs, setLogs] = useState<WebConsoleLogEntry[]>([]);

  useEffect(() => {
    if (!previewSessionId) return;

    // Ingest existing logs
    setLogs(webPreviewBridge.getSessionLogs(previewSessionId));

    // Subscribe to new real-time logs
    const unsubscribe = webPreviewBridge.subscribeToLogs(previewSessionId, (entry) => {
      setLogs((prev) => [...prev, entry]);
    });

    return unsubscribe;
  }, [previewSessionId]);

  const handleClear = () => {
    if (previewSessionId) {
      webPreviewBridge.clearSessionLogs(previewSessionId);
    }
    setLogs([]);
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle size={12} className="mt-0.5 shrink-0 text-[var(--vly-danger)]" />;
      case "warn":
        return <AlertTriangle size={12} className="mt-0.5 shrink-0 text-[var(--vly-warning)]" />;
      default:
        return <Info size={12} className="mt-0.5 shrink-0 text-[var(--vly-info)]" />;
    }
  };

  return (
    <div className="flex h-44 select-text flex-col border-t border-[var(--vly-border-default)] bg-[var(--vly-world)] font-mono text-xs">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-3 py-1.5">
        <div role="tablist" aria-label="Saída do Web Studio" className="flex items-center gap-2">
          <button
            role="tab"
            aria-selected={activeTab === "console"}
            onClick={() => setActiveTab("console")}
            className={`vly-interactive flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ${
              activeTab === "console" ? "bg-[var(--vly-info)]/15 text-[var(--vly-info)] font-semibold" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
            }`}
          >
            <Terminal size={12} />
            Preview Console ({logs.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "build"}
            onClick={() => setActiveTab("build")}
            className={`vly-interactive flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ${
              activeTab === "build" ? "bg-[var(--vly-info)]/15 text-[var(--vly-info)] font-semibold" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
            }`}
          >
            <Info size={12} />
            Build Logs ({buildLogs.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "problems"}
            onClick={() => setActiveTab("problems")}
            className={`vly-interactive flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ${
              activeTab === "problems" ? "bg-[var(--vly-info)]/15 text-[var(--vly-info)] font-semibold" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
            }`}
          >
            <AlertCircle size={12} className={buildErrors.length > 0 ? "text-[var(--vly-danger)]" : ""} />
            Problemas ({buildErrors.length})
          </button>
        </div>

        {activeTab === "console" && (
          <button
            onClick={handleClear}
            className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-secondary)]"
            title="Limpar Console"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {activeTab === "console" && (
          logs.length === 0 ? (
            <StatePanel tone="empty" title="Console limpo" description="As mensagens do preview aparecerão aqui." />
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2 p-1 rounded text-[11px] ${
                  log.level === "error"
                    ? "bg-[var(--vly-danger)]/10 text-[var(--vly-danger)]"
                    : log.level === "warn"
                    ? "bg-[var(--vly-warning)]/10 text-[var(--vly-warning)]"
                    : "text-[var(--vly-text-secondary)]"
                }`}
              >
                {getLogIcon(log.level)}
                <span className="text-[10px] text-[var(--vly-text-muted)]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
                {log.sourceFile && (
                    <span className="text-[10px] text-[var(--vly-text-muted)]">
                    {log.sourceFile}:{log.line}
                  </span>
                )}
              </div>
            ))
          )
        )}

        {activeTab === "build" && (
          buildLogs.length === 0 ? (
            <StatePanel tone="empty" title="Sem logs de build" description="Execute um Build no estúdio para registrar a saída." />
          ) : (
            buildLogs.map((bLog, i) => (
              <div key={i} className="text-[11px] leading-5 text-[var(--vly-text-secondary)]">
                {bLog}
              </div>
            ))
          )
        )}

        {activeTab === "problems" && (
          buildErrors.length === 0 ? (
            <div className="flex items-center gap-1.5 p-2 italic text-[var(--vly-success)]/80">
              <span>Zero problemas detectados.</span>
            </div>
          ) : (
            buildErrors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 rounded border border-[var(--vly-border-danger)] bg-[var(--vly-danger)]/10 p-1.5 text-[11px] text-[var(--vly-danger)]">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span className="whitespace-pre-wrap">{err}</span>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
