"use client";

import React, { useMemo, useState } from "react";
import type { AudioEventDefinition, GameAudioPackage, GameAudioPackageIssue, VariationGroup } from "@/lib/studio/audio/game-audio-domain";
import { Search, Volume2, Users } from "lucide-react";

interface GameAudioBrowserProps {
  packageData: GameAudioPackage;
  issues?: GameAudioPackageIssue[];
  onSelectEvent: (event: AudioEventDefinition) => void;
}

function matchesText(values: Array<string | undefined>, query: string): boolean {
  return !query || values.some((value) => value?.toLocaleLowerCase().includes(query));
}

export function GameAudioBrowser({ packageData, issues = [], onSelectEvent }: GameAudioBrowserProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const groups = useMemo(() => packageData.variationGroups.filter((group) => matchesText([group.id, group.name, group.category, ...group.variations.flatMap((variation) => [variation.id, variation.assetId, ...variation.tags])], normalizedQuery)), [normalizedQuery, packageData.variationGroups]);
  const events = useMemo(() => packageData.events.filter((event) => matchesText([event.id, event.name, event.trackId, event.clipId, event.variationGroupId, ...(event.assetIds || [])], normalizedQuery)), [normalizedQuery, packageData.events]);

  const openMember = (group: VariationGroup, assetId: string) => {
    const event = packageData.events.find((candidate) => candidate.variationGroupId === group.id && candidate.assetIds?.includes(assetId));
    if (event) onSelectEvent(event);
  };

  return <section className="h-full min-h-0 overflow-auto bg-[#090a14] p-5 text-slate-200" aria-label="Game Audio Browser">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Game Audio · Grupos e eventos</h2>
        <p className="mt-1 text-xs text-slate-400">Inspecione os dados do pacote local antes de exportar; selecione um evento para voltar ao clip de origem.</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded border border-[#272844] bg-[#111222] px-3 py-2"><b className="block text-cyan-200">{packageData.assets.length}</b>assets</div>
        <div className="rounded border border-[#272844] bg-[#111222] px-3 py-2"><b className="block text-cyan-200">{packageData.events.length}</b>eventos</div>
        <div className="rounded border border-[#272844] bg-[#111222] px-3 py-2"><b className="block text-cyan-200">{packageData.variationGroups.length}</b>grupos</div>
      </div>
    </header>

    <label className="mb-5 flex max-w-2xl items-center gap-2 rounded-lg border border-[#303650] bg-[#121324] px-3 py-2 text-xs text-slate-400">
      <Search size={14} />
      <input aria-label="Pesquisar grupos e eventos Game Audio" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar grupo, tag, asset ou evento" className="min-w-0 flex-1 bg-transparent text-white outline-none" />
      {query && <button type="button" onClick={() => setQuery("")} className="text-cyan-300 hover:text-white">Limpar</button>}
    </label>

    <div className={`mb-5 rounded border px-3 py-2 text-[10px] ${issues.length ? "border-amber-600/40 bg-amber-950/20 text-amber-200" : "border-emerald-700/40 bg-emerald-950/20 text-emerald-200"}`} role="status">
      {issues.length ? <><b>Pacote ainda não validado ({issues.length} problemas).</b><ul className="mt-1 list-disc pl-4">{issues.slice(0, 5).map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul></> : "Pacote local válido para exportação de metadados. Os arquivos binários permanecem dependências locais."}
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <section aria-label="Grupos de variação" className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-300"><Users size={14} /> Grupos de variação ({groups.length})</h3>
        {groups.map((group) => <article key={group.id} className="rounded-lg border border-[#282b45] bg-[#111222] p-3">
          <header className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0"><h4 className="truncate text-sm font-medium text-white">{group.name}</h4><p className="text-[10px] text-slate-500">{group.category} · seed {group.seed ?? 0} · {group.variations.length} membros</p></div>
            <span className="rounded bg-cyan-950/60 px-2 py-1 font-mono text-[10px] text-cyan-200">Σ {group.variations.reduce((sum, variation) => sum + variation.weight, 0)}</span>
          </header>
          <ul className="space-y-1.5">
            {group.variations.filter((variation) => matchesText([variation.id, variation.assetId, ...variation.tags], normalizedQuery)).map((variation) => <li key={variation.id} className="flex min-w-0 items-center justify-between gap-2 rounded border border-[#202238] bg-[#0c0d18] px-2 py-1.5">
              <div className="min-w-0"><p className="truncate font-mono text-[10px] text-slate-300">{variation.assetId}</p><p className="truncate text-[9px] text-slate-500">{variation.tags.length ? variation.tags.join(" · ") : "sem tags"}</p></div>
              <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400">peso {variation.weight}</span><button type="button" onClick={() => openMember(group, variation.assetId)} disabled={!packageData.events.some((event) => event.variationGroupId === group.id && event.assetIds?.includes(variation.assetId))} className="rounded bg-[#1d2440] px-2 py-1 text-[9px] text-cyan-200 enabled:hover:bg-cyan-800/60 disabled:cursor-not-allowed disabled:opacity-40">Abrir clip</button></div>
            </li>)}
          </ul>
        </article>)}
        {!groups.length && <p className="rounded border border-dashed border-[#303650] p-4 text-xs text-slate-500">{normalizedQuery ? "Nenhum grupo corresponde à busca." : "Ainda não há grupos. Defina o mesmo grupo em duas ou mais faixas no painel de propriedades."}</p>}
      </section>

      <section aria-label="Eventos de áudio" className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-300"><Volume2 size={14} /> Eventos ({events.length})</h3>
        {events.map((event) => <article key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#282b45] bg-[#111222] p-3">
          <div className="min-w-0"><h4 className="truncate text-sm font-medium text-white">{event.name}</h4><p className="truncate font-mono text-[9px] text-slate-500">{event.id} · {event.trigger || "PLAY"} · {event.variationGroupId || "sem grupo"}</p><p className="mt-1 text-[10px] text-slate-400">{event.assetIds?.length || 0} assets · volume {event.volumeRange.join("–")} · velocidade {event.pitchRange.join("–")}{event.loop ? ` · loop ${event.loop.startMs}–${event.loop.endMs} ms / crossfade ${event.loop.crossfadeMs} ms` : ""}</p>{event.conditions?.length ? <p className="mt-1 truncate text-[10px] text-amber-200">Condições: {event.conditions.map((condition) => `${condition.variableId} ${condition.operator} ${String(condition.value)}`).join(" · ")}</p> : <p className="mt-1 text-[10px] text-slate-600">Sem condições de estado</p>}</div>
          <button type="button" onClick={() => onSelectEvent(event)} className="shrink-0 rounded bg-violet-700 px-3 py-2 text-[10px] font-medium text-white hover:bg-violet-600">Abrir origem</button>
        </article>)}
        {!events.length && <p className="rounded border border-dashed border-[#303650] p-4 text-xs text-slate-500">{normalizedQuery ? "Nenhum evento corresponde à busca." : "Sem eventos de áudio nesta timeline."}</p>}
      </section>
    </div>
  </section>;
}
