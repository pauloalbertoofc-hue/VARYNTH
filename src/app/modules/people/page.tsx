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
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

const PERMISSION_COLORS: Record<PermissionLevel, { label: string; class: string }> = {
  visualizar: { label: "Visualizar", class: "text-[var(--vly-text-secondary)] border-[var(--vly-border-default)] bg-[var(--vly-surface-hover)]" },
  comentar: { label: "Comentar", class: "text-[var(--vly-info)] border-[color-mix(in_srgb,var(--vly-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--vly-info)_10%,transparent)]" },
  editar: { label: "Editar", class: "text-[var(--vly-warning)] border-[color-mix(in_srgb,var(--vly-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)]" },
  administrar: { label: "Administrar", class: "text-[var(--vly-danger)] border-[color-mix(in_srgb,var(--vly-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--vly-danger)_10%,transparent)]" },
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
      <div className="vly-enter mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--vly-success)_16%,transparent)] border border-[color-mix(in_srgb,var(--vly-success)_30%,transparent)] flex items-center justify-center text-[var(--vly-success)]">
                <Users size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--vly-text-primary)] tracking-tight">
                Diretório de Colaboradores
              </h1>
            </div>
            <p className="text-xs text-[var(--vly-text-secondary)] mt-1">
              Controle estrito de acesso: colaboradores convidados têm permissões restritas apenas aos seus projetos.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="vly-interactive flex items-center gap-1.5 rounded-[var(--vly-radius-md)] bg-[var(--vly-success)] px-4 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"
          >
            <Plus size={16} />
            <span>Adicionar Colaborador</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Surface tone="panel" className="p-3.5">
            <span className="text-xs text-[var(--vly-text-secondary)]">Total de Colaboradores</span>
            <p className="text-xl font-bold text-[var(--vly-text-primary)] mt-1">{people.length}</p>
          </Surface>
          <Surface tone="panel" className="p-3.5">
            <span className="text-xs text-[var(--vly-text-secondary)]">Projetos com Equipe</span>
            <p className="text-xl font-bold text-[var(--vly-success)] mt-1">
              {new Set(people.flatMap((p) => p.projectPermissions.map((perm) => perm.projectId))).size}
            </p>
          </Surface>
          <Surface tone="panel" className="p-3.5">
            <span className="text-xs text-[var(--vly-text-secondary)]">Isolamento de Segurança</span>
            <p className="text-xl font-bold text-[var(--vly-info)] mt-1">100% Ativo</p>
          </Surface>
        </div>

        {/* Search */}
        <Surface tone="panel" className="p-3.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vly-text-muted)]" />
            <input
              aria-label="Buscar colaborador"
              type="text"
              placeholder="Buscar colaborador por nome, cargo, instituição ou tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="vly-field w-full pl-9 pr-3 py-1.5 text-xs"
            />
          </div>
        </Surface>

        {/* People Grid */}
        <div>
          {filteredPeople.length === 0 ? (
            <StatePanel tone="empty" title="Nenhum colaborador encontrado" description="Cadastre orientadores, colegas de pesquisa ou membros de projetos com permissões específicas." action={<button type="button" onClick={() => setIsModalOpen(true)} className="vly-interactive rounded-[var(--vly-radius-md)] bg-[var(--vly-success)] px-3 py-2 text-xs font-semibold text-[var(--vly-accent-contrast)]"><Plus size={14} className="mr-1 inline" />Adicionar colaborador</button>} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  className="group relative flex flex-col justify-between p-5 vly-interactive clip-corner"
                >
                  <div className="space-y-3">
                    {/* Avatar & Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--vly-success)_10%,transparent)] border border-[color-mix(in_srgb,var(--vly-success)_20%,transparent)] flex items-center justify-center text-[var(--vly-success)] text-sm font-bold flex-shrink-0">
                          {person.name[0]}
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-[var(--vly-text-primary)] group-hover:text-[var(--vly-success)] transition-colors">
                            {person.name}
                          </h3>
                          <p className="text-xs text-[var(--vly-text-secondary)] font-medium">{person.role}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => deletePerson(person.id)}
                        className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-danger)] transition-opacity touch-manipulation"
                        title="Remover colaborador"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Organization & Contacts */}
                    <div className="space-y-1 text-xs text-[var(--vly-text-secondary)]">
                      {person.organization && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--vly-text-secondary)]">
                          <Building size={12} className="text-[var(--vly-success)] flex-shrink-0" />
                          <span className="truncate">{person.organization}</span>
                        </div>
                      )}
                      {person.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--vly-text-secondary)]">
                          <Mail size={12} className="text-[var(--vly-accent)] flex-shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {person.notes && (
                      <p className="text-xs text-[var(--vly-text-secondary)] leading-relaxed bg-[var(--vly-surface)] p-2.5 rounded-lg border border-[var(--vly-border-subtle)]">
                        {person.notes}
                      </p>
                    )}
                  </div>

                  {/* Project Permissions Matrix */}
                  <div className="mt-4 pt-3 border-t border-[var(--vly-border-subtle)] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[var(--vly-text-muted)]">
                      <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-[var(--vly-text-secondary)]">
                        <Shield size={11} className="text-[var(--vly-success)]" />
                        <span>Acesso por Projeto</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {person.projectPermissions.length === 0 ? (
                        <span className="text-[10px] text-[var(--vly-text-muted)] italic block">
                          Sem projetos vinculados no momento.
                        </span>
                      ) : (
                        person.projectPermissions.map((perm) => {
                          const proj = projects.find((p) => p.id === perm.projectId);
                          const permInfo = PERMISSION_COLORS[perm.level];
                          return (
                            <div
                              key={perm.projectId}
                              className="flex items-center justify-between p-2 rounded-lg bg-[var(--vly-surface-raised)] text-xs"
                            >
                              <span className="truncate text-[var(--vly-text-secondary)] text-[11px]">
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
            <Surface tone="floating" className="w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-3">
                <h2 className="text-sm font-bold text-[var(--vly-text-primary)] flex items-center gap-2">
                  <Users size={16} className="text-[var(--vly-success)]" />
                  <span>Cadastrar Colaborador</span>
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dr. Roberto Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="vly-field w-full text-xs"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Cargo / Função *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Orientador, Desenvolvedor"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="vly-field w-full text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Instituição / Organização</label>
                    <input
                      type="text"
                      placeholder="Ex: Universidade de Direito"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="vly-field w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="contato@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="vly-field w-full text-xs"
                    />
                  </div>
                </div>

                {/* Project Permission binding */}
                <div className="p-3 rounded-lg bg-[var(--vly-surface)] border border-[var(--vly-border-subtle)] space-y-2">
                  <span className="text-[11px] font-bold text-[var(--vly-text-secondary)] uppercase block">Vincular a um Projeto</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="vly-field w-full text-xs"
                    >
                      <option value="">Nenhum no momento</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>

                    <select
                      value={selectedPerm}
                      onChange={(e) => setSelectedPerm(e.target.value as PermissionLevel)}
                      className="vly-field w-full text-xs"
                    >
                      <option value="visualizar">Permissão: Visualizar</option>
                      <option value="comentar">Permissão: Comentar</option>
                      <option value="editar">Permissão: Editar</option>
                      <option value="administrar">Permissão: Administrar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Anotações / Contexto</label>
                  <textarea
                    rows={2}
                    placeholder="Áreas de especialidade, horários de contato..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="vly-field w-full text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--vly-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="vly-interactive px-5 py-1.5 rounded-lg text-xs font-bold text-[var(--vly-accent-contrast)] bg-[var(--vly-success)] hover:brightness-110"
                  >
                    Cadastrar
                  </button>
                </div>
              </form>
            </Surface>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
