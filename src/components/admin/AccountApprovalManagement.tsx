"use client";

import { useRouter } from "next/navigation";
import { Check, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { Surface } from "@/components/ui/Surface";

type Account = {
  id: string;
  name: string;
  email: string;
  provider: "credentials" | "google";
  status?: "pending" | "approved" | "rejected";
  createdAt: string;
};
export function AccountApprovalManagement({ users }: { users: Account[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<Account>();
  const [decision, setDecision] = useState<"approved" | "rejected">();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = users.filter((user) => user.status === "pending");
  async function decide() {
    if (!target || !decision) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: target.id, decision }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível atualizar a conta.");
      setMessage(
        decision === "approved"
          ? `${target.name} agora pode entrar na plataforma.`
          : `O acesso de ${target.name} foi rejeitado.`,
      );
      setTarget(undefined);
      setDecision(undefined);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a conta.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Surface tone="panel" role="region" aria-labelledby="account-approval-title" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="account-approval-title" className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]">
            <ShieldAlert size={16} className="text-[var(--vly-warning)]" />{" "}
            Solicitações de acesso
          </h2>
          <p className="mt-1 text-xs text-[var(--vly-text-muted)]">
            Uma conta só entra depois da sua aprovação.
          </p>
        </div>
        <span
          aria-live="polite"
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${pending.length ? "bg-[var(--vly-surface-warning)] text-[var(--vly-warning)]" : "bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] text-[var(--vly-success)]"}`}
        >
          {pending.length
            ? `${pending.length} aguardando`
            : "Nenhuma pendência"}
        </span>
      </div>
      {message && (
        <p
          role="status"
          className="vly-motion-success mt-3 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-3 py-2 text-xs text-[var(--vly-text-secondary)]"
        >
          {message}
        </p>
      )}
      {pending.length ? (
        <ul aria-label="Contas aguardando aprovação" className="mt-4 divide-y divide-[var(--vly-border-subtle)]">
          {pending.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--vly-text-secondary)]">
                  {user.name}
                </p>
                <p className="truncate text-xs text-[var(--vly-text-muted)]">
                  {user.email} ·{" "}
                  {user.provider === "google" ? "Google" : "Senha"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTarget(user);
                    setDecision("approved");
                  }}
                  aria-label={`Aprovar conta de ${user.name}`}
                  className="vly-interactive inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--vly-success)_15%,var(--vly-surface))] px-3 text-xs font-bold text-[var(--vly-success)] hover:bg-[var(--vly-surface-hover)]"
                >
                  <Check size={13} /> Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTarget(user);
                    setDecision("rejected");
                  }}
                  aria-label={`Rejeitar conta de ${user.name}`}
                  className="vly-interactive inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--vly-border-danger)] px-3 text-xs font-bold text-[var(--vly-danger)] hover:bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))]"
                >
                  <X size={13} /> Rejeitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-[var(--vly-border-default)] p-4 text-sm text-[var(--vly-text-muted)]">
          Nenhuma solicitação aguardando análise.
        </p>
      )}
      {target && decision && (
        <div role="presentation" className="vly-motion-enter fixed inset-0 z-[100] flex items-center justify-center bg-[var(--vly-world)]/80 p-4">
          <Surface tone="floating" role="dialog" aria-modal="true" aria-labelledby="account-decision-title" className="w-full max-w-md p-5">
            <h3
              id="account-decision-title"
              className="text-base font-black text-[var(--vly-text-primary)]"
            >
              {decision === "approved"
                ? "Aprovar esta conta?"
                : "Rejeitar esta conta?"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--vly-text-secondary)]">
              {decision === "approved"
                ? `${target.name} poderá entrar e usar a edição Cliente do VARYNTH.`
                : `${target.name} continuará sem acesso à plataforma.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                aria-busy={busy}
                onClick={() => {
                  setTarget(undefined);
                  setDecision(undefined);
                }}
                className="vly-interactive min-h-10 rounded-lg border border-[var(--vly-border-default)] px-3 text-xs font-semibold text-[var(--vly-text-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decide()}
                className={`vly-interactive inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-[var(--vly-accent-contrast)] disabled:opacity-50 ${decision === "approved" ? "bg-[var(--vly-success)] hover:opacity-90" : "bg-[var(--vly-danger)] hover:opacity-90"}`}
              >
                {busy && <LoaderCircle size={13} className="animate-spin" />}
                {decision === "approved"
                  ? "Confirmar aprovação"
                  : "Confirmar rejeição"}
              </button>
            </div>
          </Surface>
        </div>
      )}
    </Surface>
  );
}
