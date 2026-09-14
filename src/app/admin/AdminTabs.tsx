"use client";

import { useState, type ReactNode } from "react";
import { Code2, Palette, ShieldCheck, UserRoundCheck } from "lucide-react";

type AdminTab = "overview" | "accounts" | "team" | "personalization";

const tabs: Array<{ id: AdminTab; label: string; icon: typeof ShieldCheck }> = [
  { id: "overview", label: "Visão geral", icon: ShieldCheck },
  { id: "accounts", label: "Contas", icon: UserRoundCheck },
  { id: "team", label: "Equipe e desenvolvedores", icon: Code2 },
  { id: "personalization", label: "Personalização", icon: Palette },
];

export function AdminTabs({ overview, accounts, team, personalization, pendingAccounts }: { overview: ReactNode; accounts: ReactNode; team: ReactNode; personalization: ReactNode; pendingAccounts: number }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const panels: Record<AdminTab, ReactNode> = { overview, accounts, team, personalization };

  return <div>
    <div role="tablist" aria-label="Seções da administração" className="mb-5 flex gap-2 overflow-x-auto border-b border-[#292940] pb-2">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} id={`admin-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`admin-panel-${id}`} onClick={() => setActiveTab(id)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${activeTab === id ? "border border-violet-400/25 bg-violet-500/10 text-violet-200" : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-white"}`}>
        <Icon size={14} />{label}{id === "accounts" && pendingAccounts > 0 && <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">{pendingAccounts}</span>}
      </button>)}
    </div>
    <section id={`admin-panel-${activeTab}`} role="tabpanel" aria-labelledby={`admin-tab-${activeTab}`}>
      {panels[activeTab]}
    </section>
  </div>;
}
