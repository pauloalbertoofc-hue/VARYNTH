"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { VaultItem, VaultItemType, ReadingStatus } from "@/lib/types";
import {
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  Tag,
  Trash2,
  Bookmark,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  Scale,
  Code2,
  Quote,
  Layers,
  FolderKanban,
  Upload,
  Newspaper,
  WandSparkles,
  BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";

const TYPE_CONFIG: Record<VaultItemType, { label: string; icon: React.ElementType; color: string }> = {
  artigo: { label: "Artigo", icon: FileText, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  livro: { label: "Livro / Doutrina", icon: BookOpen, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  jurisprudencia: { label: "Jurisprudência", icon: Scale, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  lei: { label: "Legislação", icon: Scale, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  pdf: { label: "PDF / Doc", icon: FileText, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  link: { label: "Página Web", icon: ExternalLink, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  video: { label: "Vídeo / Aula", icon: Layers, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  citacao: { label: "Citação", icon: Quote, color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
  codigo: { label: "Trecho de Código", icon: Code2, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  ideia: { label: "Ideia Solta", icon: Sparkles, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
};

const STATUS_CONFIG: Record<ReadingStatus, { label: string; color: string }> = {
  para_ler: { label: "Para Ler", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  lendo: { label: "Lendo Agora", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  concluido: { label: "Concluído", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  arquivado: { label: "Arquivado", color: "text-slate-500 bg-slate-800/30 border-slate-700" },
};

const LITERARY_CATEGORIES = ["Todos", "Ficção", "Não ficção", "Poesia", "Biografia", "História", "Filosofia", "Ciência", "Direito", "Pesquisa"];

export default function VaultPage() {
  const { vaultItems, projects, addVaultItem, updateVaultItem, deleteVaultItem } = useVarynthStore();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<VaultItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [type, setType] = useState<VaultItemType>("artigo");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Geral");
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>("para_ler");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [relatedProject, setRelatedProject] = useState("");
  const [sourceKind, setSourceKind] = useState("PDF / e-book");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compilation, setCompilation] = useState<string | null>(null);
  const [compilationConfidence, setCompilationConfidence] = useState<string | null>(null);
  const [compilationApproved, setCompilationApproved] = useState(false);
  const exportCompilation = async (format: "docx" | "pdf") => { if (!compilation) return; const response = await fetch("/api/vault/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Livro de consulta - Biblioteca Viva", content: compilation, format }) }); if (!response.ok) { alert("Não foi possível exportar."); return; } const url = URL.createObjectURL(await response.blob()); const a = document.createElement("a"); a.href = url; a.download = `livro-de-consulta.${format}`; a.click(); URL.revokeObjectURL(url); };
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const compileLibrary = async () => { setCompiling(true); try { const response = await fetch("/api/vault/compile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Livro de consulta - Biblioteca Viva", sourceIds: selectedSources }) }); const result = await response.json() as { content?: string; error?: string; governance?: { confidence?: string } }; if (!response.ok) throw new Error(result.error || "Falha ao compilar."); setCompilation(result.content || ""); setCompilationConfidence(result.governance?.confidence || "baixa"); setCompilationApproved(false); } catch (error) { alert(error instanceof Error ? error.message : "Falha ao compilar."); } finally { setCompiling(false); } };

  const filteredItems = useMemo(() => {
    return vaultItems.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.author && item.author.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.content && item.content.toLowerCase().includes(q)) ||
        item.tags.some((t) => t.toLowerCase().includes(q));

      const matchesType = selectedType === "todos" || item.type === selectedType;
      const matchesStatus = selectedStatus === "todos" || item.readingStatus === selectedStatus;
      const matchesCategory = selectedCategory === "Todos" || item.category === selectedCategory;

      return matchesSearch && matchesType && matchesStatus && matchesCategory;
    });
  }, [vaultItems, search, selectedType, selectedStatus, selectedCategory]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    let storedFile = fileName;
    if (file) {
      const upload = new FormData();
      upload.append("file", file);
      const response = await fetch("/api/vault/upload", { method: "POST", body: upload });
      if (!response.ok) { alert((await response.json()).error || "Não foi possível enviar o arquivo."); return; }
      const uploaded = await response.json() as { name: string; extractedText?: string; summary?: string; wordCount?: number; chapters?: string[]; processingStatus?: VaultItem["processingStatus"]; processingMessage?: string };
      storedFile = uploaded.name;
      if (uploaded.extractedText) setNotes((current) => current || `Índice criado automaticamente · ${uploaded.wordCount || 0} palavras.`);
      addVaultItem({
        title: title.trim(), author: author.trim() || undefined, type, url: url.trim() || undefined,
        category: category.trim() || "Geral", readingStatus, notes: notes.trim() || undefined,
        tags: tagsArray.length ? tagsArray : ["conhecimento"], relatedProjectIds: relatedProject ? [relatedProject] : undefined,
        source: sourceKind + (storedFile ? ` · ${storedFile}` : ""), content: uploaded.extractedText,
        wordCount: uploaded.wordCount, chapters: uploaded.chapters, processingStatus: uploaded.processingStatus, processingMessage: uploaded.processingMessage,
        summary: uploaded.summary,
      });
      setTitle(""); setAuthor(""); setUrl(""); setNotes(""); setTags(""); setRelatedProject(""); setSourceKind("PDF / e-book"); setFileName(""); setFile(null); setIsModalOpen(false); return;
    }
    addVaultItem({
      title: title.trim(),
      author: author.trim() || undefined,
      type,
      url: url.trim() || undefined,
      category: category.trim() || "Geral",
      readingStatus,
      notes: notes.trim() || undefined,
      tags: tagsArray.length ? tagsArray : ["conhecimento"],
      relatedProjectIds: relatedProject ? [relatedProject] : undefined,
      source: sourceKind + (storedFile ? ` · ${storedFile}` : ""),
    });

    setTitle("");
    setAuthor("");
    setUrl("");
    setNotes("");
    setTags("");
    setRelatedProject("");
    setSourceKind("PDF / e-book");
    setFileName("");
    setFile(null);
    setIsModalOpen(false);
  };

  return (
    <PageLayout title="Vault" subtitle="Biblioteca pessoal e segundo cérebro relacional">
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header & Metrics */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 glow-accent">
                <BookOpen size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Vault de Conhecimento
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Segundo cérebro não-hierárquico: artigos, doutrina, leis, notas e jurisprudência conectados por tags.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 glow-accent transition-all duration-200"
          >
            <Plus size={16} />
            <span>Adicionar ao Vault</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <span className="text-xs text-slate-400">Total de Obras</span>
            <p className="text-xl font-bold text-white mt-1">{vaultItems.length}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <span className="text-xs text-slate-400">Lendo Agora</span>
            <p className="text-xl font-bold text-cyan-400 mt-1">
              {vaultItems.filter((v) => v.readingStatus === "lendo").length}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <span className="text-xs text-slate-400">Concluídos / Fichados</span>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              {vaultItems.filter((v) => v.readingStatus === "concluido").length}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <span className="text-xs text-slate-400">Para Ler</span>
            <p className="text-xl font-bold text-amber-400 mt-1">
              {vaultItems.filter((v) => v.readingStatus === "para_ler").length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-4">
          <div className="p-5 rounded-xl bg-gradient-to-br from-violet-950/40 to-[#0f0f1a] border border-violet-500/25 clip-corner">
            <div className="flex items-start gap-3"><div className="p-2 rounded-lg bg-violet-500/15 text-violet-300"><WandSparkles size={18} /></div><div><p className="text-[10px] uppercase tracking-widest text-violet-300 font-bold">Athena · Biblioteca viva</p><h2 className="text-base font-bold text-white mt-1">Transforme leitura em material de consulta</h2><p className="text-xs text-slate-400 mt-1 leading-relaxed">Reúna livros, notícias e pesquisas; depois peça à Athena um fichamento, mapa de conceitos ou um livro de consulta com fontes rastreáveis.</p></div></div>
            <div className="flex flex-wrap gap-2 mt-4"><Link href="/modules/research" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/20"><Newspaper size={13} /> Pesquisar notícias e estudos</Link><button onClick={() => void compileLibrary()} disabled={compiling} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[11px] font-bold text-violet-300 hover:bg-violet-500/20 disabled:opacity-50"><WandSparkles size={13} /> {compiling ? "Compilando…" : "Compilar com Athena"}</button></div>
          </div>
          <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]"><div className="flex items-center gap-2 text-white text-sm font-bold"><BookMarked size={16} className="text-amber-300" /> Categorias literárias</div><p className="text-[11px] text-slate-500 mt-1">Organize por gênero, assunto ou finalidade de consulta.</p><div className="flex flex-wrap gap-2 mt-3">{LITERARY_CATEGORIES.map((item) => <button key={item} onClick={() => setSelectedCategory(item)} className={cn("px-2.5 py-1 rounded-full border text-[10px] transition-colors", selectedCategory === item ? "bg-amber-500/15 border-amber-400/40 text-amber-300" : "bg-[#14141f] border-[#29293b] text-slate-400 hover:text-white")}>{item}</button>)}</div></div>
        </div>

        <section className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]"><p className="text-xs font-bold text-white">Fontes da compilação</p><div className="mt-2 flex flex-wrap gap-2">{vaultItems.filter((item) => item.content).map((item) => <label key={item.id} className="text-[10px] text-slate-300"><input type="checkbox" checked={selectedSources.includes(item.id.replace("vault-", ""))} onChange={() => setSelectedSources((current) => current.includes(item.id.replace("vault-", "")) ? current.filter((id) => id !== item.id.replace("vault-", "")) : [...current, item.id.replace("vault-", "")])} /> {item.title}</label>)}</div></section>
        {compilation && <section className="p-5 rounded-xl bg-[#0f0f1a] border border-violet-500/25"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-white">Livro de consulta compilado</h2><span className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-300">Confiança {compilationConfidence}</span></div><div className="mt-3 flex gap-3"><button onClick={() => setCompilationApproved(true)} className="text-xs text-emerald-300">{compilationApproved ? "Aprovado para exportação" : "Aprovar versão"}</button>{compilationApproved && <><button onClick={() => void exportCompilation("docx")} className="text-xs text-violet-300">Exportar DOCX</button><button onClick={() => void exportCompilation("pdf")} className="text-xs text-violet-300">Exportar PDF</button></>}</div><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{compilation}</pre></section>}

        {/* Controls and Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 bg-[#0f0f1a] rounded-xl border border-[#1e1e30]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por título, autor, anotações ou #tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Type selector */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
            >
              <option value="todos">Todos os Tipos</option>
              {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>

            {/* Status selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
            >
              <option value="todos">Todos os Status</option>
              <option value="lendo">Lendo Agora</option>
              <option value="para_ler">Para Ler</option>
              <option value="concluido">Concluído</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </div>
        </div>

        {/* Vault Grid */}
        <div>
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
              <BookOpen size={36} className="mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Nenhum item encontrado no Vault</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Adicione livros, jurisprudências, artigos ou leis para enriquecer seu segundo cérebro.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const typeInfo = TYPE_CONFIG[item.type] || TYPE_CONFIG.artigo;
                const statusInfo = STATUS_CONFIG[item.readingStatus];
                const Icon = typeInfo.icon;

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col justify-between p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all clip-corner"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded border font-semibold", typeInfo.color)}>
                          <Icon size={11} />
                          <span>{typeInfo.label}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <select
                            value={item.readingStatus}
                            onChange={(e) =>
                              updateVaultItem(item.id, { readingStatus: e.target.value as ReadingStatus })
                            }
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded border font-medium bg-transparent cursor-pointer focus:outline-none",
                              statusInfo.color
                            )}
                          >
                            <option value="para_ler" className="bg-[#0f0f1a]">Para Ler</option>
                            <option value="lendo" className="bg-[#0f0f1a]">Lendo</option>
                            <option value="concluido" className="bg-[#0f0f1a]">Concluído</option>
                            <option value="arquivado" className="bg-[#0f0f1a]">Arquivado</option>
                          </select>

                          <button
                            onClick={() => setItemToDelete(item)}
                            className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-opacity touch-manipulation"
                            title="Mover para a Lixeira (10 dias)"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Title & Author */}
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-violet-300 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                        {item.author && (
                          <p className="text-[11px] text-slate-400 mt-1 font-medium">{item.author}</p>
                        )}
                      </div>

                      {/* Notes / Fichamento */}
                      {item.notes && (
                        <p className="text-xs text-slate-400 leading-relaxed bg-[#0a0a0f]/80 p-3 rounded-lg border border-[#1e1e30] line-clamp-3">
                          {item.notes}
                        </p>
                      )}
                      {item.content && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300"><CheckCircle2 size={11} /> {item.processingStatus === "ocr" ? "OCR concluído" : "Conteúdo indexado para busca"}{item.wordCount ? ` · ${item.wordCount.toLocaleString("pt-BR")} palavras` : ""}</span>}
                      {item.chapters && item.chapters.length > 0 && <p className="text-[10px] text-slate-500">{item.chapters.length} capítulos identificados</p>}
                      {item.processingStatus === "requer_revisao" && <span className="text-[10px] text-amber-300">{item.processingMessage || "Este arquivo precisa de revisão manual."}</span>}
                    </div>

                    {/* Footer Info */}
                    <div className="mt-4 pt-3 border-t border-[#1e1e30] space-y-2 text-[11px]">
                      {/* Related Projects */}
                      {item.relatedProjectIds && item.relatedProjectIds.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <FolderKanban size={11} className="text-cyan-400" />
                          {item.relatedProjectIds.map((pId) => {
                            const p = projects.find((proj) => proj.id === pId);
                            return p ? (
                              <Link
                                key={pId}
                                href={`/projects/${pId}`}
                                className="text-[10px] text-cyan-400 hover:underline"
                              >
                                {p.title}
                              </Link>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Tags & External Link */}
                      <div className="flex items-center justify-between gap-2 text-slate-500">
                        <div className="flex items-center gap-1 flex-wrap">
                          {item.tags.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.2 rounded bg-[#14141f] text-slate-400 border border-[#1e1e30]">
                              #{t}
                            </span>
                          ))}
                        </div>

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-semibold"
                          >
                            <span>Abrir</span>
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Novo Item no Vault */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-xl bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl overflow-hidden clip-corner p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e1e30] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen size={16} className="text-violet-400" />
                  <span>Adicionar Obra ao Vault</span>
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Categoria literária</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none">{LITERARY_CATEGORIES.slice(1).map((item) => <option key={item}>{item}</option>)}</select></div>
                  <div><label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Origem / formato</label><select value={sourceKind} onChange={(e) => setSourceKind(e.target.value)} className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"><option>PDF / e-book</option><option>EPUB / MOBI</option><option>Kindle / Amazon (exportado)</option><option>Livro físico / OCR</option><option>Link / notícia</option><option>Áudio / transcrição</option></select></div>
                </div>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-violet-500/30 bg-violet-500/5 cursor-pointer hover:bg-violet-500/10"><Upload size={17} className="text-violet-300" /><span className="text-xs text-slate-300">{fileName || "Anexar PDF, EPUB, MOBI, DOCX, áudio ou imagem"}</span><input type="file" accept=".pdf,.epub,.mobi,.azw,.doc,.docx,.txt,.png,.jpg,.jpeg,.mp3,.m4a" className="hidden" onChange={(e) => { const selected = e.target.files?.[0] || null; setFile(selected); setFileName(selected?.name || ""); }} /></label>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Título da Obra / Lei / Artigo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Teoria Pura do Direito ou Artigo 5º CF/88"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none focus:border-violet-500/60"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Tipo de Conteúdo</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as VaultItemType)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    >
                      {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Status de Leitura</label>
                    <select
                      value={readingStatus}
                      onChange={(e) => setReadingStatus(e.target.value as ReadingStatus)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="para_ler">Para Ler</option>
                      <option value="lendo">Lendo Agora</option>
                      <option value="concluido">Concluído</option>
                      <option value="arquivado">Arquivado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Autor / Fonte</label>
                    <input
                      type="text"
                      placeholder="Ex: Hans Kelsen, STF, etc."
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Link de Acesso / PDF</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Vincular a Projeto (Opcional)</label>
                  <select
                    value={relatedProject}
                    onChange={(e) => setRelatedProject(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">Nenhum (Conhecimento Geral)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Anotações / Fichamento</label>
                  <textarea
                    rows={3}
                    placeholder="Principais teses, argumentos ou trechos importantes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none font-sans"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    placeholder="direito, hermeneutica, artigo"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1e1e30]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 glow-accent"
                  >
                    Salvar no Vault
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {itemToDelete && (
          <ConfirmDeleteModal
            isOpen={true}
            onClose={() => setItemToDelete(null)}
            onConfirm={() => deleteVaultItem(itemToDelete.id)}
            itemTitle={itemToDelete.title}
            itemType="Obra do Vault"
          />
        )}
      </div>
    </PageLayout>
  );
}
