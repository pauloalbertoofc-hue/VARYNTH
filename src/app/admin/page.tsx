import { redirect } from "next/navigation";
import { Activity, Database, KeyRound, ShieldCheck, Users } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { requireOwner, requireSession } from "@/lib/auth/require-session";
import { listUsers } from "@/lib/auth/user-store";
import { oauthConfig } from "@/lib/athena/integrations/google-calendar-oauth-server";
import { DeveloperManagement } from "./DeveloperManagement";
import { AppIconSettings } from "@/components/admin/AppIconSettings";
import { EnvironmentPersonalization } from "@/components/admin/EnvironmentPersonalization";
import { AdminTabs } from "./AdminTabs";
import { AccountApprovalManagement } from "@/components/admin/AccountApprovalManagement";
import { Surface } from "@/components/ui/Surface";

export const dynamic = "force-dynamic";

function Status({ active, label }: { active: boolean; label: string }) {
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${active ? "bg-[var(--vly-success)]/10 text-[var(--vly-success)]" : "bg-[var(--vly-warning)]/10 text-[var(--vly-warning)]"}`}>{active ? "ATIVO" : label}</span>;
}

export default async function AdminPage() {
  const authenticated = await requireSession();
  if (!authenticated) redirect("/login?callbackUrl=/admin");
  const session = await requireOwner();
  if (!session) redirect("/dashboard");
  const [users, oauth] = await Promise.all([listUsers(), Promise.resolve(oauthConfig())]);
  const authEnabled = process.env.VARYNTH_AUTH_ENABLED === "true";
  const workspaceEnabled = process.env.VARYNTH_GOOGLE_WORKSPACE_ENABLED === "true";

  return <PageLayout title="Administração" subtitle="Controles exclusivos do proprietário">
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <Surface tone="raised" className="border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[var(--vly-accent)]"><ShieldCheck size={18} /><span className="text-xs font-black uppercase tracking-wider">Área restrita</span></div>
            <h1 className="mt-2 text-xl font-black text-[var(--vly-text-primary)]">Central do proprietário</h1>
            <p className="mt-1 text-sm text-[var(--vly-text-secondary)]">Você está conectado como {session.user?.email}. Nenhum segredo é exibido nesta tela.</p>
          </div>
          <Status active label="CONFIGURAÇÃO PENDENTE" />
        </div>
      </Surface>

      <AdminTabs
        overview={<>
          <div className="grid gap-3 sm:grid-cols-3">
            <Surface tone="panel" className="p-4"><Users size={17} className="text-[var(--vly-info)]" /><p className="mt-3 text-2xl font-black text-[var(--vly-text-primary)]">{users.length}</p><p className="text-xs text-[var(--vly-text-muted)]">conta(s) cadastrada(s)</p></Surface>
            <Surface tone="panel" className="p-4"><KeyRound size={17} className="text-[var(--vly-accent)]" /><p className="mt-3 text-sm font-bold text-[var(--vly-text-primary)]">Login da plataforma</p><div className="mt-2"><Status active={authEnabled} label="AGUARDANDO ATIVAÇÃO" /></div></Surface>
            <Surface tone="panel" className="p-4"><Database size={17} className="text-[var(--vly-success)]" /><p className="mt-3 text-sm font-bold text-[var(--vly-text-primary)]">Banco seguro</p><div className="mt-2"><Status active={oauth.store.persistent} label="VERIFICAR" /></div></Surface>
          </div>
          <Surface tone="panel" className="mt-4 p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"><Activity size={16} className="text-[var(--vly-success)]" /> Integrações e segurança</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Surface tone="raised" className="p-3"><p className="font-bold text-[var(--vly-text-secondary)]">Google OAuth</p><p className="mt-1 text-[11px] text-[var(--vly-text-muted)]">{oauth.configured ? "Configurado para conexão" : `Falta: ${oauth.missing.join(", ")}`}</p></Surface>
              <Surface tone="raised" className="p-3"><p className="font-bold text-[var(--vly-text-secondary)]">Gmail e Drive</p><p className="mt-1 text-[11px] text-[var(--vly-text-muted)]">{workspaceEnabled ? "Leitura protegida habilitada" : "Aguardando APIs Google e ativação"}</p></Surface>
            </div>
          </Surface>
        </>}
        accounts={<AccountApprovalManagement users={users} />}
        pendingAccounts={users.filter((user) => user.status === "pending").length}
        team={<div className="space-y-4">
          <Surface tone="panel" className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"><Users size={16} className="text-[var(--vly-info)]" /> Pessoas autorizadas</h2>
            <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-[var(--vly-text-muted)]"><tr><th className="pb-2">Nome</th><th className="pb-2">E-mail</th><th className="pb-2">Entrada</th><th className="pb-2">Perfil</th></tr></thead><tbody>{users.length ? users.map((user) => <tr key={user.id} className="border-t border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)]"><td className="py-3">{user.name}</td><td className="py-3">{user.email}</td><td className="py-3">{user.provider === "google" ? "Google" : "Senha"}</td><td className="py-3"><span className={user.role === "owner" ? "text-[var(--vly-accent)]" : user.role === "developer" ? "text-[var(--vly-info)]" : "text-[var(--vly-text-muted)]"}>{user.role === "owner" ? "Proprietário" : user.role === "developer" ? "Desenvolvedor" : "Cliente"}</span></td></tr>) : <tr><td colSpan={4} className="py-5 text-[var(--vly-text-muted)]">A primeira conta aparecerá aqui após o primeiro login autorizado.</td></tr>}</tbody></table></div>
          </Surface>
          <DeveloperManagement users={users} />
        </div>}
        personalization={<div className="space-y-4"><EnvironmentPersonalization account /><AppIconSettings /></div>}
      />
    </div>
  </PageLayout>;
}
