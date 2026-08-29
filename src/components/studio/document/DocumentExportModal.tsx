"use client";

import React, { useState } from "react";
import { DocumentExportOptions } from "@/lib/studio/document/types";
import { X, Download, Printer, Shield, FileText, Code, Globe } from "lucide-react";

interface DocumentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  onConfirmExport: (options: DocumentExportOptions) => void;
}

export function DocumentExportModal({
  isOpen,
  onClose,
  documentTitle,
  onConfirmExport,
}: DocumentExportModalProps) {
  const [format, setFormat] = useState<"MARKDOWN" | "HTML" | "PDF">("MARKDOWN");
  const [profile, setProfile] = useState<"STANDARD" | "PUBLIC_SAFE">("STANDARD");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#10101c] border border-[#222238] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 text-slate-200">
        <div className="flex items-center justify-between pb-2 border-b border-[#1e1e32]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
              <Download size={16} />
            </div>
            <h3 className="font-semibold text-sm text-white">Exportar Documento</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Selecione o formato e o perfil de sanitização para exportar <strong className="text-white">&quot;{documentTitle}&quot;</strong>.
        </p>

        {/* Format Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300">Formato:</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFormat("MARKDOWN")}
              className={`p-2.5 rounded-lg border text-xs flex flex-col items-center gap-1.5 transition ${
                format === "MARKDOWN" ? "bg-blue-600/20 border-blue-500 text-white" : "bg-[#141424] border-[#22223a] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code size={16} className="text-blue-400" />
              <span>Markdown (.md)</span>
            </button>
            <button
              onClick={() => setFormat("HTML")}
              className={`p-2.5 rounded-lg border text-xs flex flex-col items-center gap-1.5 transition ${
                format === "HTML" ? "bg-blue-600/20 border-blue-500 text-white" : "bg-[#141424] border-[#22223a] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe size={16} className="text-emerald-400" />
              <span>HTML (.html)</span>
            </button>
            <button
              onClick={() => setFormat("PDF")}
              className={`p-2.5 rounded-lg border text-xs flex flex-col items-center gap-1.5 transition ${
                format === "PDF" ? "bg-blue-600/20 border-blue-500 text-white" : "bg-[#141424] border-[#22223a] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Printer size={16} className="text-rose-400" />
              <span>PDF / Impressão</span>
            </button>
          </div>
        </div>

        {/* Profile Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300">Perfil de Sanitização:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setProfile("STANDARD")}
              className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition ${
                profile === "STANDARD" ? "bg-blue-600/20 border-blue-500 text-white" : "bg-[#141424] border-[#22223a] text-slate-400"
              }`}
            >
              <FileText size={14} />
              <span>Padrão Completo</span>
            </button>
            <button
              onClick={() => setProfile("PUBLIC_SAFE")}
              className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition ${
                profile === "PUBLIC_SAFE" ? "bg-blue-600/20 border-blue-500 text-white" : "bg-[#141424] border-[#22223a] text-slate-400"
              }`}
            >
              <Shield size={14} className="text-amber-400" />
              <span>Public Safe (Oculta Paths)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e32]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-[#161626] rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirmExport({ format, profile });
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <Download size={14} />
            Gerar Arquivo
          </button>
        </div>
      </div>
    </div>
  );
}

