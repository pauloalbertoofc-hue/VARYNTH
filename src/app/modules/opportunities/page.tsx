"use client";

import { useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { Opportunity, OpportunityStatus } from "@/lib/types";
import {
  Trophy,
  Plus,
  Trash2,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Building,
  Sparkles,
  DollarSign,
  FolderKanban,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES: { id: OpportunityStatus; label: string; color: string }[] = [
  { id: "interessado", label: "Interessado", color: "border-slate-700 text-slate-300" },
  { id: "analisando", label: "Analisando Edital", color: "border-cyan-500/30 text-cyan-400" },
  { id: "preparando", label: "Preparando Submissão", color: "border-amber-500/30 text-amber-400" },
  { id: "submetido", label: "Submetido (Aguardando)", color: "border-violet-500/30 text-violet-400" },
  { id: "aprovado", label: "Aprovado / Premiado", color: "border-emerald-500/30 text-emerald-400" },
];

export default function OpportunitiesPage() {
  const { opportunities, projects, addOpportunity, updateOpportunity, deleteOpportunity } = useVarynthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [institution, setInstitution] = useState("");
  const [deadline, setDeadline] = useState("");
  const [prizeOrGrant, setPrizeOrGrant] = useState("");
  const [url, setUrl] = useState("");
  const [requirements, setRequirements] = useState("");
  const [requiredDocs, setRequiredDocs] = useState("");
  const [relatedProject, setRelatedProject] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !institution.trim() || !deadline) return;

    const reqs = requirements
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    const docs = requiredDocs
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);

    addOpportunity({
      title: title.trim(),
      institution: institution.trim(),
      deadline,
      prizeOrGrant: prizeOrGrant.trim() || undefined,
      url: url.trim() || undefined,
      requirements: reqs.length ? reqs : ["Verificar edital"],
      requiredDocs: docs.length ? docs : ["Documentação padrão"],
      relatedProjectId: relatedProject || undefined,
      status: "interessado",
      notes: notes.trim() || undefined,
    });

    setTitle("");
    setInstitution("");
    setDeadline("");
    setPrizeOrGrant("");
    setUrl("");
    setRequirements("");
    setRequiredDocs("");
    setRelatedProject("");
    setNotes("");
    setIsModalOpen(false);
  };

  return (
    <PageLayout title="Opportunities" subtitle="Radar de editais, bolsas e premiações">
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                <Trophy size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Radar de Editais & Oportunidades
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pipeline de prospecção de chamadas públicas, bolsas PIBIC/PIBITI, prêmios acadêmicos e hackathons.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-yellow-600 hover:bg-yellow-500 glow-accent transition-all duration-200"
          >
            <Plus size={16} />
            <span>Cadastrar Edital</span>
          </button>
        </div>

        {/* Pipeline Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const itemsInStage = opportunities.filter((o) => o.status === stage.id);

            return (
              <div key={stage.id} className="space-y-3 min-w-[220px]">
                <div className={cn("flex items-center justify-between p-3 rounded-xl bg-[#0f0f1a] border", stage.color)}>
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {stage.label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#14141f] text-slate-400 font-mono">
                    {itemsInStage.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {itemsInStage.length === 0 ? (
                    <div className="py-8 text-center rounded-xl bg-[#0f0f1a]/40 border border-[#1e1e30] text-slate-600 text-xs">
                      Vazio
                    </div>
                  ) : (
                    itemsInStage.map((opp) => {
                      const proj = projects.find((p) => p.id === opp.relatedProjectId);

                      return (
                        <div
                          key={opp.id}
                          className="group relative p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-yellow-500/40 transition-all space-y-3 clip-corner-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] text-yellow-400 font-semibold flex items-center gap-1 truncate">
                              <Building size={11} className="flex-shrink-0" />
                              <span className="truncate">{opp.institution}</span>
                            </span>
                            <button
                              onClick={() => deleteOpportunity(opp.id)}
                              className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-opacity touch-manipulation"
                              title="Remover edital"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-100 group-hover:text-yellow-300 transition-colors">
                              {opp.title}
                            </h4>
                            {opp.prizeOrGrant && (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
                                <DollarSign size={12} />
                                <span>{opp.prizeOrGrant}</span>
                              </div>
                            )}
                          </div>

                          {/* Deadline */}
                          <div className="p-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <div className="flex items-center gap-1">
                              <Calendar size={11} className="text-amber-400" />
                              <span>Prazo: {opp.deadline}</span>
                            </div>
                          </div>

                          {/* Related Project */}
                          {proj && (
                            <Link
                              href={`/projects/${proj.id}`}
                              className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline"
                            >
                              <FolderKanban size={11} />
                              <span className="truncate">{proj.title}</span>
                            </Link>
                          )}

                          {/* Stage Changer Dropdown */}
                          <div className="pt-2 border-t border-[#1e1e30] flex items-center justify-between gap-2">
                            <select
                              value={opp.status}
                              onChange={(e) =>
                                updateOpportunity(opp.id, { status: e.target.value as OpportunityStatus })
                              }
                              className="w-full text-[10px] px-2 py-1 rounded bg-[#14141f] border border-[#1e1e30] text-slate-300 focus:outline-none"
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  Mover: {s.label}
                                </option>
                              ))}
                            </select>

                            {opp.url && (
                              <a
                                href={opp.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-slate-400 hover:text-yellow-300"
                                title="Abrir Edital / Link Oficial"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Novo Edital */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#1e1e30] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-400" />
                  <span>Cadastrar Novo Edital / Prêmio</span>
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Título do Edital / Chamada *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Edital PIBIC 2026/2027 ou Prêmio Jovem Jurista"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Instituição Promotora *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CNPq, FAPESP, IBDT"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Prazo de Inscrição *</label>
                    <input
                      type="date"
                      required
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Prêmio / Bolsa</label>
                    <input
                      type="text"
                      placeholder="Ex: R$ 10.000 ou Bolsa R$ 700/mês"
                      value={prizeOrGrant}
                      onChange={(e) => setPrizeOrGrant(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Link do Edital</label>
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
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Vincular a um Projeto</label>
                  <select
                    value={relatedProject}
                    onChange={(e) => setRelatedProject(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">Nenhum (Edital Geral)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Requisitos de Elegibilidade (1 por linha)</label>
                  <textarea
                    rows={2}
                    placeholder="Estar matriculado no 3º ano...&#10;Orientador Doutor..."
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Documentos Exigidos (1 por linha)</label>
                  <textarea
                    rows={2}
                    placeholder="Histórico Escolar...&#10;Lattes atualizado..."
                    value={requiredDocs}
                    onChange={(e) => setRequiredDocs(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
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
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-yellow-600 hover:bg-yellow-500 glow-accent"
                  >
                    Salvar no Radar
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
