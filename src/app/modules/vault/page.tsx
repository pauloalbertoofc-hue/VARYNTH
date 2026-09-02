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

export default function VaultPage() {
  const { vaultItems, projects, addVaultItem, updateVaultItem, deleteVaultItem } = useVarynthStore();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
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

  const filteredItems = useMemo(() => {
    return vaultItems.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.author && item.author.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        item.tags.some((t) => t.toLowerCase().includes(q));

      const matchesType = selectedType === "todos" || item.type === selectedType;
      const matchesStatus = selectedStatus === "todos" || item.readingStatus === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vaultItems, search, selectedType, selectedStatus]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

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
    });

    setTitle("");
    setAuthor("");
    setUrl("");
    setNotes("");
    setTags("");
    setRelatedProject("");
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
