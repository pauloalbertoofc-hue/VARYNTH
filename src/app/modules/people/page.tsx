"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { Person, PermissionLevel } from "@/lib/types";
import {
  Users,
  Plus,
  Search,
  Mail,
  Building,
  Shield,
  Trash2,
  FolderKanban,
  UserCheck,
  Sparkles,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PERMISSION_COLORS: Record<PermissionLevel, { label: string; class: string }> = {
  visualizar: { label: "Visualizar", class: "text-slate-400 border-slate-700 bg-slate-800/30" },
  comentar: { label: "Comentar", class: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10" },
  editar: { label: "Editar", class: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
  administrar: { label: "Administrar", class: "text-red-400 border-red-500/20 bg-red-500/10" },
};

export default function PeoplePage() {
  const { people, projects, addPerson, deletePerson } = useVarynthStore();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedPerm, setSelectedPerm] = useState<PermissionLevel>("visualizar");

  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      const q = search.toLowerCase().trim();
      return (
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        (p.organization && p.organization.toLowerCase().includes(q)) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [people, search]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const permissions = selectedProject
      ? [{ projectId: selectedProject, level: selectedPerm }]
      : [];

    addPerson({
      name: name.trim(),
      role: role.trim(),
      organization: organization.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tagsArray.length ? tagsArray : ["colaborador"],
      projectPermissions: permissions,
    });

    setName("");
    setRole("");
    setOrganization("");
    setEmail("");
    setPhone("");
    setNotes("");
    setTags("");
    setSelectedProject("");
    setIsModalOpen(false);
  };

  return (
    <PageLayout title="People" subtitle="Colaboradores e permissões granulares por projeto">
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Users size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Diretório de Colaboradores
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Controle estrito de acesso: colaboradores convidados têm permissões restritas apenas aos seus projetos.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all duration-200"
          >
            <Plus size={16} />
            <span>Adicionar Colaborador</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <span className="text-xs text-slate-400">Total de Colaboradores</span>
            <p className="text-xl font-bold text-white mt-1">{people.length}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <span className="text-xs text-slate-400">Projetos com Equipe</span>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              {new Set(people.flatMap((p) => p.projectPermissions.map((perm) => perm.projectId))).size}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <span className="text-xs text-slate-400">Isolamento de Segurança</span>
            <p className="text-xl font-bold text-cyan-400 mt-1">100% Ativo</p>
          </div>
        </div>

        {/* Search */}
        <div className="p-3.5 bg-[#0f0f1a] rounded-xl border border-[#1e1e30]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar colaborador por nome, cargo, instituição ou tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
          </div>
        </div>

        {/* People Grid */}
        <div>
          {filteredPeople.length === 0 ? (
            <div className="py-16 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
              <Users size={36} className="mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Nenhum colaborador encontrado</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cadastre orientadores, colegas de pesquisa ou membros de projetos com permissões específicas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  className="group relative flex flex-col justify-between p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all clip-corner"
                >
                  <div className="space-y-3">
                    {/* Avatar & Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold flex-shrink-0">
                          {person.name[0]}
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                            {person.name}
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">{person.role}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => deletePerson(person.id)}
                        className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-opacity touch-manipulation"
                        title="Remover colaborador"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Organization & Contacts */}
                    <div className="space-y-1 text-xs text-slate-400">
                      {person.organization && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Building size={12} className="text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{person.organization}</span>
                        </div>
                      )}
                      {person.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Mail size={12} className="text-violet-400 flex-shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {person.notes && (
                      <p className="text-xs text-slate-400 leading-relaxed bg-[#0a0a0f]/80 p-2.5 rounded-lg border border-[#1e1e30]">
                        {person.notes}
                      </p>
                    )}
                  </div>

                  {/* Project Permissions Matrix */}
                  <div className="mt-4 pt-3 border-t border-[#1e1e30] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-slate-400">
                        <Shield size={11} className="text-emerald-400" />
                        <span>Acesso por Projeto</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {person.projectPermissions.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic block">
                          Sem projetos vinculados no momento.
                        </span>
                      ) : (
                        person.projectPermissions.map((perm) => {
                          const proj = projects.find((p) => p.id === perm.projectId);
                          const permInfo = PERMISSION_COLORS[perm.level];
                          return (
                            <div
                              key={perm.projectId}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#14141f] text-xs"
                            >
                              <span className="truncate text-slate-300 text-[11px]">
                                {proj ? proj.title : perm.projectId}
                              </span>
                              <span className={cn("text-[9px] px-1.5 py-0.2 rounded border font-semibold", permInfo.class)}>
                                {permInfo.label}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Novo Colaborador */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e1e30] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-emerald-400" />
                  <span>Cadastrar Colaborador</span>
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dr. Roberto Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Cargo / Função *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Orientador, Desenvolvedor"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Instituição / Organização</label>
                    <input
                      type="text"
                      placeholder="Ex: Universidade de Direito"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="contato@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Project Permission binding */}
                <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase block">Vincular a um Projeto</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="">Nenhum no momento</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>

                    <select
                      value={selectedPerm}
                      onChange={(e) => setSelectedPerm(e.target.value as PermissionLevel)}
                      className="w-full px-2 py-1.5 rounded bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="visualizar">Permissão: Visualizar</option>
                      <option value="comentar">Permissão: Comentar</option>
                      <option value="editar">Permissão: Editar</option>
                      <option value="administrar">Permissão: Administrar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Anotações / Contexto</label>
                  <textarea
                    rows={2}
                    placeholder="Áreas de especialidade, horários de contato..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500"
                  >
                    Cadastrar
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
