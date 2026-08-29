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

  // Execution result
  const [execResult, setExecResult] = useState<ForgeExecutionResult>({
    status: "idle",
    logs: ["Forge Studio pronto. Pressione '▶ Executar Código' ou Ctrl+Enter para rodar."],
    executionTimeMs: 0,
  });

  // New File Modal
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileLang, setNewFileLang] = useState<ForgeLanguage>("typescript");
  const [newFileProject, setNewFileProject] = useState("");

  const activeFile = forgeFiles.find((f) => f.id === activeFileId) || forgeFiles[0];

  // Sync content when switching file
  useEffect(() => {
    if (activeFile) {
      setEditorContent(activeFile.content);
      setIsSaved(true);
    }
  }, [activeFile?.id]);

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
    if (!activeFile) return;
    handleSave();

    const startTime = performance.now();
    const logs: string[] = [];

    if (activeFile.language === "javascript" || activeFile.language === "typescript") {
      try {
        const customConsole = {
          log: (...args: unknown[]) => logs.push("[LOG] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")),
          warn: (...args: unknown[]) => logs.push("[WARN] " + args.map((a) => String(a)).join(" ")),
          error: (...args: unknown[]) => logs.push("[ERROR] " + args.map((a) => String(a)).join(" ")),
        };

        // Transpile/strip TS types simply for eval or execute JS directly
        const cleanJS = editorContent
          .replace(/:\s*(string|number|boolean|any|void|Record<[^>]+>|ToolInput|ModelCost)(\[\])?/g, "")
          .replace(/interface\s+[^{]+\{[^}]+\}/g, "");

        const runFn = new Function("console", cleanJS);
        const result = runFn(customConsole);

        const endTime = performance.now();
        const timeMs = Math.round(endTime - startTime);

        if (logs.length === 0) {
          logs.push("[INFO] Código executado com sucesso sem chamadas de console.log.");
        }
        if (result !== undefined) {
          logs.push(`[RETURN] => ${typeof result === "object" ? JSON.stringify(result, null, 2) : String(result)}`);
        }

        setExecResult({
          status: "success",
          logs,
          executionTimeMs: timeMs,
          timestamp: new Date().toLocaleTimeString(),
        });
        setActiveTab("terminal");
      } catch (err: unknown) {
        const endTime = performance.now();
        const timeMs = Math.round(endTime - startTime);
        const errorMsg = err instanceof Error ? err.message : String(err);

        setExecResult({
          status: "error",
          logs: [`[RUNTIME ERROR] ${errorMsg}`],
          executionTimeMs: timeMs,
          timestamp: new Date().toLocaleTimeString(),
        });
        setActiveTab("terminal");
      }
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
      <div className="space-y-4 max-w-7xl mx-auto animate-fade-in">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 glow-accent">
                <Code2 size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Forge Studio IDE
                <Sparkles size={16} className="text-orange-400" />
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ambiente de desenvolvimento web: edite, execute scripts e vincule trechos de código aos seus projetos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewFileModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-[#0f0f1a] hover:bg-[#14141f] border border-[#1e1e30] transition-all"
            >
              <Plus size={15} />
              <span>Novo Arquivo</span>
            </button>

            <button
              onClick={handleRun}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 glow-accent shadow-md transition-all duration-200"
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
          <div className="lg:col-span-3 flex flex-col rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] overflow-hidden clip-corner">
            {/* File Explorer Header */}
            <div className="flex items-center justify-between px-3.5 py-3 bg-[#0a0a0f] border-b border-[#1e1e30] text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-400">
                <FileCode size={13} className="text-orange-400" />
                <span>Explorador de Arquivos</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{forgeFiles.length} arquivos</span>
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
                        ? "bg-orange-950/30 text-orange-200 border border-orange-500/40 font-semibold"
                        : "text-slate-300 hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={14} className={langInfo.color} />
                      <span className="truncate">{file.name}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteForgeFile(file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                      title="Excluir arquivo"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Templates Quick List */}
            <div className="p-3 bg-[#0a0a0f] border-t border-[#1e1e30] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Templates de Código
              </span>
              <div className="space-y-1.5">
                {FORGE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleUseTemplate(tpl)}
                    className="w-full text-left p-2 rounded-lg bg-[#14141f] hover:bg-orange-600/10 border border-[#1e1e30] hover:border-orange-500/30 text-[11px] text-slate-300 transition-all flex items-center justify-between"
                  >
                    <span className="truncate">{tpl.title}</span>
                    <Plus size={11} className="text-orange-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER & RIGHT: Code Editor & Terminal (9 cols) */}
          <div className="lg:col-span-9 flex flex-col rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] overflow-hidden clip-corner">
            {/* Tab Bar & Action Buttons */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#0a0a0f] border-b border-[#1e1e30] overflow-x-auto">
              <div className="flex items-center gap-1.5">
                {activeFile && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14141f] border border-orange-500/30 text-xs text-orange-300 font-mono font-medium">
                    <span>{activeFile.name}</span>
                    {!isSaved && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Alterações não salvas" />}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#14141f] hover:bg-white/5 text-slate-300 hover:text-white border border-[#1e1e30] text-xs transition-all"
                  title="Salvar arquivo (Ctrl+S)"
                >
                  <Save size={12} />
                  <span>Salvar</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="p-1 text-slate-400 hover:text-slate-200"
                  title="Baixar arquivo"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>

            {/* Split Editor and Terminal */}
            <div className="flex-1 grid grid-rows-2 h-full overflow-hidden">
              {/* Top: Code Editor with Line Numbers */}
              <div className="relative flex h-full overflow-hidden bg-[#07070b]">
                {/* Line Numbers */}
                <div className="w-11 py-3 bg-[#050508] border-r border-[#1e1e30] text-[11px] font-mono text-slate-600 text-right pr-2 select-none overflow-hidden leading-relaxed">
                  {Array.from({ length: Math.max(lineCount, 15) }).map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                {/* Editor Textarea */}
                <textarea
                  value={editorContent}
                  onChange={(e) => {
                    setEditorContent(e.target.value);
                    setIsSaved(false);
                  }}
                  placeholder="Escreva seu código aqui..."
                  className="flex-1 p-3 bg-transparent font-mono text-xs text-slate-100 placeholder-slate-600 focus:outline-none resize-none leading-relaxed overflow-auto selection:bg-orange-500/30"
                  spellCheck={false}
                />
              </div>

              {/* Bottom: Interactive Output Terminal */}
              <div className="flex flex-col bg-[#0a0a0f] border-t border-[#1e1e30] overflow-hidden">
                {/* Console Bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#07070b] border-b border-[#1e1e30] text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab("terminal")}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-bold font-mono px-2 py-0.5 rounded",
                        activeTab === "terminal" ? "text-orange-400 bg-orange-500/10" : "text-slate-400 hover:text-slate-200"
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
                          activeTab === "preview" ? "text-purple-400 bg-purple-500/10" : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <Eye size={12} />
                        <span>Live Preview</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                    {execResult.executionTimeMs > 0 && (
                      <span>Tempo: {execResult.executionTimeMs}ms</span>
                    )}
                    <button
                      onClick={() =>
                        setExecResult({ status: "idle", logs: ["Console limpo."], executionTimeMs: 0 })
                      }
                      className="hover:text-slate-300"
                      title="Limpar console"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Output Logs Stream */}
                <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1 bg-[#050508]">
                  {activeTab === "terminal" ? (
                    execResult.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "leading-relaxed",
                          log.startsWith("[ERROR]") || log.startsWith("[RUNTIME ERROR]")
                            ? "text-red-400 font-bold"
                            : log.startsWith("[WARN]")
                            ? "text-amber-400"
                            : log.startsWith("[RETURN]")
                            ? "text-cyan-300 font-bold"
                            : log.startsWith("[INFO]")
                            ? "text-slate-400"
                            : "text-emerald-300"
                        )}
                      >
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="prose prose-invert max-w-none text-xs text-slate-200 p-2 whitespace-pre-wrap font-sans">
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
            <div className="w-full max-w-md bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e1e30] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode size={16} className="text-orange-400" />
                  <span>Novo Arquivo de Código</span>
                </h2>
                <button onClick={() => setIsNewFileModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateFile} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Nome do Arquivo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: process_data.py ou api_client.ts"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Linguagem</label>
                  <select
                    value={newFileLang}
                    onChange={(e) => setNewFileLang(e.target.value as ForgeLanguage)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
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
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Vincular a Projeto (Opcional)</label>
                  <select
                    value={newFileProject}
                    onChange={(e) => setNewFileProject(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">Geral / Sem Projeto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1e1e30]">
                  <button
                    type="button"
                    onClick={() => setIsNewFileModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 glow-accent"
                  >
                    Criar Arquivo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
