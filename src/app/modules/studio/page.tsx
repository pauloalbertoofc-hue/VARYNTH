"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { StudioShell } from "@/components/studio/StudioShell";
import { DocumentEditor } from "@/components/studio/document/DocumentEditor";
import { DocumentPreview } from "@/components/studio/document/DocumentPreview";
import { DocumentOutline } from "@/components/studio/document/DocumentOutline";
import { DocumentVersionHistory } from "@/components/studio/document/DocumentVersionHistory";
import { DocumentSuggestionPanel } from "@/components/studio/document/DocumentSuggestionPanel";
import { DocumentExportModal } from "@/components/studio/document/DocumentExportModal";
import { DocumentTemplatesModal } from "@/components/studio/document/DocumentTemplatesModal";
import { documentService } from "@/lib/studio/document/document-service";
import { athenaDocumentActions } from "@/lib/studio/document/athena-document-actions";
import { DocumentItem, DocumentSaveState, DocumentExportOptions, DocumentTemplate } from "@/lib/studio/document/types";
import {
  FileText,
  Plus,
  Upload,
  BookOpen,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Send,
  Trash2,
} from "lucide-react";

export default function StudioPage() {
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [allDocs, setAllDocs] = useState<DocumentItem[]>([]);
  const [viewMode, setViewMode] = useState<"EDIT" | "PREVIEW" | "SPLIT">("SPLIT");
  const [activeSidebarTab, setActiveSidebarTab] = useState<"OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA">("OUTLINE");
  const [saveState, setSaveState] = useState<DocumentSaveState>("SAVED");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  // Athena interaction in studio
  const [athenaPrompt, setAthenaPrompt] = useState("");
  const [athenaHistory, setAthenaHistory] = useState<Array<{ sender: "USER" | "ATHENA"; text: string }>>([
    { sender: "ATHENA", text: "Olá! Sou a Athena. Posso sugerir outlines, reescrever trechos ou criticar seu documento." },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    const docs = documentService.listDocuments();
    setAllDocs(docs);
    if (!activeDoc && docs.length > 0) {
      // Don't auto-open unless user clicks, keep home view
    }
  };

  const handleSelectDoc = (doc: DocumentItem) => {
    setActiveDoc(doc);
    setSaveState("SAVED");
  };

  const handleContentChange = (newContent: string) => {
    if (!activeDoc) return;
    setSaveState("SAVING");
    setActiveDoc({ ...activeDoc, content: newContent });

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await documentService.saveDocumentContent(activeDoc.artifact.id, newContent, {}, "USER");
        if (res.success && res.document) {
          setActiveDoc(res.document);
          setSaveState("SAVED");
          loadDocuments();
        } else {
          setSaveState("SAVE_FAILED");
        }
      } catch {
        setSaveState("SAVE_FAILED");
      }
    }, 800);
  };

  const handleCreateNewDocument = async (template: DocumentTemplate, title: string) => {
    const res = await documentService.createDocument({
      title,
      templateId: template.id,
      documentType: template.type,
      createdBy: "USER",
    });

    if (res.success && res.document) {
      setActiveDoc(res.document);
      loadDocuments();
    }
  };

  const handleCreateVersion = async () => {
    if (!activeDoc) return;
    const label = prompt("Descrição da nova versão (opcional):", `Versão manual v${(activeDoc.artifact.versions?.length || 0) + 1}`) || "Versão manual";
    const res = await documentService.createManualVersion(activeDoc.artifact.id, label, "USER");
    if (res.success) {
      const refreshed = documentService.getDocument(activeDoc.artifact.id);
      if (refreshed) setActiveDoc(refreshed);
    }
  };

  const handleRestoreVersion = async (versionNumber: string) => {
    if (!activeDoc) return;
    if (confirm(`Restaurar versão ${versionNumber}? O princípio Alex criará uma nova versão preservando o histórico intermediário.`)) {
      const res = await documentService.restoreVersion(activeDoc.artifact.id, versionNumber, "USER");
      if (res.success && res.document) {
        setActiveDoc(res.document);
      }
    }
  };

  const handleExportConfirm = (options: DocumentExportOptions) => {
    if (!activeDoc) return;
    const exported = documentService.exportDocument(activeDoc.artifact.id, options);

    if (options.format === "PDF") {
      // Print window
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(exported.content);
        win.document.close();
        win.print();
      }
    } else {
      // Download blob
      const blob = new Blob([exported.content], { type: exported.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exported.fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await documentService.importMarkdown(file.name, content, "USER");
      if (res.success && res.document) {
        setActiveDoc(res.document);
        loadDocuments();
      }
    };
    reader.readAsText(file);
  };

  const handleAskAthena = (textToAsk?: string) => {
    const query = textToAsk || athenaPrompt;
    if (!query.trim() || !activeDoc) return;

    setAthenaHistory((prev) => [...prev, { sender: "USER", text: query }]);
    setAthenaPrompt("");

    setTimeout(async () => {
      let athenaReply = "";
      if (query.toLowerCase().includes("outline") || query.toLowerCase().includes("estrutura")) {
        const outline = athenaDocumentActions.suggestOutline(activeDoc.artifact.name, activeDoc.metadata.documentType);
        athenaReply = `Sugestão de estrutura para ${activeDoc.artifact.name}:\n\n` + outline.join("\n");
      } else if (query.toLowerCase().includes("critique") || query.toLowerCase().includes("criticar") || query.toLowerCase().includes("analisar")) {
        const critique = athenaDocumentActions.critiqueDocument(activeDoc.content);
        athenaReply = `Análise Crítica do Documento:\n\n**Pontos Fortes:**\n- ${critique.strengths.join("\n- ")}\n\n**Recomendações:**\n- ${critique.recommendations.join("\n- ")}`;
      } else {
        const rewritten = athenaDocumentActions.rewriteSelection(activeDoc.content.slice(0, 100), query);
        const sug = documentService.suggestChange(activeDoc.artifact.id, activeDoc.content.slice(0, 100), rewritten, query, "ATHENA");
        athenaReply = `Criei uma sugestão de alteração no painel de sugestões: "${rewritten.slice(0, 80)}..." Você pode aceitá-la ou rejeitá-la.`;
      }

      setAthenaHistory((prev) => [...prev, { sender: "ATHENA", text: athenaReply }]);
    }, 400);
  };

  // If viewing home hub
  if (!activeDoc) {
    return (
      <PageLayout title="Document Studio" subtitle="Estúdio de Autoria Estruturada & Tratados">
        <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in">
          {/* Header Action Banner */}
          <div className="p-6 bg-gradient-to-r from-blue-900/30 via-[#101020] to-[#0c0c16] border border-blue-500/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileText size={30} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Document Studio V1</h2>
                <p className="text-sm text-slate-400 mt-1 max-w-xl">
                  Crie, versione e exporte tratados, monografias, relatórios e roteiros com suporte integral da Athena e o Universal Artifact System.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#161626] hover:bg-[#202034] text-slate-300 rounded-xl text-sm font-medium flex items-center gap-2 border border-[#24243a] transition"
              >
                <Upload size={16} />
                Importar .md
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                onClick={() => setIsTemplateOpen(true)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
              >
                <Plus size={16} />
                Novo Documento
              </button>
            </div>
          </div>

          {/* Recent Documents Grid */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-white flex items-center gap-2">
                <BookOpen size={18} className="text-blue-400" />
                Documentos Recentes ({allDocs.length})
              </h3>
            </div>

            {allDocs.length === 0 ? (
              <div className="p-12 text-center bg-[#0d0d16] border border-[#1e1e30] rounded-xl flex flex-col items-center gap-3">
                <FileText size={36} className="text-slate-600" />
                <p className="text-sm text-slate-400">Nenhum documento criado ainda.</p>
                <button
                  onClick={() => setIsTemplateOpen(true)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
                >
                  Criar Primeiro Documento
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allDocs.map((doc) => (
                  <div
                    key={doc.artifact.id}
                    onClick={() => handleSelectDoc(doc)}
                    className="p-5 bg-[#0e0e18] hover:bg-[#131322] border border-[#1e1e30] hover:border-blue-500/40 rounded-xl cursor-pointer transition flex flex-col justify-between gap-4 group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {doc.metadata.documentType || "DOCUMENT"}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          v{doc.artifact.versions?.length || 1}.0
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-white mt-3 group-hover:text-blue-300 transition line-clamp-1">
                        {doc.artifact.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {doc.artifact.description || doc.content.slice(0, 100)}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#1a1a2a] flex items-center justify-between text-xs text-slate-500">
                      <span>{doc.metadata.wordCount || 0} palavras</span>
                      <span className="flex items-center gap-1 text-blue-400 group-hover:translate-x-1 transition">
                        Abrir Studio <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DocumentTemplatesModal
          isOpen={isTemplateOpen}
          onClose={() => setIsTemplateOpen(false)}
          onSelectTemplate={handleCreateNewDocument}
        />
      </PageLayout>
    );
  }

  // Active Studio Workspace
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StudioShell
        title={activeDoc.artifact.name}
        subtitle={activeDoc.metadata.documentType}
        saveState={saveState}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activeSidebarTab={activeSidebarTab}
        onSidebarTabChange={setActiveSidebarTab}
        onCreateVersion={handleCreateVersion}
        onExport={() => setIsExportOpen(true)}
        onDelete={() => {
          if (confirm("Mover este documento para a Lixeira de 10 dias?")) {
            documentService.saveDocumentContent(activeDoc.artifact.id, activeDoc.content, {}, "USER");
            setActiveDoc(null);
            loadDocuments();
          }
        }}
        wordCount={activeDoc.metadata.wordCount}
        sidebarContent={
          activeSidebarTab === "OUTLINE" ? (
            <DocumentOutline outline={activeDoc.metadata.outline || []} />
          ) : activeSidebarTab === "VERSIONS" ? (
            <DocumentVersionHistory
              versions={activeDoc.artifact.versions || []}
              currentVersionNumber={`v${activeDoc.artifact.versions?.length || 1}.0`}
              onRestoreVersion={handleRestoreVersion}
            />
          ) : activeSidebarTab === "ATHENA" ? (
            <DocumentSuggestionPanel
              suggestions={documentService.getSuggestions(activeDoc.artifact.id)}
              onAccept={async (id) => {
                await documentService.acceptSuggestion(activeDoc.artifact.id, id);
                const ref = documentService.getDocument(activeDoc.artifact.id);
                if (ref) setActiveDoc(ref);
              }}
              onReject={(id) => {
                documentService.rejectSuggestion(activeDoc.artifact.id, id);
                const ref = documentService.getDocument(activeDoc.artifact.id);
                if (ref) setActiveDoc(ref);
              }}
            />
          ) : (
            <div className="p-4 text-xs text-slate-500 italic">
              Nenhum asset vinculado no momento.
            </div>
          )
        }
        mainContent={
          <>
            {(viewMode === "EDIT" || viewMode === "SPLIT") && (
              <div className="flex-1 h-full border-r border-[#1c1c2e]">
                <DocumentEditor
                  content={activeDoc.content}
                  onChange={handleContentChange}
                  onAskAthenaAboutSelection={(sel) => {
                    setActiveSidebarTab("ATHENA");
                    handleAskAthena(`Reescrever com rigor: "${sel}"`);
                  }}
                />
              </div>
            )}
            {(viewMode === "PREVIEW" || viewMode === "SPLIT") && (
              <div className="flex-1 h-full overflow-hidden">
                <DocumentPreview content={activeDoc.content} />
              </div>
            )}
          </>
        }
        bottomContent={
          <div className="flex items-center gap-3">
            <div className="p-1 bg-amber-500/10 rounded text-amber-400">
              <Sparkles size={16} />
            </div>
            <input
              type="text"
              value={athenaPrompt}
              onChange={(e) => setAthenaPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskAthena()}
              placeholder="Peça à Athena: 'Sugira uma introdução', 'Critique o documento', 'Melhore o vocabulário'..."
              className="flex-1 bg-[#121220] border border-[#202034] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleAskAthena()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
            >
              <Send size={13} />
              <span>Enviar</span>
            </button>
          </div>
        }
      />

      <DocumentExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        documentTitle={activeDoc.artifact.name}
        onConfirmExport={handleExportConfirm}
      />
    </div>
  );
}
