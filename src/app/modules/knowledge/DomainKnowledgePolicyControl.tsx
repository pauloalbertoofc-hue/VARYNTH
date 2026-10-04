"use client";

import { useEffect, useState } from "react";
import type { DomainKnowledgePolicyConfig, DomainKnowledgeVisibility } from "@/lib/knowledge/domain-registry";

const VISIBILITIES: DomainKnowledgeVisibility[] = ["DOMAIN", "CROSS_DOMAIN", "PUBLIC_TO_AGENTS"];
const DEFAULT_POLICY: DomainKnowledgePolicyConfig = {
  publicKnowledge: true,
  allowedVisibility: VISIBILITIES,
  sensitivity: "PUBLIC_ONLY",
  allowedConsumers: ["*"],
};

export function DomainKnowledgePolicyControl({
  policy,
  disabled,
  onSave,
}: {
  policy?: DomainKnowledgePolicyConfig;
  disabled: boolean;
  onSave: (policy: DomainKnowledgePolicyConfig) => void;
}) {
  const [draft, setDraft] = useState<DomainKnowledgePolicyConfig>(policy || DEFAULT_POLICY);
  const [consumers, setConsumers] = useState((policy || DEFAULT_POLICY).allowedConsumers.join(", "));

  useEffect(() => {
    const next = policy || DEFAULT_POLICY;
    setDraft(next);
    setConsumers(next.allowedConsumers.join(", "));
  }, [policy]);

  function toggleVisibility(visibility: DomainKnowledgeVisibility) {
    setDraft((current) => ({
      ...current,
      allowedVisibility: current.allowedVisibility.includes(visibility)
        ? current.allowedVisibility.filter((value) => value !== visibility)
        : [...current.allowedVisibility, visibility],
    }));
  }

  return (
    <fieldset disabled={disabled} className="grid w-full gap-2 rounded border border-rose-500/15 bg-rose-500/[0.02] p-2 text-[10px]">
      <legend className="px-1 text-rose-200">Policy de conhecimento do domínio</legend>
      <label className="flex items-center gap-2 text-slate-300">
        <input type="checkbox" checked={draft.publicKnowledge} onChange={(event) => setDraft((current) => ({ ...current, publicKnowledge: event.target.checked }))} />
        Conhecimento elegível a compartilhamento por policy
      </label>
      <div className="flex flex-wrap gap-3">
        {VISIBILITIES.map((visibility) => <label key={visibility} className="flex items-center gap-1 text-slate-400">
          <input type="checkbox" checked={draft.allowedVisibility.includes(visibility)} onChange={() => toggleVisibility(visibility)} />
          {visibility}
        </label>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Sensibilidade padrão do domínio" value={draft.sensitivity} onChange={(event) => setDraft((current) => ({ ...current, sensitivity: event.target.value as DomainKnowledgePolicyConfig["sensitivity"] }))} className="rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white">
          <option value="PUBLIC_ONLY">Somente público</option>
          <option value="INTERNAL">Interno</option>
          <option value="SENSITIVE">Sensível</option>
        </select>
        <input aria-label="Agentes consumidores da policy do domínio" value={consumers} onChange={(event) => setConsumers(event.target.value)} placeholder="* ou IDs de agentes separados por vírgula" className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white" />
        <button type="button" disabled={disabled} onClick={() => onSave({ ...draft, allowedConsumers: [...new Set(consumers.split(/[,;\n]/u).map((value) => value.trim()).filter(Boolean))] })} className="rounded border border-rose-500/30 px-2 py-1 text-rose-200 disabled:opacity-50">Salvar policy</button>
      </div>
      {draft.publicKnowledge && !draft.allowedConsumers.length && <p role="alert" className="text-rose-300">Informe pelo menos um agente consumidor ou * antes de salvar.</p>}
      {draft.publicKnowledge && draft.sensitivity !== "PUBLIC_ONLY" && <p className="text-amber-200">Capabilities públicas serão ocultadas enquanto a sensibilidade não for Somente público.</p>}
    </fieldset>
  );
}
