"use client";

import React, { useState } from "react";
import { WebFileItem } from "@/lib/studio/web/types";
import { File, FileCode, FileText, FolderPlus, FilePlus, Trash2, Edit2, Check, X } from "lucide-react";

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
        return <FileCode size={14} className="text-orange-400" />;
      case "css":
        return <FileCode size={14} className="text-blue-400" />;
      case "javascript":
      case "typescript":
        return <FileCode size={14} className="text-amber-400" />;
      case "json":
        return <FileText size={14} className="text-yellow-400" />;
      default:
        return <File size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0f1a] text-slate-300 text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1c1d30]">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">Arquivos</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 hover:bg-[#1a1b2e] rounded text-slate-400 hover:text-white transition"
            title="Novo Arquivo"
          >
            <FilePlus size={14} />
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="p-2 border-b border-[#1c1d30] flex items-center gap-1 bg-[#131424]">
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
            className="flex-1 px-2 py-1 bg-[#0b0c16] border border-[#2a2c48] rounded text-xs text-white outline-none focus:border-blue-500"
          />
          <button onClick={handleCreate} className="p-1 hover:bg-blue-600 text-slate-300 hover:text-white rounded">
            <Check size={13} />
          </button>
          <button onClick={() => setIsCreating(false)} className="p-1 hover:bg-slate-700 text-slate-400 rounded">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {files.map((file) => {
          const isActive = file.path === activeFilePath;
          const isEditing = editingPath === file.path;

          return (
            <div
              key={file.id || file.path}
              onClick={() => onSelectFile(file)}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                isActive ? "bg-blue-600/20 text-blue-300 font-medium" : "hover:bg-[#151628] text-slate-300"
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
                    className="px-1 py-0.5 bg-[#0b0c16] border border-blue-500 rounded text-xs text-white outline-none flex-1"
                  />
                ) : (
                  <span className="truncate">{file.path}</span>
                )}
              </div>

              <div className="hidden group-hover:flex items-center gap-1 opacity-80">
                {isEditing ? (
                  <button onClick={(e) => handleConfirmRename(file.path, e)} className="p-0.5 hover:text-white">
                    <Check size={12} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={(e) => handleStartRename(file, e)}
                      className="p-0.5 hover:text-blue-400 text-slate-400"
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
                        className="p-0.5 hover:text-red-400 text-slate-400"
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

