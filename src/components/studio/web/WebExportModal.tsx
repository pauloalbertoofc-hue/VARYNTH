"use client";

import React, { useState } from "react";
import { webService } from "@/lib/studio/web/web-service";
import { Download, FileCode, Package, FileArchive, X, Check } from "lucide-react";

interface WebExportModalProps {
  isOpen: boolean;
  websiteId: string;
  onClose: () => void;
}

export function WebExportModal({
  isOpen,
  websiteId,
  onClose,
}: WebExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<"STANDALONE_HTML" | "SOURCE_ZIP" | "DIST_BUNDLE">("STANDALONE_HTML");
  const [exported, setExported] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    const pkg = webService.exportPackage(websiteId, selectedFormat);
    if (!pkg) return;

    let downloadContent = "";
    let fileName = `${pkg.websiteName.toLowerCase().replace(/\s+/g, "-")}-export`;
    let mimeType = "application/json";

    if (selectedFormat === "STANDALONE_HTML") {
      const entry = pkg.files.find((f) => f.path === "index.html") || pkg.files[0];
      downloadContent = entry?.content || "<!DOCTYPE html><html><body>Empty export</body></html>";
      fileName += ".html";
      mimeType = "text/html";
    } else {
      downloadContent = JSON.stringify(pkg, null, 2);
      fileName += ".json";
    }

    const blob = new Blob([downloadContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => {
      setExported(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121324] border border-[#222442] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-[#1e2038] flex items-center justify-between bg-[#15162a]">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Download size={16} className="text-blue-400" />
            Exportar Website
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Formato de Exportação</label>

            <div
              onClick={() => setSelectedFormat("STANDALONE_HTML")}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                selectedFormat === "STANDALONE_HTML"
                  ? "bg-blue-600/15 border-blue-500/50 text-white"
                  : "bg-[#0c0d18] border-[#1d1f36] text-slate-400 hover:border-slate-600"
              }`}
            >
              <FileCode size={20} className={selectedFormat === "STANDALONE_HTML" ? "text-blue-400" : ""} />
              <div className="flex-1 text-xs">
                <div className="font-semibold text-slate-200">HTML Autossuficiente (.html)</div>
                <div className="text-[11px] text-slate-500">Documento único com CSS/JS incorporados pronto para abrir offline.</div>
              </div>
            </div>

            <div
              onClick={() => setSelectedFormat("DIST_BUNDLE")}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                selectedFormat === "DIST_BUNDLE"
                  ? "bg-blue-600/15 border-blue-500/50 text-white"
                  : "bg-[#0c0d18] border-[#1d1f36] text-slate-400 hover:border-slate-600"
              }`}
            >
              <Package size={20} className={selectedFormat === "DIST_BUNDLE" ? "text-blue-400" : ""} />
              <div className="flex-1 text-xs">
                <div className="font-semibold text-slate-200">Pacote Dist (.json / manifesto)</div>
                <div className="text-[11px] text-slate-500">Estrutura compilada de produção higienizada (PUBLIC-SAFE).</div>
              </div>
            </div>

            <div
              onClick={() => setSelectedFormat("SOURCE_ZIP")}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                selectedFormat === "SOURCE_ZIP"
                  ? "bg-blue-600/15 border-blue-500/50 text-white"
                  : "bg-[#0c0d18] border-[#1d1f36] text-slate-400 hover:border-slate-600"
              }`}
            >
              <FileArchive size={20} className={selectedFormat === "SOURCE_ZIP" ? "text-blue-400" : ""} />
              <div className="flex-1 text-xs">
                <div className="font-semibold text-slate-200">Pacote de Fontes (.json / workspace)</div>
                <div className="text-[11px] text-slate-500">Todos os arquivos fonte brutos para reimportação no VARYNTH.</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1e2038] flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1a1b2e] hover:bg-[#252740] text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 transition flex items-center gap-1.5"
            >
              {exported ? (
                <>
                  <Check size={14} className="text-emerald-300" />
                  Baixado com Sucesso!
                </>
              ) : (
                <>
                  <Download size={14} />
                  Baixar Arquivo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

