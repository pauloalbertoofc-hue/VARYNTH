"use client";

import { useState } from "react";
import type { KnowledgeItem, KnowledgeLifecycleState } from "@/lib/knowledge";
import { availableKnowledgeLifecycleTransitions } from "@/lib/knowledge/lifecycle";

export function KnowledgeLifecycleControl({ items, canManage, busyItem, onChange }: {
  items: KnowledgeItem[];
  canManage: boolean;
  busyItem: string | null;
  onChange: (item: KnowledgeItem, state: KnowledgeLifecycleState) => void;
}) {
  const [targets, setTargets] = useState<Record<string, KnowledgeLifecycleState>>({});
  return <section aria-labelledby="knowledge-lifecycle-title" className="rounded-xl border border-amber-500/15 bg-amber-500/[0.025] p-4">
    <div><h2 id="knowledge-lifecycle-title" className="text-sm font-semibold text-amber-100">Lifecycle e revisão de conhecimento</h2><p className="mt-1 text-[10px] text-slate-500">Itens STALE permanecem consultáveis com prioridade reduzida; DRAFT e REVIEW ficam limitados ao owner; ARCHIVED e DEPRECATED saem do retrieval.</p></div>
    <div className="mt-3 space-y-2">
      {items.length === 0 ? <p className="text-xs text-slate-500">Nenhum item autorizado nesta consulta.</p> : items.map((item) => {
        const current = item.lifecycleState || "ACTIVE";
        const target = targets[item.id] || current;
        return <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 px-3 py-2">
          <div className="min-w-0"><p className="truncate text-xs text-slate-200">{item.title}</p><p className="mt-1 text-[10px] text-slate-500">{item.primaryDomain} · {current} · {item.freshness}</p></div>
          {canManage && <div className="flex gap-2"><select aria-label={`Novo lifecycle de ${item.title}`} value={target} onChange={(event) => setTargets((value) => ({ ...value, [item.id]: event.target.value as KnowledgeLifecycleState }))} className="rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-slate-200">{availableKnowledgeLifecycleTransitions(current).map((state) => <option key={state} value={state}>{state}</option>)}</select><button type="button" disabled={busyItem === item.id || target === current} onClick={() => onChange(item, target)} className="rounded border border-amber-500/30 px-2 py-1 text-[10px] text-amber-100 disabled:opacity-40">Aplicar</button></div>}
        </div>;
      })}
    </div>
  </section>;
}
