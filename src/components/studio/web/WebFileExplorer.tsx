"use client";

import React, { useState } from "react";
import { WebFileItem } from "@/lib/studio/web/types";
import { File, FileCode, FileText, FolderPlus, FilePlus, Trash2, Edit2, Check, X } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";

interface WebFileExplorerProps {
  files: WebFileItem[];
  activeFilePath?: string;
  onSelectFile: (file: WebFileItem) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
}

export function WebFileExplorer({
  files,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: WebFileExplorerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    if (newFileName.trim()) {
      onCreateFile(newFileName.trim());
      setNewFileName("");
      setIsCreating(false);
    }
  };

  const handleStartRename = (file: WebFileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPath(file.path);
    setEditName(file.path);
  };

  const handleConfirmRename = (oldPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editName.trim() && editName !== oldPath) {
      onRenameFile(oldPath, editName.trim());
    }
    setEditingPath(null);
  };

  const getFileIcon = (lang: string) => {
    switch (lang) {
      case "html":
        return <FileCode size={14} className="text-[var(--vly-accent)]" />;
      case "css":
        return <FileCode size={14} className="text-[var(--vly-info)]" />;
      case "javascript":
      case "typescript":
        return <FileCode size={14} className="text-[var(--vly-warning)]" />;
      case "json":
        return <FileText size={14} className="text-[var(--vly-warning)]" />;
      default:
        return <File size={14} className="text-[var(--vly-text-muted)]" />;
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--vly-surface)] text-xs text-[var(--vly-text-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">Arquivos</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCreating(true)}
            className="vly-interactive rounded p-1 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
            title="Novo Arquivo"
          >
            <FilePlus size={14} />
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="flex items-center gap-1 border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-2">
          <input
            type="text"
            placeholder="nome-do-arquivo.html"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setIsCreating(false);
            }}
            autoFocus
            className="vly-field flex-1 rounded px-2 py-1 text-xs"
          />
          <button onClick={handleCreate} className="vly-interactive rounded p-1 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-info)] hover:text-[var(--vly-text-on-accent)]">
            <Check size={13} />
          </button>
                  <button onClick={() => setIsCreating(false)} className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:bg-[var(--vly-surface-raised)]">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex-1 space-y-0.5 overflow-y-auto p-1">
        {files.length === 0 && <StatePanel tone="empty" title="Nenhum arquivo" description="Crie o primeiro arquivo do website para começar." action={<button type="button" onClick={() => setIsCreating(true)} className="vly-interactive rounded border border-[var(--vly-border-accent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--vly-accent)]">Novo arquivo</button>} />}
        {files.map((file) => {
          const isActive = file.path === activeFilePath;
          const isEditing = editingPath === file.path;

          return (
            <div
              key={file.id || file.path}
              onClick={() => onSelectFile(file)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectFile(file);
                }
              }}
              role="button"
              tabIndex={0}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                isActive ? "bg-[var(--vly-surface-active)] text-[var(--vly-accent)] font-medium" : "hover:bg-[var(--vly-surface-hover)] text-[var(--vly-text-secondary)]"
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                {getFileIcon(file.language)}
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmRename(file.path, e as any);
                      if (e.key === "Escape") setEditingPath(null);
                    }}
                    autoFocus
                    className="vly-field flex-1 rounded px-1 py-0.5 text-xs outline-none"
                  />
                ) : (
                  <span className="truncate">{file.path}</span>
                )}
              </div>

              <div className="hidden group-hover:flex items-center gap-1 opacity-80">
                {isEditing ? (
                  <button onClick={(e) => handleConfirmRename(file.path, e)} className="vly-interactive p-0.5 hover:text-[var(--vly-text-primary)]">
                    <Check size={12} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={(e) => handleStartRename(file, e)}
                      className="vly-interactive p-0.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-info)]"
                      title="Renomear"
                    >
                      <Edit2 size={12} />
                    </button>
                    {!file.isEntry && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir arquivo ${file.path}?`)) onDeleteFile(file.path);
                        }}
                        className="vly-interactive p-0.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-danger)]"
                        title="Excluir"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
