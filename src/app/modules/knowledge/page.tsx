"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { domainRegistry } from "@/lib/knowledge";
import { knowledgeRepository } from "@/lib/persistence/repositories";
import type { KnowledgeItem } from "@/lib/knowledge";

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  useEffect(() => { void knowledgeRepository.getAll().then(setItems); }, []);
  const publicCount = items.filter((item) => item.visibility === "PUBLIC_TO_AGENTS").length;
  const domains = domainRegistry.listDomains();
  return <PageLayout title="Knowledge" subtitle="Mapa de domínios, autoridade e conhecimento compartilhável">
    <main className="p-6 space-y-6 animate-fade-in">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Domínios', domains.length], ['Itens locais', items.length], ['Públicos entre agentes', publicCount], ['Especialistas', new Set(domains.flatMap((domain) => domain.specialists)).size]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}
      </section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Domain Registry</h2>
        <p className="mt-1 text-xs text-slate-500">Athena conhece o mapa; o conteúdo continua protegido por policy.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{domains.map((domain) => <article key={domain.id} className="rounded-lg border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm text-violet-200">{domain.label}</h3><p className="mt-1 font-mono text-[10px] text-slate-500">{domain.id}</p></div><span className="rounded-full border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-300">{domain.primaryOwner || 'sem owner'}</span></div><div className="mt-3 flex flex-wrap gap-2">{domain.capabilities.map((capability) => <span key={capability} className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-400">{capability}</span>)}</div></article>)}</div>
      </section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5"><h2 className="text-sm font-semibold text-white">Knowledge Items</h2><div className="mt-4 space-y-2">{items.length === 0 ? <p className="text-xs text-slate-500">Nenhum item estruturado foi persistido ainda. O Vault continua funcionando normalmente.</p> : items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"><span className="text-xs text-slate-200">{item.title}</span><span className="text-[10px] text-slate-500">{item.primaryDomain} · {item.visibility}</span></div>)}</div></section>
    </main>
  </PageLayout>;
}
