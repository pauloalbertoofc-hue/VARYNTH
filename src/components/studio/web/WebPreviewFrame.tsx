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
  }, [websiteId, key]);

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
    <div className="h-full flex flex-col bg-[#080811] overflow-hidden">
      {/* Viewport & Controls Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#101120] border-b border-[#1c1d32] text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#18192e] rounded-lg p-0.5 border border-[#252744]">
            <button
              onClick={() => setViewport("desktop")}
              className={`p-1.5 rounded transition ${
                viewport === "desktop" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              title="Desktop (100%)"
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setViewport("tablet")}
              className={`p-1.5 rounded transition ${
                viewport === "tablet" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              title="Tablet (768px)"
            >
              <Tablet size={14} />
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`p-1.5 rounded transition ${
                viewport === "mobile" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              title="Mobile (375px)"
            >
              <Smartphone size={14} />
            </button>
          </div>

          <span className="font-mono text-[11px] text-slate-500 bg-[#16172b] px-2 py-0.5 rounded">
            {viewport === "desktop" ? "100% (Fluido)" : viewport === "tablet" ? "768px (Tablet)" : "375px (Mobile)"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isAbuseDetected ? (
            <div className="flex items-center gap-1.5 text-red-400 font-semibold text-[11px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
              <ShieldAlert size={13} />
              <span>Abuso de Protocolo (Bloqueado)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <ShieldCheck size={13} />
              <span>Sandbox: Isolamento Estrito</span>
            </div>
          )}

          <button
            onClick={handleReload}
            className="p-1.5 hover:bg-[#1f2038] text-slate-400 hover:text-white rounded transition"
            title="Recarregar Preview"
          >
            <RotateCw size={13} />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 flex justify-center items-center bg-[#07070e] p-4 overflow-hidden">
        {isAbuseDetected ? (
          <div className="p-8 text-center bg-[#131424] border border-red-500/30 rounded-xl max-w-md">
            <ShieldAlert size={36} className="text-red-400 mx-auto mb-3" />
            <h3 className="font-bold text-white text-sm mb-1">Preview Suspenso por Violação</h3>
            <p className="text-xs text-slate-400 mb-4">
              O preview tentou emitir uma taxa anormal de mensagens (flood protection). A sessão foi finalizada por segurança.
            </p>
            <button
              onClick={handleReload}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              Reiniciar Sessão de Preview
            </button>
          </div>
        ) : (
          <div
            style={{ width: getViewportWidth() }}
            className="h-full bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 border border-[#22243e]"
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

