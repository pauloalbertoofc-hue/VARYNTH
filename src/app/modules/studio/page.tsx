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
import { DocumentItem, DocumentSaveState, DocumentTemplate } from "@/lib/studio/document/types";

// Web Studio Imports
import { WebFileExplorer } from "@/components/studio/web/WebFileExplorer";
import { WebCodeEditor } from "@/components/studio/web/WebCodeEditor";
import { WebPreviewFrame } from "@/components/studio/web/WebPreviewFrame";
import { WebConsolePanel } from "@/components/studio/web/WebConsolePanel";
import { WebMultiFileSuggestionModal } from "@/components/studio/web/WebMultiFileSuggestionModal";
import { WebExportModal } from "@/components/studio/web/WebExportModal";
import { WebTemplatesModal } from "@/components/studio/web/WebTemplatesModal";
import { webService } from "@/lib/studio/web/web-service";
import { webBuildEngine } from "@/lib/studio/web/web-build-engine";
import { athenaWebActions } from "@/lib/studio/web/athena-web-actions";
import { WebsiteItem, WebFileItem } from "@/lib/studio/web/types";
import { WebTemplate } from "@/lib/studio/web/web-templates";

import {
  FileText,
  Globe,
  Plus,
  Upload,
  BookOpen,
  Sparkles,
  Layers,
  ArrowRight,
  Play,
  RotateCw,
  Code2,
} from "lucide-react";

export default function StudioPage() {
  const [activeStudio, setActiveStudio] = useState<"DOCUMENT" | "WEB">("DOCUMENT");

  // Document Studio State
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [allDocs, setAllDocs] = useState<DocumentItem[]>([]);
  const [docViewMode, setDocViewMode] = useState<"EDIT" | "PREVIEW" | "SPLIT">("SPLIT");
  const [docSidebarTab, setDocSidebarTab] = useState<"OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA">("OUTLINE");
  const [docSaveState, setDocSaveState] = useState<DocumentSaveState>("SAVED");
  const [isDocExportOpen, setIsDocExportOpen] = useState(false);
  const [isDocTemplateOpen, setIsDocTemplateOpen] = useState(false);

  // Web Studio State
  const [activeWebsite, setActiveWebsite] = useState<WebsiteItem | null>(null);
  const [allWebsites, setAllWebsites] = useState<WebsiteItem[]>([]);
  const [activeWebFile, setActiveWebFile] = useState<WebFileItem | undefined>(undefined);
  const [webViewMode, setWebViewMode] = useState<"EDIT" | "PREVIEW" | "SPLIT">("SPLIT");
  const [webSidebarTab, setWebSidebarTab] = useState<"OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA">("OUTLINE");
  const [webSaveState, setWebSaveState] = useState<DocumentSaveState>("SAVED");
  const [isWebExportOpen, setIsWebExportOpen] = useState(false);
  const [isWebTemplateOpen, setIsWebTemplateOpen] = useState(false);
  const [isWebChangeSetOpen, setIsWebChangeSetOpen] = useState(false);
  const [webBuildLogs, setWebBuildLogs] = useState<string[]>([]);
  const [webBuildErrors, setWebBuildErrors] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  // Athena interaction in studio
  const [athenaPrompt, setAthenaPrompt] = useState("");
  const [athenaHistory, setAthenaHistory] = useState<Array<{ sender: "USER" | "ATHENA"; text: string }>>([
    { sender: "ATHENA", text: "Olá! Sou a Athena. Posso sugerir melhorias de código, reescritas e analisar builds." },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const webImportInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setAllDocs(documentService.listDocuments());
    setAllWebsites(webService.listWebsites());
  };

  // --- Document Studio Handlers ---
  const handleDocContentChange = (newContent: string) => {
    if (!activeDoc) return;
    setActiveDoc((prev) => (prev ? { ...prev, content: newContent } : null));
    setDocSaveState("SAVING");

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await documentService.saveDocumentContent(activeDoc.artifact.id, newContent, {}, "USER");
        if (res.success) {
          setDocSaveState("SAVED");
          loadData();
        } else {
          setDocSaveState("SAVE_FAILED");
        }
      } catch (err) {
        setDocSaveState("SAVE_FAILED");
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
      loadData();
    }
  };

  // --- Web Studio Handlers ---
  const handleSelectWebsite = (ws: WebsiteItem) => {
    setActiveWebsite(ws);
    const entry = ws.files.find((f) => f.path === "index.html" || f.isEntry) || ws.files[0];
    setActiveWebFile(entry);
  };

  const handleWebFileContentChange = (path: string, newContent: string) => {
    if (!activeWebsite) return;
    const updatedFiles = activeWebsite.files.map((f) => (f.path === path ? { ...f, content: newContent } : f));
    setActiveWebsite({ ...activeWebsite, files: updatedFiles });
    if (activeWebFile && activeWebFile.path === path) {
      setActiveWebFile({ ...activeWebFile, content: newContent });
    }

    setWebSaveState("SAVING");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      const res = await webService.saveFiles(activeWebsite.artifact.id, updatedFiles, "USER");
      if (res.success) {
        setWebSaveState("SAVED");
        loadData();
      } else {
        setWebSaveState("SAVE_FAILED");
      }
    }, 800);
  };

  const handleCreateNewWebsite = async (template: WebTemplate, name: string) => {
    const res = await webService.createWebsite({
      name,
      templateId: template.id,
      actor: "USER",
    });

    if (res.success && res.website) {
      handleSelectWebsite(res.website);
      loadData();
    }
  };

  const handleRunBuild = async () => {
    if (!activeWebsite) return;
    setIsBuilding(true);
    setWebBuildLogs(["[WebStudio] Iniciando build através do JobManager e SandboxRuntime..."]);
    setWebBuildErrors([]);

    const res = await webBuildEngine.buildWebsite(
      activeWebsite.artifact.id,
      activeWebsite.files,
      activeWebsite.metadata,
      { actor: "USER" }
    );

    setWebBuildLogs(res.logs);
    setWebBuildErrors(res.errors);
    setIsBuilding(false);
    loadData();
  };

  // -------------------------------------------------------------
  // HUB VIEW (When no workspace is active)
  // -------------------------------------------------------------
  if (!activeDoc && !activeWebsite) {
    return (
      <PageLayout
        title="VARYNTH Studios"
        subtitle="Suíte criativa integrada sobre o Universal Artifact System"
      >
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
          {/* Studio Selector Tabs */}
          <div className="flex items-center gap-3 border-b border-[#1c1d32] pb-3">
            <button
              onClick={() => setActiveStudio("DOCUMENT")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "DOCUMENT"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <FileText size={16} />
              Document Studio (Studio 1)
            </button>

            <button
              onClick={() => setActiveStudio("WEB")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "WEB"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <Globe size={16} />
              Web Studio (Studio 2)
            </button>
          </div>

          {/* DOCUMENT STUDIO HUB */}
          {activeStudio === "DOCUMENT" && (
            <>
              <div className="p-6 bg-gradient-to-r from-blue-950/40 via-[#10132a] to-[#0c0d18] border border-blue-500/20 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-blue-400" size={22} />
                    Document Studio
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl">
                    Crie e versione monografias, pareceres, artigos acadêmicos e roteiros de cena com assistência da Athena e exportação em Markdown, HTML e PDF.
                  </p>
                </div>
                <button
                  onClick={() => setIsDocTemplateOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
                >
                  <Plus size={16} />
                  Novo Documento
                </button>
              </div>

              {/* Recent Documents Grid */}
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-base text-white flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-400" />
                  Documentos Recentes ({allDocs.length})
                </h3>

                {allDocs.length === 0 ? (
                  <div className="p-12 text-center bg-[#0d0d16] border border-[#1e1e30] rounded-xl flex flex-col items-center gap-3">
                    <FileText size={36} className="text-slate-600" />
                    <p className="text-sm text-slate-400">Nenhum documento criado ainda.</p>
                    <button
                      onClick={() => setIsDocTemplateOpen(true)}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
                    >
                      Criar Primeiro Documento
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allDocs.map((doc) => (
                      <div
                        key={doc.artifact.id}
                        onClick={() => setActiveDoc(doc)}
                        className="p-5 bg-[#0e0e18] hover:bg-[#131322] border border-[#1e1e30] hover:border-blue-500/40 rounded-xl cursor-pointer transition flex flex-col justify-between gap-4 group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
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
                            Abrir <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* WEB STUDIO HUB */}
          {activeStudio === "WEB" && (
            <>
              <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-[#101e28] to-[#0c0d18] border border-emerald-500/20 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Globe className="text-emerald-400" size={22} />
                    Web Studio
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl">
                    Desenvolva, compile em Sandbox isolado e visualize aplicações web completas com proteção total do Core e assistência de código da Athena.
                  </p>
                </div>
                <button
                  onClick={() => setIsWebTemplateOpen(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  <Plus size={16} />
                  Novo Website
                </button>
              </div>

              {/* Recent Websites Grid */}
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-base text-white flex items-center gap-2">
                  <Globe size={18} className="text-emerald-400" />
                  Websites no Ecossistema ({allWebsites.length})
                </h3>

                {allWebsites.length === 0 ? (
                  <div className="p-12 text-center bg-[#0d0d16] border border-[#1e1e30] rounded-xl flex flex-col items-center gap-3">
                    <Globe size={36} className="text-slate-600" />
                    <p className="text-sm text-slate-400">Nenhum website criado ainda.</p>
                    <button
                      onClick={() => setIsWebTemplateOpen(true)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium"
                    >
                      Criar Primeiro Website
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allWebsites.map((ws) => (
                      <div
                        key={ws.artifact.id}
                        onClick={() => handleSelectWebsite(ws)}
                        className="p-5 bg-[#0e0e18] hover:bg-[#111622] border border-[#1e1e30] hover:border-emerald-500/40 rounded-xl cursor-pointer transition flex flex-col justify-between gap-4 group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {ws.metadata.framework || "STATIC"}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              v{ws.artifact.versions?.length || 1}.0
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white mt-3 group-hover:text-emerald-300 transition line-clamp-1">
                            {ws.artifact.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {ws.artifact.description || `${ws.files.length} arquivos fonte`}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#1a1a2a] flex items-center justify-between text-xs text-slate-500">
                          <span>{ws.files.length} arquivos</span>
                          <span className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition">
                            Abrir Web Studio <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DocumentTemplatesModal
          isOpen={isDocTemplateOpen}
          onClose={() => setIsDocTemplateOpen(false)}
          onSelectTemplate={handleCreateNewDocument}
        />

        <WebTemplatesModal
          isOpen={isWebTemplateOpen}
          onClose={() => setIsWebTemplateOpen(false)}
          onSelectTemplate={handleCreateNewWebsite}
        />
      </PageLayout>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE DOCUMENT STUDIO WORKSPACE
  // -------------------------------------------------------------
  if (activeDoc) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <StudioShell
          title={activeDoc.artifact.name}
          subtitle={activeDoc.metadata.documentType}
          saveState={docSaveState}
          viewMode={docViewMode}
          onViewModeChange={setDocViewMode}
          activeSidebarTab={docSidebarTab}
          onSidebarTabChange={setDocSidebarTab}
          onCreateVersion={async () => {
            const label = prompt("Descrição da nova versão:", `Versão manual v${(activeDoc.artifact.versions?.length || 0) + 1}`) || "Versão manual";
            const res = await documentService.createManualVersion(activeDoc.artifact.id, label, "USER");
            if (res.success) {
              const ref = documentService.getDocument(activeDoc.artifact.id);
              if (ref) setActiveDoc(ref);
            }
          }}
          onExport={() => setIsDocExportOpen(true)}
          onDelete={() => {
            if (confirm("Mover este documento para a Lixeira de 10 dias?")) {
              documentService.saveDocumentContent(activeDoc.artifact.id, activeDoc.content, {}, "USER");
              setActiveDoc(null);
              loadData();
            }
          }}
          wordCount={activeDoc.metadata.wordCount}
          sidebarContent={
            docSidebarTab === "OUTLINE" ? (
              <DocumentOutline outline={activeDoc.metadata.outline || []} />
            ) : docSidebarTab === "VERSIONS" ? (
              <DocumentVersionHistory
                versions={activeDoc.artifact.versions || []}
                currentVersionNumber={`v${activeDoc.artifact.versions?.length || 1}.0`}
                onRestoreVersion={async (vNum) => {
                  const res = await documentService.restoreVersion(activeDoc.artifact.id, vNum, "USER");
                  if (res.success && res.document) setActiveDoc(res.document);
                }}
              />
            ) : docSidebarTab === "ATHENA" ? (
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
              <div className="p-4 text-xs text-slate-500 italic">Nenhum asset vinculado no momento.</div>
            )
          }
          mainContent={
            <>
              {(docViewMode === "EDIT" || docViewMode === "SPLIT") && (
                <div className="flex-1 h-full border-r border-[#1c1c2e]">
                  <DocumentEditor
                    content={activeDoc.content}
                    onChange={handleDocContentChange}
                  />
                </div>
              )}
              {(docViewMode === "PREVIEW" || docViewMode === "SPLIT") && (
                <div className="flex-1 h-full overflow-hidden">
                  <DocumentPreview content={activeDoc.content} />
                </div>
              )}
            </>
          }
        />

        <DocumentExportModal
          isOpen={isDocExportOpen}
          documentTitle={activeDoc.artifact.name}
          onClose={() => setIsDocExportOpen(false)}
          onConfirmExport={(opts) => {
            const exp = documentService.exportDocument(activeDoc.artifact.id, opts);
            const blob = new Blob([exp.content], { type: exp.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = exp.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsDocExportOpen(false);
          }}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE WEB STUDIO WORKSPACE
  // -------------------------------------------------------------
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StudioShell
        title={activeWebsite!.artifact.name}
        subtitle={`Web Studio (${activeWebsite!.metadata.framework})`}
        saveState={webSaveState}
        viewMode={webViewMode}
        onViewModeChange={setWebViewMode}
        activeSidebarTab={webSidebarTab}
        onSidebarTabChange={setWebSidebarTab}
        onCreateVersion={async () => {
          const label = prompt("Descrição da nova versão do website:", `Versão manual v${(activeWebsite!.artifact.versions?.length || 0) + 1}`) || "Versão manual";
          const res = await webService.createManualVersion(activeWebsite!.artifact.id, label, "USER");
          if (res.success) {
            const ref = webService.getWebsite(activeWebsite!.artifact.id);
            if (ref) setActiveWebsite(ref);
          }
        }}
        onExport={() => setIsWebExportOpen(true)}
        onDelete={() => {
          if (confirm("Mover este website para a Lixeira de 10 dias?")) {
            webService.saveFiles(activeWebsite!.artifact.id, activeWebsite!.files, "USER");
            setActiveWebsite(null);
            loadData();
          }
        }}
        extraAction={
          <button
            onClick={handleRunBuild}
            disabled={isBuilding}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
          >
            {isBuilding ? <RotateCw size={13} className="animate-spin" /> : <Play size={13} />}
            {isBuilding ? "Buildando..." : "Executar Build"}
          </button>
        }
        sidebarContent={
          webSidebarTab === "OUTLINE" ? (
            <WebFileExplorer
              files={activeWebsite!.files}
              activeFilePath={activeWebFile?.path}
              onSelectFile={setActiveWebFile}
              onCreateFile={async (path) => {
                const res = await webService.createFile(activeWebsite!.artifact.id, path, "", "USER");
                if (res.success && res.file) {
                  const ref = webService.getWebsite(activeWebsite!.artifact.id);
                  if (ref) {
                    setActiveWebsite(ref);
                    setActiveWebFile(res.file);
                  }
                }
              }}
              onDeleteFile={async (path) => {
                await webService.deleteFile(activeWebsite!.artifact.id, path, "USER");
                const ref = webService.getWebsite(activeWebsite!.artifact.id);
                if (ref) setActiveWebsite(ref);
              }}
              onRenameFile={async (oldP, newP) => {
                await webService.renameFile(activeWebsite!.artifact.id, oldP, newP, "USER");
                const ref = webService.getWebsite(activeWebsite!.artifact.id);
                if (ref) setActiveWebsite(ref);
              }}
            />
          ) : webSidebarTab === "VERSIONS" ? (
            <DocumentVersionHistory
              versions={activeWebsite!.artifact.versions || []}
              currentVersionNumber={`v${activeWebsite!.artifact.versions?.length || 1}.0`}
              onRestoreVersion={async (vNum) => {
                const res = await webService.restoreVersion(activeWebsite!.artifact.id, vNum, "USER");
                if (res.success && res.website) {
                  setActiveWebsite(res.website);
                }
              }}
            />
          ) : webSidebarTab === "ATHENA" ? (
            <div className="p-4 flex flex-col h-full text-xs text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-white pb-2 border-b border-[#1c1d30] mb-3">
                <Sparkles size={14} className="text-amber-400" />
                Athena Web Assistant
              </div>
              <p className="text-slate-400 text-[11px] mb-3">
                Proponha mudanças em múltiplos arquivos ou analise erros de build.
              </p>
              {webService.getPendingChangeSets(activeWebsite!.artifact.id).length > 0 && (
                <button
                  onClick={() => setIsWebChangeSetOpen(true)}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold mb-3 transition"
                >
                  Ver Proposta Multi-Arquivo
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-500 italic">Nenhum asset ou relação vinculado.</div>
          )
        }
        mainContent={
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 flex h-full overflow-hidden">
              {(webViewMode === "EDIT" || webViewMode === "SPLIT") && (
                <div className="flex-1 h-full border-r border-[#1c1c2e]">
                  <WebCodeEditor
                    files={activeWebsite!.files}
                    activeFile={activeWebFile}
                    onContentChange={handleWebFileContentChange}
                    onAskAthenaAboutSelection={(sel, p) => {
                      setWebSidebarTab("ATHENA");
                    }}
                  />
                </div>
              )}
              {(webViewMode === "PREVIEW" || webViewMode === "SPLIT") && (
                <div className="flex-1 h-full overflow-hidden">
                  <WebPreviewFrame
                    websiteId={activeWebsite!.artifact.id}
                    files={activeWebsite!.files}
                  />
                </div>
              )}
            </div>

            {/* Bottom Console Panel */}
            <WebConsolePanel
              previewSessionId={`prev-sess-${activeWebsite!.artifact.id}`}
              buildLogs={webBuildLogs}
              buildErrors={webBuildErrors}
            />
          </div>
        }
      />

      <WebExportModal
        isOpen={isWebExportOpen}
        websiteId={activeWebsite!.artifact.id}
        onClose={() => setIsWebExportOpen(false)}
      />

      <WebMultiFileSuggestionModal
        isOpen={isWebChangeSetOpen}
        changeSets={webService.getPendingChangeSets(activeWebsite!.artifact.id)}
        onAccept={async (csId) => {
          await webService.acceptChangeSet(activeWebsite!.artifact.id, csId);
          setIsWebChangeSetOpen(false);
          const ref = webService.getWebsite(activeWebsite!.artifact.id);
          if (ref) setActiveWebsite(ref);
        }}
        onReject={(csId) => {
          webService.rejectChangeSet(activeWebsite!.artifact.id, csId);
          setIsWebChangeSetOpen(false);
        }}
        onClose={() => setIsWebChangeSetOpen(false)}
      />
    </div>
  );
}
