"use client";

import { useState, useEffect, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ForgeFile, ForgeLanguage, ForgeExecutionResult, ForgeTemplate } from "@/lib/types";
import {
  Code2,
  Play,
  Save,
  Plus,
  Trash2,
  Download,
  Terminal,
  Copy,
  Sparkles,
  FileCode,
  CheckCircle2,
  FolderKanban,
  FileText,
  Database,
  Layers,
  Braces,
  Eye,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { forgeSandboxBridge } from "@/lib/forge/forge-sandbox-bridge";
import { ForgeExecutionSession } from "@/lib/forge/types";
import { Surface } from "@/components/ui/Surface";

const FORGE_TEMPLATES: ForgeTemplate[] = [
  {
    id: "tpl-1",
    title: "LegalTech Ementas Parser (Python)",
    description: "Script para extrair palavras-chave e identificar decisões do STF/STJ.",
    language: "python",
    filename: "legal_parser.py",
    code: `# LegalTech Parser - VARYNTH
import json

decisao = "REsp 1.798.892/SP. Rel. Min. Nancy Andrighi. Responsabilidade por IA."

def process(text):
    print("Processando jurisprudência...")
    return {"status": "ok", "tags": ["ia", "stj"]}

print(process(decisao))
`,
  },
  {
    id: "tpl-2",
    title: "Athena Agent Custom Tool (TypeScript)",
    description: "Função utilitária assíncrona para estender a inteligência da Athena.",
    language: "typescript",
    filename: "athena_tool.ts",
    code: `// Ferramenta Customizada da Athena AI
interface ToolInput {
  query: string;
  maxResults?: number;
}

function executeTool(input: ToolInput) {
  console.log(\`[ATHENA] Executando query: "\${input.query}"\`);
  const results = [
    { title: "Artigo IA e Hermenêutica", score: 0.98 },
    { title: "Súmula Vinculante 10", score: 0.89 }
  ];
  console.log(\`[ATHENA] \${results.length} resultados encontrados com sucesso.\`);
  return results;
}

executeTool({ query: "autonomia algorítmica" });
`,
  },
  {
    id: "tpl-3",
    title: "Schema Relacional SQLite / PostgreSQL (SQL)",
    description: "Tabelas para gerenciar projetos, notas e tarefas.",
    language: "sql",
    filename: "schema.sql",
    code: `-- Tabela de Teses Jurídicas da Argument Arena
CREATE TABLE IF NOT EXISTS argument_theses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    area TEXT NOT NULL,
    question TEXT NOT NULL,
    conclusion TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

SELECT * FROM argument_theses;
`,
  },
];

const LANG_ICONS: Record<ForgeLanguage, { icon: React.ElementType; color: string; label: string }> = {
  typescript: { icon: FileCode, color: "text-blue-400", label: "TypeScript" },
  javascript: { icon: FileCode, color: "text-yellow-400", label: "JavaScript" },
  python: { icon: Terminal, color: "text-emerald-400", label: "Python" },
  sql: { icon: Database, color: "text-cyan-400", label: "SQL" },
  json: { icon: Braces, color: "text-amber-400", label: "JSON" },
  markdown: { icon: FileText, color: "text-purple-400", label: "Markdown" },
  html: { icon: Code2, color: "text-orange-400", label: "HTML" },
  css: { icon: Layers, color: "text-pink-400", label: "CSS" },
};

export default function ForgeStudioPage() {
  const { forgeFiles, projects, addForgeFile, updateForgeFile, deleteForgeFile } = useVarynthStore();

  const [activeFileId, setActiveFileId] = useState<string>(forgeFiles[0]?.id || "");
  const [editorContent, setEditorContent] = useState<string>("");
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"terminal" | "preview">("terminal");

  const [sandboxSrcDoc, setSandboxSrcDoc] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const activeSessionRef = useRef<ForgeExecutionSession | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sandboxIframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingCodeRef = useRef<string | null>(null);

  // Execution result
  const [execResult, setExecResult] = useState<ForgeExecutionResult>({
    status: "idle",
    logs: ["Forge Studio pronto. Pressione '▶ Executar Código' ou Ctrl+Enter para rodar."],
    executionTimeMs: 0,
  });

  // Listen to postMessage from sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const activeSession = activeSessionRef.current;
      if (!activeSession) return;

      const validation = forgeSandboxBridge.validateMessage(event.data, event.origin, activeSession);
      if (!validation.valid || !validation.envelope) return;

      const env = validation.envelope;

      if (env.type === "SANDBOX_READY") {
        const iframe = sandboxIframeRef.current;
        if (iframe && iframe.contentWindow && pendingCodeRef.current !== null) {
          iframe.contentWindow.postMessage({
            schemaVersion: 1,
            sessionId: activeSession.sessionId,
            channelToken: activeSession.channelToken,
            type: "RUN_REQUEST",
            timestamp: new Date().toISOString(),
            payload: { code: pendingCodeRef.current }
          }, "*");
        }
        return;
      }

      if (env.type === "EXECUTION_RESULT") {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        const logs = env.payload.logs && env.payload.logs.length > 0
          ? [...env.payload.logs]
          : ["[INFO] Execução concluída no sandbox isolado sem chamadas de console."];

        if (env.payload.returnValue !== undefined) {
          logs.push(`[RETURN] => ${env.payload.returnValue}`);
        }

        setExecResult({
          status: "success",
          logs,
          executionTimeMs: env.payload.durationMs || 0,
          timestamp: new Date().toLocaleTimeString(),
        });
        forgeSandboxBridge.invalidateSession(activeSession.sessionId);
        activeSessionRef.current = null;
        pendingCodeRef.current = null;
        setIsExecuting(false);
        setActiveTab("terminal");
      } else if (env.type === "RUNTIME_ERROR") {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setExecResult({
          status: "error",
          logs: env.payload.logs && env.payload.logs.length > 0
            ? env.payload.logs
            : [`[RUNTIME ERROR] ${env.payload.error || "Erro desconhecido em tempo de execução."}`],
          executionTimeMs: env.payload.durationMs || 0,
          timestamp: new Date().toLocaleTimeString(),
        });
        forgeSandboxBridge.invalidateSession(activeSession.sessionId);
        activeSessionRef.current = null;
        pendingCodeRef.current = null;
        setIsExecuting(false);
        setActiveTab("terminal");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // New File Modal
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileLang, setNewFileLang] = useState<ForgeLanguage>("typescript");
  const [newFileProject, setNewFileProject] = useState("");
  const [fileToDelete, setFileToDelete] = useState<ForgeFile | null>(null);

  const activeFile = forgeFiles.find((f) => f.id === activeFileId) || forgeFiles[0];

  // Sync content when switching file
  useEffect(() => {
    const currentFile = forgeFiles.find((file) => file.id === activeFileId) || forgeFiles[0];
    if (currentFile) {
      setEditorContent(currentFile.content);
      setIsSaved(true);
    }
  }, [activeFileId, forgeFiles]);

  // Handle Ctrl+S and Ctrl+Enter shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleSave = () => {
    if (!activeFile) return;
    updateForgeFile(activeFile.id, { content: editorContent });
    setIsSaved(true);
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    let finalName = newFileName.trim();
    if (!finalName.includes(".")) {
      const extMap: Record<ForgeLanguage, string> = {
        typescript: ".ts",
        javascript: ".js",
        python: ".py",
        sql: ".sql",
        json: ".json",
        markdown: ".md",
        html: ".html",
        css: ".css",
      };
      finalName += extMap[newFileLang] || ".txt";
    }

    const created = addForgeFile({
      name: finalName,
      language: newFileLang,
      content: `// ${finalName} — VARYNTH Forge Studio\n\n`,
      projectId: newFileProject || undefined,
    });

    setActiveFileId(created.id);
    setNewFileName("");
    setIsNewFileModalOpen(false);
  };

  const handleUseTemplate = (tpl: ForgeTemplate) => {
    const created = addForgeFile({
      name: tpl.filename,
      language: tpl.language,
      content: tpl.code,
    });
    setActiveFileId(created.id);
  };

  const handleRun = () => {
    if (!activeFile || isExecuting) return;
    handleSave();

    const logs: string[] = [];

    if (activeFile.language === "javascript" || activeFile.language === "typescript") {
      // 1. Invalidate previous session and cancel timers
      if (activeSessionRef.current) {
        forgeSandboxBridge.invalidateSession(activeSessionRef.current.sessionId);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // 2. Transpile/strip TS types for sandbox JS execution
      const cleanJS = editorContent
        .replace(/:\s*(string|number|boolean|any|void|Record<[^>]+>|ToolInput|ModelCost)(\[\])?/g, "")
        .replace(/interface\s+[^{]+\{[^}]+\}/g, "");

      // 3. Create cryptographically randomized session
      const session = forgeSandboxBridge.createSession(4000);
      activeSessionRef.current = session;
      pendingCodeRef.current = cleanJS;
      setIsExecuting(true);

      // 4. Generate immutable static bootstrap document (ZERO raw code concatenation in HTML)
      const doc = forgeSandboxBridge.getStaticBootstrapDocument(session);
      setSandboxSrcDoc(doc);

      // 5. Arm timeout guard (4000ms) for infinite loops (e.g. while(true){})
      timeoutRef.current = setTimeout(() => {
        if (activeSessionRef.current?.sessionId === session.sessionId) {
          forgeSandboxBridge.invalidateSession(session.sessionId);
          activeSessionRef.current = null;
          setSandboxSrcDoc(""); // Reset iframe to terminate hung thread
          setIsExecuting(false);
          setExecResult({
            status: "error",
            logs: [
              "[TIMEOUT ERROR] A execução foi interrompida após 4000ms.",
              "[INFO] Causa provável: Loop infinito (ex: while(true)) ou operação síncrona bloqueante no código.",
              "[SECURITY] O sandbox opaco foi reciclado com sucesso e a interface do VARYNTH permanece protegida e responsiva.",
            ],
            executionTimeMs: 4000,
            timestamp: new Date().toLocaleTimeString(),
          });
          setActiveTab("terminal");
        }
      }, 4000);
    } else if (activeFile.language === "python") {
      // Smart Simulated Python Runner
      setTimeout(() => {
        logs.push("[PYTHON INTERPRETER 3.12] Iniciando execução...");
        if (editorContent.includes("print(")) {
          const printMatches = editorContent.match(/print\(([^)]+)\)/g);
          if (printMatches) {
            printMatches.forEach((m) => {
              const inside = m.replace(/^print\(/, "").replace(/\)$/, "");
              logs.push(`[OUT] ${inside.replace(/["']/g, "")}`);
            });
          }
        } else {
          logs.push("[OUT] Script Python finalizado com código de saída 0.");
        }
        setExecResult({
          status: "success",
          logs,
          executionTimeMs: 42,
          timestamp: new Date().toLocaleTimeString(),
        });
        setActiveTab("terminal");
      }, 150);
    } else if (activeFile.language === "sql") {
      logs.push("[SQL ENGINE] Consulta executada com sucesso.");
      logs.push("[TABELAS AFETADAS] 2 índices criados, 2 tabelas verificadas.");
      setExecResult({
        status: "success",
        logs,
        executionTimeMs: 8,
        timestamp: new Date().toLocaleTimeString(),
      });
      setActiveTab("terminal");
    } else {
      setActiveTab("preview");
    }
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([editorContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lineCount = editorContent.split("\n").length;

  return (
    <PageLayout title="Forge Studio" subtitle="Ambiente de desenvolvimento e code sandbox">
      <div className="vly-enter mx-auto max-w-7xl space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--vly-warning)_16%,transparent)] border border-[color-mix(in_srgb,var(--vly-warning)_30%,transparent)] flex items-center justify-center text-[var(--vly-warning)] glow-accent">
                <Code2 size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--vly-text-primary)] tracking-tight flex items-center gap-2">
                Forge Studio IDE
                <Sparkles size={16} className="text-[var(--vly-warning)]" />
              </h1>
            </div>
            <p className="text-xs text-[var(--vly-text-secondary)] mt-1">
              Ambiente de desenvolvimento web: edite, execute scripts e vincule trechos de código aos seus projetos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewFileModalOpen(true)}
              className="vly-interactive flex items-center gap-1.5 rounded-[var(--vly-radius-md)] border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-3.5 py-1.5 text-xs font-bold text-[var(--vly-text-secondary)]"
            >
              <Plus size={15} />
              <span>Novo Arquivo</span>
            </button>

            <button
              onClick={handleRun}
              className="vly-interactive flex items-center gap-1.5 rounded-[var(--vly-radius-md)] bg-[var(--vly-warning)] px-4 py-2 text-xs font-bold text-[var(--vly-accent-contrast)] shadow-md"
              title="Executar Código (Ctrl + Enter)"
            >
              <Play size={14} className="fill-white" />
              <span>Executar (Ctrl+Enter)</span>
            </button>
          </div>
        </div>

        {/* Main IDE 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[640px]">
          {/* LEFT: File Explorer & Starter Templates (3 cols) */}
          <div className="lg:col-span-3 flex flex-col overflow-hidden rounded-[var(--vly-radius-xl)] border border-[var(--vly-border-default)] bg-[var(--vly-surface)]">
            {/* File Explorer Header */}
            <div className="flex items-center justify-between px-3.5 py-3 bg-[var(--vly-surface)] border-b border-[var(--vly-border-subtle)] text-xs font-bold text-[var(--vly-text-secondary)]">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-[var(--vly-text-secondary)]">
                <FileCode size={13} className="text-[var(--vly-warning)]" />
                <span>Explorador de Arquivos</span>
              </span>
              <span className="text-[10px] text-[var(--vly-text-muted)] font-mono">{forgeFiles.length} arquivos</span>
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {forgeFiles.map((file) => {
                const isSelected = file.id === activeFile?.id;
                const langInfo = LANG_ICONS[file.language] || LANG_ICONS.typescript;
                const Icon = langInfo.icon;

                return (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={cn(
                      "group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all",
                      isSelected
                        ? "bg-[color-mix(in_srgb,var(--vly-warning)_12%,transparent)] text-[var(--vly-warning)] border border-[color-mix(in_srgb,var(--vly-warning)_40%,transparent)] font-semibold"
                        : "text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={14} className={langInfo.color} />
                      <span className="truncate">{file.name}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileToDelete(file);
                      }}
                      className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-danger)] transition-opacity touch-manipulation"
                      title="Mover para a Lixeira (10 dias)"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Templates Quick List */}
            <div className="p-3 bg-[var(--vly-surface)] border-t border-[var(--vly-border-subtle)] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--vly-text-secondary)] block">
                Templates de Código
              </span>
              <div className="space-y-1.5">
                {FORGE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleUseTemplate(tpl)}
                    className="w-full text-left p-2 rounded-lg bg-[var(--vly-surface-raised)] hover:bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)] border border-[var(--vly-border-subtle)] hover:border-[color-mix(in_srgb,var(--vly-warning)_30%,transparent)] text-[11px] text-[var(--vly-text-secondary)] transition-all flex items-center justify-between"
                  >
                    <span className="truncate">{tpl.title}</span>
                    <Plus size={11} className="text-[var(--vly-warning)] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER & RIGHT: Code Editor & Terminal (9 cols) */}
          <div className="lg:col-span-9 flex flex-col overflow-hidden rounded-[var(--vly-radius-xl)] border border-[var(--vly-border-default)] bg-[var(--vly-surface)]">
            {/* Tab Bar & Action Buttons */}
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--vly-surface)] border-b border-[var(--vly-border-subtle)] overflow-x-auto">
              <div className="flex items-center gap-1.5">
                {activeFile && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--vly-surface-raised)] border border-[color-mix(in_srgb,var(--vly-warning)_30%,transparent)] text-xs text-[var(--vly-warning)] font-mono font-medium">
                    <span>{activeFile.name}</span>
                    {!isSaved && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Alterações não salvas" />}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="vly-interactive flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] border border-[var(--vly-border-subtle)] text-xs transition-all"
                  title="Salvar arquivo (Ctrl+S)"
                >
                  <Save size={12} />
                  <span>Salvar</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="vly-interactive p-1 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                  title="Baixar arquivo"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>

            {/* Split Editor and Terminal */}
            <div className="flex-1 grid grid-rows-2 h-full overflow-hidden">
              {/* Top: Code Editor with Line Numbers */}
              <div className="relative flex h-full overflow-hidden bg-[var(--vly-world)]">
                {/* Line Numbers */}
                <div className="w-11 py-3 bg-[var(--vly-surface)] border-r border-[var(--vly-border-subtle)] text-[11px] font-mono text-[var(--vly-text-muted)] text-right pr-2 select-none overflow-hidden leading-relaxed">
                  {Array.from({ length: Math.max(lineCount, 15) }).map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                {/* Editor Textarea */}
                <textarea
                  aria-label="Editor de código Forge"
                  value={editorContent}
                  onChange={(e) => {
                    setEditorContent(e.target.value);
                    setIsSaved(false);
                  }}
                  placeholder="Escreva seu código aqui..."
                  className="flex-1 p-3 bg-transparent font-mono text-xs text-[var(--vly-text-primary)] placeholder:text-[var(--vly-text-muted)] focus:outline-none resize-none leading-relaxed overflow-auto selection:bg-[color-mix(in_srgb,var(--vly-warning)_30%,transparent)]"
                  spellCheck={false}
                />
              </div>

              {/* Bottom: Interactive Output Terminal */}
              <div className="flex flex-col bg-[var(--vly-surface)] border-t border-[var(--vly-border-subtle)] overflow-hidden">
                {/* Console Bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--vly-world)] border-b border-[var(--vly-border-subtle)] text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab("terminal")}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-bold font-mono px-2 py-0.5 rounded",
                          activeTab === "terminal" ? "text-[var(--vly-warning)] bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)]" : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                      )}
                    >
                      <Terminal size={12} />
                      <span>Console Output</span>
                    </button>

                    {activeFile?.language === "markdown" && (
                      <button
                        onClick={() => setActiveTab("preview")}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-bold font-mono px-2 py-0.5 rounded",
                          activeTab === "preview" ? "text-[var(--vly-accent)] bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)]" : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                        )}
                      >
                        <Eye size={12} />
                        <span>Live Preview</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--vly-text-muted)]">
                    {execResult.executionTimeMs > 0 && (
                      <span>Tempo: {execResult.executionTimeMs}ms</span>
                    )}
                    <button
                      onClick={() =>
                        setExecResult({ status: "idle", logs: ["Console limpo."], executionTimeMs: 0 })
                      }
                      className="vly-interactive hover:text-[var(--vly-text-primary)]"
                      title="Limpar console"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Output Logs Stream */}
                <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1 bg-[var(--vly-world)]">
                  {activeTab === "terminal" ? (
                    execResult.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "leading-relaxed",
                          log.startsWith("[ERROR]") || log.startsWith("[RUNTIME ERROR]")
                            ? "text-[var(--vly-danger)] font-bold"
                            : log.startsWith("[WARN]")
                            ? "text-[var(--vly-warning)]"
                            : log.startsWith("[RETURN]")
                            ? "text-[var(--vly-info)] font-bold"
                            : log.startsWith("[INFO]")
                            ? "text-[var(--vly-text-secondary)]"
                            : "text-[var(--vly-success)]"
                        )}
                      >
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="prose prose-invert max-w-none text-xs text-[var(--vly-text-primary)] p-2 whitespace-pre-wrap font-sans">
                      {editorContent}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Novo Arquivo */}
        {isNewFileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <Surface tone="floating" className="w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-3">
                <h2 className="text-sm font-bold text-[var(--vly-text-primary)] flex items-center gap-2">
                  <FileCode size={16} className="text-[var(--vly-warning)]" />
                  <span>Novo Arquivo de Código</span>
                </h2>
                <button onClick={() => setIsNewFileModalOpen(false)} className="text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateFile} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Nome do Arquivo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: process_data.py ou api_client.ts"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="vly-field w-full text-xs"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Linguagem</label>
                  <select
                    value={newFileLang}
                    onChange={(e) => setNewFileLang(e.target.value as ForgeLanguage)}
                    className="vly-field w-full text-xs"
                  >
                    <option value="typescript">TypeScript (.ts)</option>
                    <option value="javascript">JavaScript (.js)</option>
                    <option value="python">Python (.py)</option>
                    <option value="sql">SQL (.sql)</option>
                    <option value="json">JSON (.json)</option>
                    <option value="markdown">Markdown (.md)</option>
                    <option value="html">HTML (.html)</option>
                    <option value="css">CSS (.css)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Vincular a Projeto (Opcional)</label>
                  <select
                    value={newFileProject}
                    onChange={(e) => setNewFileProject(e.target.value)}
                    className="vly-field w-full text-xs"
                  >
                    <option value="">Geral / Sem Projeto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--vly-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsNewFileModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="vly-interactive px-5 py-1.5 rounded-lg text-xs font-bold text-[var(--vly-accent-contrast)] bg-[var(--vly-warning)] hover:brightness-110 glow-accent"
                  >
                    Criar Arquivo
                  </button>
                </div>
              </form>
            </Surface>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão de Arquivo */}
        {fileToDelete && (
          <ConfirmDeleteModal
            isOpen={true}
            onClose={() => setFileToDelete(null)}
            onConfirm={() => deleteForgeFile(fileToDelete.id)}
            itemTitle={fileToDelete.name}
            itemType="Arquivo de Código"
          />
        )}

        {/* Hidden Sandboxed Execution Frame (Opaque Origin) */}
        <iframe
          ref={sandboxIframeRef}
          srcDoc={sandboxSrcDoc}
          sandbox="allow-scripts"
          title="VARYNTH Forge Sandboxed Execution"
          className="hidden w-0 h-0 border-0 pointer-events-none"
        />
      </div>
    </PageLayout>
  );
}
