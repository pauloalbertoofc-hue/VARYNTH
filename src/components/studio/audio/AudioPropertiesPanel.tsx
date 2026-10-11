"use client";

import React, { useEffect, useState } from "react";
import { AudioClip, AudioTrack } from "@/lib/studio/audio/types";
import type { AudioEventCondition, AudioEventConditionOperator } from "@/lib/studio/audio/game-audio-domain";
import { parseGameAudioTags } from "@/lib/studio/audio/game-audio-domain";
import type { SamplerDefinition } from "@/lib/studio/audio/sampler-domain";
import { Sliders, Volume2, Scissors, Copy, Trash2, Clock, Music } from "lucide-react";

interface AudioPropertiesPanelProps {
  selectedClip?: AudioClip;
  selectedClips?: AudioClip[];
  selectedClipTracks?: AudioTrack[];
  selectedTrack?: AudioTrack;
  samplerDefinitions?: SamplerDefinition[];
  playheadMs: number;
  onUpdateClip: (clipId: string, updates: Partial<AudioClip>) => void;
  onUpdateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  onBulkUpdateClips?: (updates: Array<{ clipId: string; updates: Partial<AudioClip> }>) => void;
  onBulkUpdateTracks?: (trackIds: string[], updates: Partial<AudioTrack>) => void;
  onSplitClipAtPlayhead?: (clipId: string) => void;
  onDeleteClip?: (clipId: string) => void;
}

export function AudioPropertiesPanel({
  selectedClip,
  selectedClips = [],
  selectedClipTracks = [],
  selectedTrack,
  samplerDefinitions = [],
  playheadMs,
  onUpdateClip,
  onUpdateTrack,
  onBulkUpdateClips,
  onBulkUpdateTracks,
  onSplitClipAtPlayhead,
  onDeleteClip,
}: AudioPropertiesPanelProps) {
  const selectedClipTagsKey = (selectedClip?.gameAudioTags || []).join("\u001f");
  const selectedClipSelectionKey = selectedClips.map((clip) => clip.id).join("\u001f");
  const commonBulkTags = new Set(selectedClips.map((clip) => (clip.gameAudioTags || []).join("\u001f"))).size === 1 ? (selectedClips[0]?.gameAudioTags || []).join(", ") : "";
  const [clipTagsDraft, setClipTagsDraft] = useState(selectedClip?.gameAudioTags?.join(", ") || "");
  const [bulkTagsDraft, setBulkTagsDraft] = useState(commonBulkTags);
  const [conditionVariable, setConditionVariable] = useState("");
  const [conditionOperator, setConditionOperator] = useState<AudioEventConditionOperator>("EQUALS");
  const [conditionValue, setConditionValue] = useState("");
  useEffect(() => setClipTagsDraft(selectedClipTagsKey.split("\u001f").join(", ")), [selectedClip?.id, selectedClipTagsKey]);
  useEffect(() => setBulkTagsDraft(commonBulkTags), [selectedClipSelectionKey, commonBulkTags]);
  const conditions = selectedClip?.gameAudioConditions || [];
  const addCondition = () => { if (!selectedClip || !conditionVariable.trim() || !conditionValue.trim()) return; const value = ["GREATER_THAN", "LESS_THAN"].includes(conditionOperator) && Number.isFinite(Number(conditionValue)) ? Number(conditionValue) : conditionValue; onUpdateClip(selectedClip.id, { gameAudioConditions: [...conditions, { variableId: conditionVariable.trim(), operator: conditionOperator, value }] }); setConditionVariable(""); setConditionValue(""); };
  if (!selectedClip && !selectedTrack) {
    return (
      <div role="status" className="flex h-full items-center justify-center bg-[var(--vly-surface)] p-6 text-center text-xs italic text-[var(--vly-text-muted)]">
        Selecione uma faixa ou clip na timeline para editar parâmetros e propriedades.
      </div>
    );
  }

  return (
    <aside aria-label="Propriedades de áudio" className="flex h-full flex-col select-none space-y-5 overflow-y-auto bg-[var(--vly-surface)] p-4 text-xs text-[var(--vly-text-secondary)]">
      {selectedClips.length > 1 && <fieldset className="space-y-3 rounded-lg border border-[var(--vly-border-info)] bg-[var(--vly-info)]/10 p-3" aria-label="Edição em lote Game Audio">
        <legend className="px-1 text-[11px] font-semibold uppercase text-[var(--vly-info)]">Game Audio · lote ({selectedClips.length} clips)</legend>
        <label className="block text-[10px] text-[var(--vly-text-muted)]">Grupo nas faixas selecionadas
          <input aria-label="Grupo de variação em lote" placeholder="vazio = misto; digite para aplicar" value={new Set(selectedClipTracks.map((track) => track.variationGroup || "")).size === 1 ? selectedClipTracks[0]?.variationGroup || "" : ""} onChange={(event) => onBulkUpdateTracks?.([...new Set(selectedClipTracks.map((track) => track.id))], { variationGroup: event.target.value.trim() || undefined })} className="vly-field mt-1 w-full p-2" />
        </label>
        <label className="block text-[10px] text-[var(--vly-text-muted)]">Seed compartilhada
          <input aria-label="Seed de variação em lote" type="number" placeholder="mista" value={new Set(selectedClipTracks.map((track) => track.variationSeed ?? 0)).size === 1 ? selectedClipTracks[0]?.variationSeed ?? 0 : ""} onChange={(event) => { const seed = Number(event.target.value); if (Number.isFinite(seed)) onBulkUpdateTracks?.([...new Set(selectedClipTracks.map((track) => track.id))], { variationSeed: seed }); }} className="vly-field mt-1 w-full p-2" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-[var(--vly-text-secondary)]">Peso aplicado
            <input aria-label="Peso em lote" type="number" min="0" step="0.1" placeholder="misto" value={new Set(selectedClips.map((clip) => clip.variationWeight ?? 1)).size === 1 ? selectedClips[0]?.variationWeight ?? 1 : ""} onChange={(event) => { const weight = Number(event.target.value); if (Number.isFinite(weight) && weight >= 0) onBulkUpdateClips?.(selectedClips.map((clip) => ({ clipId: clip.id, updates: { variationWeight: weight } }))); }} className="vly-field mt-1 w-full p-2" />
          </label>
          <div className="text-[9px] text-[var(--vly-text-muted)] self-end pb-2">Aplica-se somente aos clips selecionados; demais clips e assets permanecem intactos.</div>
        </div>
          <label className="block text-[10px] text-[var(--vly-text-secondary)]">Tags das variações selecionadas
            <input aria-label="Tags Game Audio em lote" placeholder="misto; separe por vírgula" value={bulkTagsDraft} onChange={(event) => setBulkTagsDraft(event.target.value)} onBlur={() => { const tags = parseGameAudioTags(bulkTagsDraft); onBulkUpdateClips?.(selectedClips.map((clip) => ({ clipId: clip.id, updates: { gameAudioTags: tags } }))); }} className="vly-field mt-1 w-full p-2" />
        </label>
        {(["gameAudioVolumeRange", "gameAudioPitchRange"] as const).map((field) => {
          const isVolume = field === "gameAudioVolumeRange";
          const title = isVolume ? "Volume" : "Velocidade";
          const ranges = selectedClips.map((clip) => clip[field] || (isVolume ? [clip.gain, clip.gain] : [clip.playbackRate ?? 1, clip.playbackRate ?? 1]));
          const min = isVolume ? 0 : 0.05;
          return <div key={field} className="grid grid-cols-2 gap-2">
            {[0, 1].map((edge) => {
              const values = ranges.map((range) => range[edge]);
              const common = values.every((value) => value === values[0]);
              return <label key={edge} className="text-[9px] text-slate-500">{title} {edge ? "máx." : "mín."}
                <input aria-label={`${title} ${edge ? "máximo" : "mínimo"} em lote`} type="number" min={min} max="4" step="0.05" placeholder={common ? undefined : "misto"} value={common ? values[0] : ""} onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value)) return;
                  const updates = selectedClips.map((clip) => {
                    const current = clip[field] || (isVolume ? [clip.gain, clip.gain] as [number, number] : [clip.playbackRate ?? 1, clip.playbackRate ?? 1] as [number, number]);
                    const bounded = Math.min(4, Math.max(min, value));
                    const next: [number, number] = edge ? [Math.min(current[0], bounded), bounded] : [bounded, Math.max(current[1], bounded)];
                    return { clipId: clip.id, updates: { [field]: next } };
                  });
                  onBulkUpdateClips?.(updates);
                }} className="mt-1 w-full rounded border border-[#303650] bg-[#121324] p-1.5 text-white" />
              </label>;
            })}
          </div>;
        })}
      </fieldset>}
      {/* Clip Properties */}
      {selectedClip && (
        <div className="space-y-4">
          {selectedTrack && <div className="space-y-2 border-b border-[#1c1d32] pb-3" aria-label="Game Audio variation controls">
              <span className="text-[11px] font-semibold uppercase text-[var(--vly-info)]">Game Audio · Variações e evento</span>
                <label className="block text-[10px] text-[var(--vly-text-secondary)]">Grupo desta faixa
                <input aria-label="Grupo de variação" value={selectedTrack.variationGroup || ""} onChange={(event) => { const value = event.target.value.trim(); onUpdateTrack(selectedTrack.id, { variationGroup: value || undefined }); }} placeholder="ex.: footsteps" className="mt-1 w-full rounded border border-[#303650] bg-[#121324] p-2 text-white" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-slate-400">Peso
                  <input aria-label="Peso da variação" type="number" min="0" step="0.1" value={selectedClip.variationWeight ?? 1} onChange={(event) => onUpdateClip(selectedClip.id, { variationWeight: Math.max(0, Number(event.target.value) || 0) })} className="mt-1 w-full rounded border border-[#303650] bg-[#121324] p-2 text-white" />
                </label>
                <label className="text-[10px] text-slate-400">Seed
                  <input aria-label="Seed da variação" type="number" step="1" value={selectedTrack.variationSeed ?? 0} onChange={(event) => onUpdateTrack(selectedTrack.id, { variationSeed: Number(event.target.value) || 0 })} className="mt-1 w-full rounded border border-[#303650] bg-[#121324] p-2 text-white" />
                </label>
                <label className="text-[10px] text-slate-400">Política
                  <select aria-label="Política de seleção da variação" value={selectedTrack.variationSelectionMode || "sequence"} onChange={(event) => onUpdateTrack(selectedTrack.id, { variationSelectionMode: event.target.value as "weighted" | "sequence" })} className="mt-1 w-full rounded border border-[#303650] bg-[#121324] p-2 text-white"><option value="sequence">Sequência sem repetição imediata</option><option value="weighted">Sorteio ponderado</option></select>
                </label>
              </div>
              <label className="block text-[10px] text-slate-400">Tags específicas desta variação
                <input aria-label="Tags Game Audio do clip" value={clipTagsDraft} onChange={(event) => setClipTagsDraft(event.target.value)} onBlur={() => onUpdateClip(selectedClip.id, { gameAudioTags: parseGameAudioTags(clipTagsDraft) })} placeholder="ex.: madeira, passos" className="mt-1 w-full rounded border border-[#303650] bg-[#121324] p-2 text-white" />
              </label>
              <fieldset className="space-y-2 border-t border-[#1c1d32] pt-2" aria-label="Condições do evento de áudio"><legend className="text-[10px] text-slate-400">Condições do evento</legend>{conditions.map((condition, index) => <div key={`${condition.variableId}-${index}`} className="flex items-center gap-1 rounded bg-[#121324] p-1 text-[9px]"><span className="flex-1 truncate text-cyan-200">{condition.variableId} {condition.operator} {String(condition.value)}</span><button type="button" aria-label={`Remover condição ${index + 1}`} onClick={() => onUpdateClip(selectedClip.id, { gameAudioConditions: conditions.filter((_, conditionIndex) => conditionIndex !== index) })} className="rounded bg-rose-900/60 px-1.5 py-1 text-[9px]">×</button></div>)}<div className="grid grid-cols-3 gap-1"><input aria-label="Variável da condição" value={conditionVariable} onChange={(event) => setConditionVariable(event.target.value)} placeholder="variável" className="rounded border border-[#303650] bg-[#121324] p-1.5 text-[9px] text-white" /><select aria-label="Operador da condição" value={conditionOperator} onChange={(event) => setConditionOperator(event.target.value as AudioEventConditionOperator)} className="rounded border border-[#303650] bg-[#121324] p-1.5 text-[9px] text-white"><option value="EQUALS">=</option><option value="NOT_EQUALS">≠</option><option value="GREATER_THAN">&gt;</option><option value="LESS_THAN">&lt;</option><option value="CONTAINS">contém</option></select><input aria-label="Valor da condição" value={conditionValue} onChange={(event) => setConditionValue(event.target.value)} placeholder="valor" className="rounded border border-[#303650] bg-[#121324] p-1.5 text-[9px] text-white" /></div><button type="button" onClick={addCondition} disabled={!conditionVariable.trim() || !conditionValue.trim()} className="rounded bg-cyan-800 px-2 py-1 text-[9px] disabled:opacity-40">Adicionar condição</button></fieldset>
              <fieldset className="space-y-1 border-t border-[#1c1d32] pt-2">
                <legend className="text-[10px] text-slate-400">Randomização do evento exportado</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["gameAudioVolumeRange", "gameAudioPitchRange"] as const).map((field) => {
                    const fallback = field === "gameAudioVolumeRange" ? [selectedClip.gain, selectedClip.gain] as [number, number] : [selectedClip.playbackRate ?? 1, selectedClip.playbackRate ?? 1] as [number, number];
                    const range = selectedClip[field] || fallback;
                    const title = field === "gameAudioVolumeRange" ? "Volume" : "Velocidade";
                    return <React.Fragment key={field}><label className="text-[9px] text-slate-500">{title} mín.
                      <input aria-label={`Evento ${title.toLowerCase()} mínimo`} type="number" min={field === "gameAudioVolumeRange" ? 0 : 0.05} max="4" step="0.05" value={range[0]} onChange={(event) => onUpdateClip(selectedClip.id, { [field]: [Math.max(field === "gameAudioVolumeRange" ? 0 : 0.05, Math.min(Number(event.target.value) || 0, range[1])), range[1]] })} className="mt-1 w-full rounded border border-[#303650] bg-[#121324] p-1.5 text-white" />
                    </label><label className="text-[9px] text-slate-500">{title} máx.
                      <input aria-label={`Evento ${title.toLowerCase()} máximo`} type="number" min={field === "gameAudioVolumeRange" ? 0 : 0.05} max="4" step="0.05" value={range[1]} onChange={(event) => onUpdateClip(selectedClip.id, { [field]: [range[0], Math.min(4, Math.max(range[0], Number(event.target.value) || 0))] })} className="mt-1 w-full rounded border border-[#303650] bg-[#121324] p-1.5 text-white" />
                    </label></React.Fragment>;
                  })}
                </div>
                <p className="text-[9px] text-slate-500">Valores exportados: volume 0–4× e velocidade 0.05–4× do asset.</p>
              </fieldset>
              <p className="text-[9px] text-slate-500">Faixas com o mesmo grupo geram uma seleção ponderada e reproduzível no Game Studio.</p>
            </div>}
          <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-2">
            <div className="max-w-[160px] truncate font-semibold text-[var(--vly-text-primary)]">
              {selectedClip.name || "Clip Selecionado"}
            </div>
            <span className="rounded border border-[var(--vly-border-info)] bg-[var(--vly-info)]/10 px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--vly-info)]">
              CLIP
            </span>
          </div>

          {/* Temporal Boundaries */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--vly-text-muted)]">
              <Clock size={13} className="text-[var(--vly-info)]" />
              Posicionamento Temporal
            </span>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
                <span className="text-[10px] text-[var(--vly-text-muted)]">Início:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.sourceStartMs)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { timelineStartMs: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="vly-field w-16 bg-transparent text-right text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
                <span className="text-[10px] text-[var(--vly-text-muted)]">Duração:</span>
                <span className="text-right text-xs text-[var(--vly-text-primary)]">
                  {Math.round((selectedClip.sourceEndMs - selectedClip.sourceStartMs) / 1000)}s
                </span>
              </div>
            </div>
          </div>

          {/* Non-destructive Trim bounds */}
          <div className="space-y-2 border-t border-[var(--vly-border-subtle)] pt-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--vly-text-muted)]">
              <Scissors size={13} className="text-[var(--vly-warning)]" />
              Recorte Não-Destrutivo (Trim)
            </span>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
                <span className="text-[10px] text-[var(--vly-text-muted)]">Trim In:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.sourceStartMs)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { sourceStartMs: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="vly-field w-16 bg-transparent text-right text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
                <span className="text-[10px] text-[var(--vly-text-muted)]">Trim Out:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.sourceEndMs)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { sourceEndMs: Math.max(selectedClip.sourceStartMs + 100, parseInt(e.target.value) || 0) })
                  }
                  className="vly-field w-16 bg-transparent text-right text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Gain & Fades */}
          <div className="space-y-2 border-t border-[var(--vly-border-subtle)] pt-3">
            <label className="flex items-center gap-2 text-[11px] text-[var(--vly-text-secondary)]"><input type="checkbox" aria-label="Loop deste clip" checked={Boolean(selectedClip.loop?.enabled)} onChange={(event) => onUpdateClip(selectedClip.id, { loop: { enabled: event.target.checked, startMs: selectedClip.loop?.startMs ?? selectedClip.sourceStartMs, endMs: selectedClip.loop?.endMs ?? selectedClip.sourceEndMs, crossfadeMs: selectedClip.loop?.crossfadeMs || 0 } })} /> Loop deste clip</label>
            {selectedClip.loop?.enabled && <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-[var(--vly-text-muted)]">Início da região (ms)
                  <input aria-label="Início do loop em ms" type="number" min={selectedClip.sourceStartMs} max={(selectedClip.loop.endMs ?? selectedClip.sourceEndMs) - 1} value={Math.round(selectedClip.loop.startMs ?? selectedClip.sourceStartMs)} onChange={(event) => { const endMs = selectedClip.loop!.endMs ?? selectedClip.sourceEndMs; const startMs = Math.max(selectedClip.sourceStartMs, Math.min(endMs - 1, Number(event.target.value) || selectedClip.sourceStartMs)); onUpdateClip(selectedClip.id, { loop: { ...selectedClip.loop!, startMs, crossfadeMs: Math.min(selectedClip.loop!.crossfadeMs || 0, (endMs - startMs) / 2) } }); }} className="vly-field mt-1 w-full p-2" />
                </label>
                <label className="text-[10px] text-[var(--vly-text-muted)]">Fim da região (ms)
                  <input aria-label="Fim do loop em ms" type="number" min={(selectedClip.loop.startMs ?? selectedClip.sourceStartMs) + 1} max={selectedClip.sourceEndMs} value={Math.round(selectedClip.loop.endMs ?? selectedClip.sourceEndMs)} onChange={(event) => { const startMs = selectedClip.loop!.startMs ?? selectedClip.sourceStartMs; const endMs = Math.max(startMs + 1, Math.min(selectedClip.sourceEndMs, Number(event.target.value) || selectedClip.sourceEndMs)); onUpdateClip(selectedClip.id, { loop: { ...selectedClip.loop!, endMs, crossfadeMs: Math.min(selectedClip.loop!.crossfadeMs || 0, (endMs - startMs) / 2) } }); }} className="vly-field mt-1 w-full p-2" />
                </label>
              </div>
              <label className="block text-[10px] text-[var(--vly-text-muted)]">Crossfade (ms)
                <input aria-label="Crossfade do loop em ms" type="number" min="0" max={Math.floor(((selectedClip.loop.endMs ?? selectedClip.sourceEndMs) - (selectedClip.loop.startMs ?? selectedClip.sourceStartMs)) / 2)} value={selectedClip.loop.crossfadeMs || 0} onChange={(event) => { const startMs = selectedClip.loop!.startMs ?? selectedClip.sourceStartMs; const endMs = selectedClip.loop!.endMs ?? selectedClip.sourceEndMs; onUpdateClip(selectedClip.id, { loop: { ...selectedClip.loop!, crossfadeMs: Math.max(0, Math.min((endMs - startMs) / 2, Number(event.target.value) || 0)) } }); }} className="vly-field mt-1 w-full p-2" />
              </label>
              <p className="text-[9px] text-[var(--vly-text-muted)]">Região em milissegundos do arquivo-fonte. O crossfade mistura o fim ao início sem alterar o asset original.</p>
            </>}
          </div>

          {/* Gain & Fades */}
          <div className="space-y-3 border-t border-[var(--vly-border-subtle)] pt-2">
            <div className="flex items-center justify-between text-[11px] text-[var(--vly-text-muted)]">
              <span className="flex items-center gap-1">
                <Volume2 size={12} /> Ganho do Clip
              </span>
              <span className="font-mono text-[var(--vly-text-primary)]">{Math.round((selectedClip.gain ?? 1.0) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={Math.round((selectedClip.gain ?? 1.0) * 100)}
              onChange={(e) => onUpdateClip(selectedClip.id, { gain: (parseInt(e.target.value) || 0) / 100 })}
              className="h-1.5 w-full cursor-pointer rounded-lg bg-[var(--vly-surface-raised)] accent-[var(--vly-info)]"
            />

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
              <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 text-[10px]">Fade In (ms):</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.fadeInMs || 0)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { fadeInMs: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="vly-field w-12 bg-transparent text-right text-xs outline-none"
                />
              </div>

              <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 text-[10px]">Fade Out:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.fadeOutMs || 0)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { fadeOutMs: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-12 bg-transparent text-right text-white text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Clip Actions */}
          <div className="flex items-center gap-2 border-t border-[var(--vly-border-subtle)] pt-3">
            {onSplitClipAtPlayhead && (
              <button
                onClick={() => onSplitClipAtPlayhead(selectedClip.id)}
                className="vly-interactive flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] py-1.5 text-xs font-semibold text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)]"
                title="Dividir clip na posição atual da agulha (Playhead)"
              >
                <Scissors size={12} />
                Dividir na Agulha
              </button>
            )}

            {onDeleteClip && (
              <button
                onClick={() => onDeleteClip(selectedClip.id)}
                className="vly-interactive rounded-lg border border-[var(--vly-border-danger)] bg-[var(--vly-danger)]/10 p-1.5 text-[var(--vly-danger)] transition hover:bg-[var(--vly-danger)]/20"
                title="Remover Clip"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Track Properties */}
      {selectedTrack && !selectedClip && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-2">
            <div className="max-w-[160px] truncate font-semibold text-[var(--vly-text-primary)]">{selectedTrack.name}</div>
            <span className="rounded border border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/10 px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--vly-accent)]">
              {selectedTrack.type}
            </span>
          </div>

          <div className="space-y-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--vly-text-muted)]">
              <Sliders size={13} className="text-[var(--vly-accent)]" />
              Parâmetros da Faixa
            </span>

            {["INSTRUMENT", "MIDI", "MUSIC"].includes(selectedTrack.type) && <label className="block text-[10px] text-[var(--vly-text-muted)]">Instrumento melódico
              <select aria-label="Instrumento melódico" value={selectedTrack.samplerDefinitionId || ""} onChange={(event) => onUpdateTrack(selectedTrack.id, { samplerDefinitionId: event.target.value || undefined })} className="vly-field mt-1 w-full p-2 text-xs">
                <option value="">Synth local</option>
                {samplerDefinitions.map((sampler) => <option key={sampler.id} value={sampler.id}>{sampler.name}</option>)}
              </select>
              <span className="mt-1 block text-[9px] text-[var(--vly-text-muted)]">O sampler usa a nota-raiz, faixa MIDI, envelope e loop definidos em Sound Design.</span>
            </label>}

            <div>
              <span className="mb-1 block text-[10px] text-[var(--vly-text-muted)]">Nome da Faixa</span>
              <input
                type="text"
                value={selectedTrack.name}
                onChange={(e) => onUpdateTrack(selectedTrack.id, { name: e.target.value })}
                className="vly-field w-full px-2.5 py-1.5 text-xs outline-none focus:border-[var(--vly-border-accent)]"
              />
            </div>

            <div className="flex items-center justify-between pt-2 text-[11px] text-[var(--vly-text-muted)]">
              <span>Volume Master da Faixa</span>
              <span className="font-mono text-[var(--vly-text-primary)]">{Math.round((selectedTrack.volume ?? 1.0) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              value={Math.round((selectedTrack.volume ?? 1.0) * 100)}
              onChange={(e) => onUpdateTrack(selectedTrack.id, { volume: (parseInt(e.target.value) || 0) / 100 })}
              className="h-1.5 w-full cursor-pointer rounded-lg bg-[var(--vly-surface-raised)] accent-[var(--vly-accent)]"
            />
            <div className="space-y-2 border-t border-[var(--vly-border-subtle)] pt-3">
              <span className="text-[11px] font-semibold uppercase text-[var(--vly-text-muted)]">Inserts / Efeitos</span>
              {(selectedTrack.effects || []).map((effect) => {
                const updated = selectedTrack.effects.map((item) => item.id === effect.id ? { ...item, enabled: !item.enabled } : item);
                return <div key={effect.id} className="space-y-1 rounded border border-[#252844] p-2"><div className="flex items-center gap-1"><button onClick={() => onUpdateTrack(selectedTrack.id, { effects: updated })} className={`flex-1 rounded px-2 py-1 text-left text-[10px] ${effect.enabled ? "bg-emerald-900/40 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>{effect.type}</button><button onClick={() => onUpdateTrack(selectedTrack.id, { effects: selectedTrack.effects.filter((item) => item.id !== effect.id) })} className="rounded bg-rose-950/40 px-2 py-1 text-[10px] text-rose-300">×</button></div><input aria-label={`${effect.type} parâmetro`} type="number" placeholder="valor" value={Number(effect.parameters.value ?? "")} onChange={(e) => onUpdateTrack(selectedTrack.id, { effects: selectedTrack.effects.map((item) => item.id === effect.id ? { ...item, parameters: { ...item.parameters, value: Number(e.target.value) } } : item) })} className="w-full rounded bg-[#121324] px-2 py-1 text-[10px] text-white" /></div>;
              })}
              <select aria-label="Adicionar efeito" defaultValue="" onChange={(e) => { const type = e.target.value; if (!type) return; onUpdateTrack(selectedTrack.id, { effects: [...(selectedTrack.effects || []), { id: `effect-${Date.now()}`, type, enabled: true, parameters: {} }] }); e.target.value = ""; }} className="w-full rounded bg-[#121324] px-2 py-1 text-[10px] text-slate-300"><option value="">Adicionar efeito…</option><option value="GAIN">Gain</option><option value="EQ">EQ</option><option value="COMPRESSOR">Compressor</option><option value="LIMITER">Limiter</option><option value="HIGH_PASS">High-pass</option><option value="LOW_PASS">Low-pass</option><option value="DELAY">Delay</option><option value="REVERB">Reverb procedural</option></select>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
