"use client";

import { useState } from "react";
import { ProjectFile } from "@/lib/types";
import { FileText, Upload, Trash2 } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

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
        <h3 className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider">
          Arquivos & Documentos ({projectFiles.length})
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--vly-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--vly-accent-contrast)] transition-colors hover:opacity-90"
        >
          <Upload size={14} />
          <span>Registrar Arquivo</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAddFile} className="p-4 rounded-[var(--vly-radius-lg)] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-strong)] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Nome do arquivo (ex: Relatorio_Final.pdf)"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="vly-field sm:col-span-2 px-3 py-2 text-xs"
              autoFocus
            />
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="vly-field px-2.5 py-2 text-xs"
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
              className="px-3 py-1 text-xs text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded bg-[var(--vly-accent)] hover:opacity-90 text-xs font-semibold text-[var(--vly-accent-contrast)] transition-colors"
            >
              Adicionar
            </button>
          </div>
        </form>
      )}

      {/* File List */}
      <div className="space-y-2">
        {projectFiles.length === 0 ? (
          <StatePanel tone="empty" className="bg-[var(--vly-surface)]" title="Nenhum arquivo registrado" description="Registre um arquivo para manter os materiais deste projeto acessíveis no Workspace." action={<button type="button" onClick={() => setIsAdding(true)} className="vly-interactive rounded-[var(--vly-radius-md)] bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><Upload size={13} className="mr-1 inline" />Registrar arquivo</button>} />
        ) : (
          projectFiles.map((file) => (
            <Surface
              key={file.id}
              tone="raised"
              className="group flex items-center justify-between rounded-xl p-3.5 transition-all duration-200 hover:border-[var(--vly-accent)]/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--vly-accent)]/20 bg-[var(--vly-accent)]/10 text-[var(--vly-accent)]">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--vly-text-secondary)] truncate">{file.name}</p>
                  <p className="text-[10px] text-[var(--vly-text-muted)]">
                    {file.size} · {file.type} · {file.uploadedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(file.id)}
                  className="touch-manipulation p-1.5 text-[var(--vly-text-muted)] opacity-70 transition-opacity hover:text-[var(--vly-danger)] sm:opacity-0 sm:group-hover:opacity-100"
                  title="Remover arquivo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </Surface>
          ))
        )}
      </div>
    </div>
  );
}
