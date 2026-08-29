"use client";

import { useState } from "react";
import { ProjectFile } from "@/lib/types";
import { File, FileText, Download, Upload, Trash2, ExternalLink, Plus } from "lucide-react";

interface ProjectFilesTabProps {
  projectId: string;
}

const DEFAULT_MOCK_FILES: ProjectFile[] = [
  { id: "f-1", projectId: "proj-varynth", name: "Arquitetura_Varynth_v1.pdf", size: "2.4 MB", type: "PDF", uploadedAt: "2026-08-28" },
  { id: "f-2", projectId: "proj-varynth", name: "wireframes_dashboard.fig", size: "14.8 MB", type: "Figma", uploadedAt: "2026-08-29" },
  { id: "f-3", projectId: "proj-pesquisa-ia", name: "Artigo_Submissao_Final.docx", size: "840 KB", type: "DOCX", uploadedAt: "2026-08-25" },
];

export function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  const [files, setFiles] = useState<ProjectFile[]>(DEFAULT_MOCK_FILES);
  const [isAdding, setIsAdding] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileType, setFileType] = useState("PDF");

  const projectFiles = files.filter((f) => f.projectId === projectId);

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    const newFile: ProjectFile = {
      id: "f-" + Date.now(),
      projectId,
      name: fileName.trim(),
      size: fileSize.trim() || "1.2 MB",
      type: fileType,
      uploadedAt: new Date().toISOString().split("T")[0],
    };

    setFiles([...files, newFile]);
    setFileName("");
    setFileSize("");
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Arquivos & Documentos ({projectFiles.length})
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <Upload size={14} />
          <span>Registrar Arquivo</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAddFile} className="p-4 rounded-xl bg-[#14141f] border border-[#2d2d4a] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Nome do arquivo (ex: Relatorio_Final.pdf)"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
              autoFocus
            />
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="px-2.5 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
            >
              <option value="PDF">PDF</option>
              <option value="DOCX">DOCX</option>
              <option value="ZIP">ZIP / Código</option>
              <option value="IMG">Imagem / Figma</option>
              <option value="XLSX">Planilha / CSV</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors"
            >
              Adicionar
            </button>
          </div>
        </form>
      )}

      {/* File List */}
      <div className="space-y-2">
        {projectFiles.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] text-slate-500 text-xs">
            Nenhum arquivo registrado para este projeto.
          </div>
        ) : (
          projectFiles.map((file) => (
            <div
              key={file.id}
              className="group flex items-center justify-between p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 transition-all duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {file.size} · {file.type} · {file.uploadedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(file.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                  title="Remover arquivo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

