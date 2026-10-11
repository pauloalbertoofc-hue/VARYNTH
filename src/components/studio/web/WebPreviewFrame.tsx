"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { WebFileItem } from "@/lib/studio/web/types";
import { webPreviewBridge } from "@/lib/studio/web/web-preview-bridge";
import { Monitor, Tablet, Smartphone, RotateCw, ShieldCheck, ShieldAlert, ExternalLink } from "lucide-react";

interface WebPreviewFrameProps {
  websiteId: string;
  files: WebFileItem[];
  bundledHtml?: string;
  onRefresh?: () => void;
}

export function WebPreviewFrame({
  websiteId,
  files,
  bundledHtml,
  onRefresh,
}: WebPreviewFrameProps) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [key, setKey] = useState(0);
  const [isAbuseDetected, setIsAbuseDetected] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 1. Generate authenticated preview session credentials
  const session = useMemo(() => {
    return webPreviewBridge.createPreviewSession(websiteId);
  }, [websiteId]);

  // 2. Build the self-contained sandboxed HTML document
  const previewHtml = useMemo(() => {
    let rawHtml = bundledHtml;

    if (!rawHtml) {
      const entry = files.find((f) => f.path === "index.html" || f.isEntry);
      if (!entry) {
        return `<!DOCTYPE html><html><body style="background:#0b0c16;color:#94a3b8;font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0;"><p>Nenhum arquivo <code>index.html</code> encontrado para renderizar o preview.</p></body></html>`;
      }

      rawHtml = entry.content;
      const cssFiles = files.filter((f) => f.language === "css" || f.path.endsWith(".css"));
      const jsFiles = files.filter((f) => (f.language === "javascript" || f.path.endsWith(".js")) && f.path !== "index.html");

      // Injeta CSS
      if (cssFiles.length > 0) {
        const combinedCss = cssFiles.map((c) => `/* ${c.path} */\n${c.content}`).join("\n\n");
        if (rawHtml.includes("</head>")) {
          rawHtml = rawHtml.replace("</head>", `<style>\n${combinedCss}\n</style>\n</head>`);
        } else {
          rawHtml = `<style>\n${combinedCss}\n</style>\n` + rawHtml;
        }
      }

      // Injeta JS
      if (jsFiles.length > 0) {
        const combinedJs = jsFiles.map((j) => `// ${j.path}\n${j.content}`).join("\n\n");
        if (rawHtml.includes("</body>")) {
          rawHtml = rawHtml.replace("</body>", `<script>\n${combinedJs}\n</script>\n</body>`);
        } else {
          rawHtml = rawHtml + `\n<script>\n${combinedJs}\n</script>`;
        }
      }
    }

    // 3. Inject authenticated preview bridge script
    const bridgeScript = webPreviewBridge.generateClientBridgeScript(session);
    if (rawHtml.includes("<head>")) {
      return rawHtml.replace("<head>", `<head>\n${bridgeScript}`);
    } else {
      return `${bridgeScript}\n${rawHtml}`;
    }
  }, [bundledHtml, files, session]);

  // 4. Listen to postMessage from sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const result = webPreviewBridge.receiveMessage(event.data, event.origin);
      if (!result.valid && result.rejectedReason?.includes("PREVIEW_PROTOCOL_ABUSE")) {
        setIsAbuseDetected(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [session]);

  const handleReload = () => {
    setIsAbuseDetected(false);
    setKey((prev) => prev + 1);
    if (onRefresh) onRefresh();
  };

  const getViewportWidth = () => {
    switch (viewport) {
      case "mobile":
        return "375px";
      case "tablet":
        return "768px";
      default:
        return "100%";
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--vly-world)]">
      {/* Viewport & Controls Header */}
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Viewport do preview" className="flex items-center rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-0.5">
            <button
              aria-pressed={viewport === "desktop"}
              onClick={() => setViewport("desktop")}
              className={`p-1.5 rounded transition ${
                viewport === "desktop" ? "bg-[var(--vly-info)] text-[var(--vly-text-on-accent)]" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
              }`}
              title="Desktop (100%)"
            >
              <Monitor size={14} />
            </button>
            <button
              aria-pressed={viewport === "tablet"}
              onClick={() => setViewport("tablet")}
              className={`p-1.5 rounded transition ${
                viewport === "tablet" ? "bg-[var(--vly-info)] text-[var(--vly-text-on-accent)]" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
              }`}
              title="Tablet (768px)"
            >
              <Tablet size={14} />
            </button>
            <button
              aria-pressed={viewport === "mobile"}
              onClick={() => setViewport("mobile")}
              className={`p-1.5 rounded transition ${
                viewport === "mobile" ? "bg-[var(--vly-info)] text-[var(--vly-text-on-accent)]" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
              }`}
              title="Mobile (375px)"
            >
              <Smartphone size={14} />
            </button>
          </div>

          <span className="rounded bg-[var(--vly-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--vly-text-muted)]">
            {viewport === "desktop" ? "100% (Fluido)" : viewport === "tablet" ? "768px (Tablet)" : "375px (Mobile)"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isAbuseDetected ? (
            <div role="status" className="flex items-center gap-1.5 rounded border border-[var(--vly-border-danger)] bg-[var(--vly-danger)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--vly-danger)]">
              <ShieldAlert size={13} />
              <span>Abuso de Protocolo (Bloqueado)</span>
            </div>
          ) : (
            <div role="status" className="flex items-center gap-1.5 rounded border border-[var(--vly-border-success)] bg-[var(--vly-success)]/10 px-2 py-0.5 text-[11px] text-[var(--vly-success)]">
              <ShieldCheck size={13} />
              <span>Sandbox: Isolamento Estrito</span>
            </div>
          )}

          <button
            onClick={handleReload}
            className="vly-interactive rounded p-1.5 text-[var(--vly-text-muted)] transition hover:bg-[var(--vly-surface-raised)] hover:text-[var(--vly-text-primary)]"
            title="Recarregar Preview"
          >
            <RotateCw size={13} />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-[var(--vly-world)] p-4">
        {isAbuseDetected ? (
          <div className="vly-enter max-w-md rounded-xl border border-[var(--vly-border-danger)] bg-[var(--vly-surface-raised)] p-8 text-center">
            <ShieldAlert size={36} className="mx-auto mb-3 text-[var(--vly-danger)]" />
            <h3 className="mb-1 text-sm font-bold text-[var(--vly-text-primary)]">Preview Suspenso por Violação</h3>
            <p className="mb-4 text-xs text-[var(--vly-text-muted)]">
              O preview tentou emitir uma taxa anormal de mensagens (flood protection). A sessão foi finalizada por segurança.
            </p>
            <button
              onClick={handleReload}
              className="vly-interactive rounded-lg bg-[var(--vly-accent)] px-4 py-1.5 text-xs font-semibold text-[var(--vly-accent-contrast)]"
            >
              Reiniciar Sessão de Preview
            </button>
          </div>
        ) : (
          <div
            style={{ width: getViewportWidth() }}
            className="vly-enter h-full overflow-hidden rounded-lg border border-[var(--vly-border-strong)] bg-white shadow-[var(--vly-shadow-floating)]"
          >
            <iframe
              key={key}
              ref={iframeRef}
              srcDoc={previewHtml}
              sandbox="allow-scripts"
              title="VARYNTH Sandboxed Web Preview"
              className="w-full h-full border-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
