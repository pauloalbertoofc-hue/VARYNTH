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

function Status({ active, label }: { active: boolean; label: string }) {
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${active ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{active ? "ATIVO" : label}</span>;
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
      <section className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-violet-300"><ShieldCheck size={18} /><span className="text-xs font-black uppercase tracking-wider">Área restrita</span></div>
            <h1 className="mt-2 text-xl font-black text-white">Central do proprietário</h1>
            <p className="mt-1 text-sm text-slate-400">Você está conectado como {session.user?.email}. Nenhum segredo é exibido nesta tela.</p>
          </div>
          <Status active label="CONFIGURAÇÃO PENDENTE" />
        </div>
      </section>

      <AdminTabs
        overview={<>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-[#292940] bg-[#11111b] p-4"><Users size={17} className="text-cyan-300" /><p className="mt-3 text-2xl font-black text-white">{users.length}</p><p className="text-xs text-slate-500">conta(s) cadastrada(s)</p></article>
            <article className="rounded-xl border border-[#292940] bg-[#11111b] p-4"><KeyRound size={17} className="text-violet-300" /><p className="mt-3 text-sm font-bold text-white">Login da plataforma</p><div className="mt-2"><Status active={authEnabled} label="AGUARDANDO ATIVAÇÃO" /></div></article>
            <article className="rounded-xl border border-[#292940] bg-[#11111b] p-4"><Database size={17} className="text-emerald-300" /><p className="mt-3 text-sm font-bold text-white">Banco seguro</p><div className="mt-2"><Status active={oauth.store.persistent} label="VERIFICAR" /></div></article>
          </div>
          <section className="mt-4 rounded-2xl border border-[#292940] bg-[#11111b] p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Activity size={16} className="text-emerald-300" /> Integrações e segurança</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-[#25253a] bg-[#09090f] p-3"><p className="font-bold text-slate-200">Google OAuth</p><p className="mt-1 text-[11px] text-slate-500">{oauth.configured ? "Configurado para conexão" : `Falta: ${oauth.missing.join(", ")}`}</p></div>
              <div className="rounded-xl border border-[#25253a] bg-[#09090f] p-3"><p className="font-bold text-slate-200">Gmail e Drive</p><p className="mt-1 text-[11px] text-slate-500">{workspaceEnabled ? "Leitura protegida habilitada" : "Aguardando APIs Google e ativação"}</p></div>
            </div>
          </section>
        </>}
        accounts={<AccountApprovalManagement users={users} />}
        pendingAccounts={users.filter((user) => user.status === "pending").length}
        team={<div className="space-y-4">
          <section className="rounded-2xl border border-[#292940] bg-[#11111b] p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Users size={16} className="text-cyan-300" /> Pessoas autorizadas</h2>
            <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="pb-2">Nome</th><th className="pb-2">E-mail</th><th className="pb-2">Entrada</th><th className="pb-2">Perfil</th></tr></thead><tbody>{users.length ? users.map((user) => <tr key={user.id} className="border-t border-[#25253a] text-slate-300"><td className="py-3">{user.name}</td><td className="py-3">{user.email}</td><td className="py-3">{user.provider === "google" ? "Google" : "Senha"}</td><td className="py-3"><span className={user.role === "owner" ? "text-violet-300" : user.role === "developer" ? "text-cyan-300" : "text-slate-500"}>{user.role === "owner" ? "Proprietário" : user.role === "developer" ? "Desenvolvedor" : "Cliente"}</span></td></tr>) : <tr><td colSpan={4} className="py-5 text-slate-500">A primeira conta aparecerá aqui após o primeiro login autorizado.</td></tr>}</tbody></table></div>
          </section>
          <DeveloperManagement users={users} />
        </div>}
        personalization={<div className="space-y-4"><EnvironmentPersonalization account /><AppIconSettings /></div>}
      />
    </div>
  </PageLayout>;
}
