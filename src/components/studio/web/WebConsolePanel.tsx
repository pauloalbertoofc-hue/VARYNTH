"use client";

import React, { useState, useEffect } from "react";
import { WebConsoleLogEntry } from "@/lib/studio/web/types";
import { webPreviewBridge } from "@/lib/studio/web/web-preview-bridge";
import { Terminal, AlertTriangle, AlertCircle, Info, Trash2 } from "lucide-react";

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
        return <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />;
      case "warn":
        return <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />;
      default:
        return <Info size={12} className="text-blue-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="h-44 flex flex-col bg-[#090a13] border-t border-[#1a1c30] text-xs font-mono select-text">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f1020] border-b border-[#18192c]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("console")}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition ${
              activeTab === "console" ? "bg-blue-600/20 text-blue-300 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Terminal size={12} />
            Preview Console ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab("build")}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition ${
              activeTab === "build" ? "bg-blue-600/20 text-blue-300 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Info size={12} />
            Build Logs ({buildLogs.length})
          </button>

          <button
            onClick={() => setActiveTab("problems")}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition ${
              activeTab === "problems" ? "bg-blue-600/20 text-blue-300 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            <AlertCircle size={12} className={buildErrors.length > 0 ? "text-red-400" : ""} />
            Problemas ({buildErrors.length})
          </button>
        </div>

        {activeTab === "console" && (
          <button
            onClick={handleClear}
            className="p-1 text-slate-500 hover:text-slate-300 transition rounded"
            title="Limpar Console"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeTab === "console" && (
          logs.length === 0 ? (
            <div className="text-slate-600 italic p-2">Nenhuma mensagem registrada no console.</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2 p-1 rounded text-[11px] ${
                  log.level === "error"
                    ? "bg-red-500/10 text-red-300"
                    : log.level === "warn"
                    ? "bg-amber-500/10 text-amber-300"
                    : "text-slate-300"
                }`}
              >
                {getLogIcon(log.level)}
                <span className="text-slate-500 text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
                {log.sourceFile && (
                  <span className="text-[10px] text-slate-500">
                    {log.sourceFile}:{log.line}
                  </span>
                )}
              </div>
            ))
          )
        )}

        {activeTab === "build" && (
          buildLogs.length === 0 ? (
            <div className="text-slate-600 italic p-2">Nenhum log de build disponível. Execute um Build no estúdio.</div>
          ) : (
            buildLogs.map((bLog, i) => (
              <div key={i} className="text-slate-300 text-[11px] leading-5">
                {bLog}
              </div>
            ))
          )
        )}

        {activeTab === "problems" && (
          buildErrors.length === 0 ? (
            <div className="text-emerald-400/80 italic p-2 flex items-center gap-1.5">
              <span>Zero problemas detectados.</span>
            </div>
          ) : (
            buildErrors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 p-1.5 bg-red-500/10 border border-red-500/20 rounded text-red-300 text-[11px]">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap">{err}</span>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}

