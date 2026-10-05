"use client";

import { useEffect, useState } from "react";
import type { KnowledgeItem } from "@/lib/knowledge";
import type { DomainDefinition } from "@/lib/knowledge/domain-registry";

type Patch = Pick<KnowledgeItem, "primaryDomain" | "relatedDomains" | "categories" | "tags" | "sensitivity"> & { visibility: Exclude<KnowledgeItem["visibility"], "SYSTEM">; ownerAgent: string };

const VISIBILITIES: Patch["visibility"][] = ["PRIVATE", "AGENT_PRIVATE", "PROJECT", "DOMAIN", "CROSS_DOMAIN", "PUBLIC_TO_AGENTS"];
const SENSITIVITIES: KnowledgeItem["sensitivity"][] = ["PUBLIC", "INTERNAL", "SENSITIVE", "PRIVATE"];
const split = (value: string) => value.split(",").map((entry) => entry.trim()).filter(Boolean);

export function KnowledgeGovernanceControl({ item, domains, busy, onSave }: { item: KnowledgeItem; domains: DomainDefinition[]; busy: boolean; onSave: (patch: Patch) => void }) {
  const [primaryDomain, setPrimaryDomain] = useState(item.primaryDomain);
  const [relatedDomains, setRelatedDomains] = useState(item.relatedDomains.join(", "));
  const [ownerAgent, setOwnerAgent] = useState(item.ownerAgent || "");
  const [visibility, setVisibility] = useState<Patch["visibility"]>(item.visibility === "SYSTEM" ? "DOMAIN" : item.visibility);
  const [sensitivity, setSensitivity] = useState(item.sensitivity);
  const [categories, setCategories] = useState(item.categories.join(", "));
  const [tags, setTags] = useState(item.tags.join(", "));

  useEffect(() => {
    setPrimaryDomain(item.primaryDomain); setRelatedDomains(item.relatedDomains.join(", "));
    setOwnerAgent(item.ownerAgent || ""); setVisibility(item.visibility === "SYSTEM" ? "DOMAIN" : item.visibility); setSensitivity(item.sensitivity);
    setCategories(item.categories.join(", ")); setTags(item.tags.join(", "));
  }, [item]);

  const field = "rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-slate-200";
  return <div className="grid gap-2 md:grid-cols-2">
    <label className="grid gap-1 text-[10px] text-slate-400">Domínio principal
      <select aria-label={`Domínio de ${item.title}`} value={primaryDomain} onChange={(event) => setPrimaryDomain(event.target.value)} className={field}>{domains.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select>
    </label>
    <label className="grid gap-1 text-[10px] text-slate-400">Domínios relacionados (separados por vírgula)
      <input aria-label={`Domínios relacionados de ${item.title}`} value={relatedDomains} onChange={(event) => setRelatedDomains(event.target.value)} className={field} />
    </label>
    <label className="grid gap-1 text-[10px] text-slate-400">Owner (ID do agente)
      <input aria-label={`Owner de ${item.title}`} value={ownerAgent} onChange={(event) => setOwnerAgent(event.target.value.toLowerCase())} placeholder="ex.: euterpe" className={field} />
    </label>
    <label className="grid gap-1 text-[10px] text-slate-400">Visibilidade
      <select aria-label={`Visibilidade de ${item.title}`} value={visibility} onChange={(event) => setVisibility(event.target.value as Patch["visibility"])} className={field}>{VISIBILITIES.map((value) => <option key={value} disabled={value === "PUBLIC_TO_AGENTS" && item.visibility !== "PUBLIC_TO_AGENTS"}>{value === "PUBLIC_TO_AGENTS" ? `${value} (use Publicar)` : value}</option>)}</select>
    </label>
    <label className="grid gap-1 text-[10px] text-slate-400">Sensibilidade
      <select aria-label={`Sensibilidade de ${item.title}`} value={sensitivity} onChange={(event) => setSensitivity(event.target.value as KnowledgeItem["sensitivity"])} className={field}>{SENSITIVITIES.map((value) => <option key={value}>{value}</option>)}</select>
    </label>
    <label className="grid gap-1 text-[10px] text-slate-400">Categorias
      <input aria-label={`Categorias de ${item.title}`} value={categories} onChange={(event) => setCategories(event.target.value)} className={field} />
    </label>
    <label className="grid gap-1 text-[10px] text-slate-400 md:col-span-2">Tags
      <input aria-label={`Tags de ${item.title}`} value={tags} onChange={(event) => setTags(event.target.value)} className={field} />
    </label>
    <div className="flex justify-end md:col-span-2"><button type="button" disabled={busy || Boolean(ownerAgent.trim()) && !/^[a-z0-9][a-z0-9._-]{0,79}$/u.test(ownerAgent.trim())} onClick={() => onSave({ primaryDomain, relatedDomains: split(relatedDomains).filter((value) => value !== primaryDomain), ownerAgent: ownerAgent.trim(), visibility, sensitivity, categories: split(categories), tags: split(tags) })} className="rounded border border-violet-500/30 px-3 py-1.5 text-[10px] text-violet-200 disabled:opacity-50">Salvar classificação e governança</button></div>
  </div>;
}
