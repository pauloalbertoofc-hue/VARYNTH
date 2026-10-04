"use client";

import type { KnowledgeTaxonomyNode } from "@/lib/knowledge/taxonomy";

function TaxonomyNode({ node, selectedDomain, onSelect }: {
  node: KnowledgeTaxonomyNode;
  selectedDomain: string;
  onSelect: (domainId: string) => void;
}) {
  return <li className="min-w-0">
    <button type="button" aria-pressed={selectedDomain === node.domain.id} onClick={() => onSelect(node.domain.id)} className={`flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-xs ${selectedDomain === node.domain.id ? "bg-violet-500/15 text-violet-100" : "text-slate-300 hover:bg-white/[0.04]"}`}>
      <span className="min-w-0 truncate">{node.domain.label}<span className="ml-2 font-mono text-[9px] text-slate-500">{node.domain.id}</span></span>
      <span className="shrink-0 text-[10px] text-slate-500" title={`${node.directItemCount} neste domínio; ${node.subtreeItemCount} incluindo subdomínios`}>{node.subtreeItemCount}{node.children.length ? ` (${node.directItemCount} diretos)` : ""}</span>
    </button>
    {node.children.length > 0 && <ul className="ml-3 border-l border-white/10 pl-2">{node.children.map((child) => <TaxonomyNode key={child.domain.id} node={child} selectedDomain={selectedDomain} onSelect={onSelect} />)}</ul>}
  </li>;
}

export function KnowledgeTaxonomyTree({ roots, unmappedItemCount, selectedDomain, onSelect }: {
  roots: KnowledgeTaxonomyNode[];
  unmappedItemCount: number;
  selectedDomain: string;
  onSelect: (domainId: string) => void;
}) {
  return <section aria-labelledby="knowledge-taxonomy-title" className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.025] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="knowledge-taxonomy-title" className="text-sm font-semibold text-cyan-100">Taxonomia semântica do Vault</h2><p className="mt-1 text-[10px] text-slate-500">Árvore lógica derivada do Domain Registry; não move nem reorganiza os arquivos.</p></div><span className="text-[10px] text-slate-500">Contagens apenas dos itens autorizados no resultado atual</span></div>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <div><button type="button" aria-pressed={!selectedDomain} onClick={() => onSelect("")} className={`rounded px-2 py-1.5 text-xs ${!selectedDomain ? "bg-violet-500/15 text-violet-100" : "text-slate-300 hover:bg-white/[0.04]"}`}>Todos os domínios</button>
        {roots.length ? <ul className="mt-1 space-y-0.5">{roots.map((node) => <TaxonomyNode key={node.domain.id} node={node} selectedDomain={selectedDomain} onSelect={onSelect} />)}</ul> : <p className="mt-2 text-[10px] text-slate-500">Nenhum domínio registrado.</p>}
      </div>
      {unmappedItemCount > 0 && <div className="rounded border border-amber-500/15 p-3 text-[10px] text-amber-200">{unmappedItemCount} item(ns) autorizado(s) no resultado atual apontam para domínio não registrado. Eles não foram reassociados automaticamente.</div>}
    </div>
  </section>;
}
