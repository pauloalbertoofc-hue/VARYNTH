"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Code2, LoaderCircle } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

type DeveloperAccount = { id: string; name: string; email: string; provider: "credentials" | "google"; role: "owner" | "member" | "developer"; createdAt: string };

export function DeveloperManagement({ users }: { users: DeveloperAccount[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const developers = users.filter((user) => user.role === "developer");
  const eligible = users.filter((user) => user.role !== "owner");

  async function updateRole(user: DeveloperAccount, role: "member" | "developer") {
    setBusyId(user.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/developers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id, role }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar o perfil.");
      setMessage(role === "developer" ? `${user.name} foi adicionado à equipe de desenvolvedores.` : `${user.name} foi removido da equipe de desenvolvedores.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o perfil.");
    } finally {
      setBusyId(null);
    }
  }

  return <Surface tone="panel" className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"><Code2 size={16} className="text-[var(--vly-accent)]" /> Gestão de desenvolvedores</h2><p className="mt-1 text-xs text-[var(--vly-text-muted)]">Atribua ou remova o perfil de desenvolvedor das contas cadastradas.</p></div>
      <span className="rounded-full bg-[var(--vly-accent)]/10 px-2.5 py-1 text-xs font-bold text-[var(--vly-accent)]">{developers.length} na equipe</span>
    </div>
    {message && <p role="status" className="vly-motion-success mt-3 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-3 py-2 text-xs text-[var(--vly-text-secondary)]">{message}</p>}
    {eligible.length ? <ul className="mt-4 divide-y divide-[var(--vly-border-subtle)]">{eligible.map((user) => <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--vly-text-secondary)]">{user.name}</p><p className="truncate text-xs text-[var(--vly-text-muted)]">{user.email}</p></div>
      <button type="button" disabled={busyId === user.id} onClick={() => updateRole(user, user.role === "developer" ? "member" : "developer")} className="vly-interactive inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[var(--vly-border-accent)] px-3 text-xs font-bold text-[var(--vly-accent)] transition hover:bg-[var(--vly-accent)]/10 disabled:opacity-60">
        {busyId === user.id && <LoaderCircle size={13} className="animate-spin" />}{user.role === "developer" ? "Remover da equipe" : "Adicionar como desenvolvedor"}
      </button>
    </li>)}</ul> : <p className="mt-4 rounded-xl border border-dashed border-[var(--vly-border-default)] p-4 text-sm text-[var(--vly-text-muted)]">Nenhuma conta cadastrada pode ser gerida ainda. Quando alguém autorizado entrar pela primeira vez, a conta aparecerá aqui.</p>}
  </Surface>;
}
