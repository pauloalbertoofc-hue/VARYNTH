"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { assetManager } from "@/lib/artifacts/asset-manager";
import type { AudioAssetProjectMetadata } from "@/lib/studio/audio/types";
import { applyAudioProjectMetadata, audioAssetBpm, audioAssetCategories, audioAssetChannels, audioAssetCharacter, audioAssetDurationMs, audioAssetKey, audioAssetSampleRate, audioAssetTags, getAudioAssetFacets, searchAudioAssets } from "@/lib/studio/audio/audio-asset-library";

interface AudioAssetBrowserProps {
  artifactId: string;
  onInsert?: (assetId: string) => void | Promise<void>;
  projectMetadata?: Record<string, AudioAssetProjectMetadata>;
  onProjectMetadataChange?: (assetId: string, metadata: AudioAssetProjectMetadata) => void;
}

export function AudioAssetBrowser({ artifactId, onInsert, projectMetadata = {}, onProjectMetadataChange }: AudioAssetBrowserProps) {
  const [assets, setAssets] = useState(() => assetManager.listAssetsForArtifact(artifactId));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [character, setCharacter] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [sampleRate, setSampleRate] = useState("");
  const [channels, setChannels] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inserting, setInserting] = useState<Record<string, boolean>>({});
  const [inserted, setInserted] = useState<Record<string, boolean>>({});
  const [editingAssetId, setEditingAssetId] = useState<string>();
  const [metadataDraft, setMetadataDraft] = useState<AudioAssetProjectMetadata>({});
  const [metadataError, setMetadataError] = useState<string>();
  const [metadataSavedAssetId, setMetadataSavedAssetId] = useState<string>();
  const urlsRef = useRef(urls);
  urlsRef.current = urls;

  useEffect(() => {
    const refreshAssets = () => setAssets(assetManager.listAssetsForArtifact(artifactId));
    refreshAssets();
    window.addEventListener("varynth:asset-metadata-updated", refreshAssets);
    return () => window.removeEventListener("varynth:asset-metadata-updated", refreshAssets);
  }, [artifactId]);
  useEffect(() => () => Object.values(urlsRef.current).forEach((url) => URL.revokeObjectURL(url)), []);

  const projectAssets = useMemo(() => assets.map((asset) => applyAudioProjectMetadata(asset, projectMetadata[asset.id])), [assets, projectMetadata]);
  const facets = useMemo(() => getAudioAssetFacets(projectAssets), [projectAssets]);
  const visibleAssets = useMemo(() => searchAudioAssets(projectAssets, { query, category, tag, character, bpm, key, minDurationMs: minDuration === "" ? undefined : Number(minDuration), maxDurationMs: maxDuration === "" ? undefined : Number(maxDuration), sampleRate, channels }), [projectAssets, query, category, tag, character, bpm, key, minDuration, maxDuration, sampleRate, channels]);
  const invalidDurationRange = minDuration !== "" && maxDuration !== "" && Number(minDuration) > Number(maxDuration);
  const refresh = () => setAssets(assetManager.listAssetsForArtifact(artifactId));
  const resetFilters = () => { setQuery(""); setCategory(""); setTag(""); setCharacter(""); setBpm(""); setKey(""); setMinDuration(""); setMaxDuration(""); setSampleRate(""); setChannels(""); };

  const startMetadataEdit = (assetId: string) => {
    const asset = projectAssets.find((item) => item.id === assetId);
    if (!asset) return;
    const metadata = asset.metadata || {};
    setMetadataDraft({ category: audioAssetCategories(asset)[0] || "", tags: audioAssetTags(asset), character: audioAssetCharacter(asset), bpm: audioAssetBpm(asset) ? Number(audioAssetBpm(asset)) : undefined, key: audioAssetKey(asset), licenseClaim: String(metadata.projectLicenseClaim || ""), attribution: String(metadata.projectAttribution || ""), notes: String(metadata.projectNotes || "") });
    setMetadataError(undefined);
    setMetadataSavedAssetId(undefined);
    setEditingAssetId(assetId);
  };

  const saveMetadata = (assetId: string) => {
    if (!onProjectMetadataChange) return;
    const bpmValue = metadataDraft.bpm;
    if (bpmValue !== undefined && bpmValue !== null && (!Number.isFinite(bpmValue) || bpmValue < 1 || bpmValue > 1000)) {
      setMetadataError("BPM deve ser um número entre 1 e 1000.");
      return;
    }
    const next: AudioAssetProjectMetadata = {
      category: String(metadataDraft.category || "").trim(),
      tags: [...new Set((metadataDraft.tags || []).flatMap((value) => String(value).split(/[,;|]/)).map((value) => value.trim()).filter(Boolean))],
      character: String(metadataDraft.character || "").trim(),
      bpm: bpmValue ?? null,
      key: String(metadataDraft.key || "").trim(),
      licenseClaim: String(metadataDraft.licenseClaim || "").trim(),
      attribution: String(metadataDraft.attribution || "").trim(),
      notes: String(metadataDraft.notes || "").trim(),
    };
    onProjectMetadataChange(assetId, next);
    setMetadataSavedAssetId(assetId);
    setEditingAssetId(undefined);
    setMetadataError(undefined);
  };

  const insert = async (assetId: string) => {
    if (!onInsert || inserting[assetId]) return;
    setInserting((current) => ({ ...current, [assetId]: true }));
    setErrors((current) => ({ ...current, [assetId]: "" }));
    setInserted((current) => ({ ...current, [assetId]: false }));
    try {
      await onInsert(assetId);
      setInserted((current) => ({ ...current, [assetId]: true }));
    } catch (error) {
      setErrors((current) => ({ ...current, [assetId]: error instanceof Error ? error.message : "Não foi possível inserir este asset." }));
    } finally {
      setInserting((current) => ({ ...current, [assetId]: false }));
    }
  };

  const preview = async (assetId: string) => {
    setErrors((current) => ({ ...current, [assetId]: "" }));
    try {
      const data = await assetManager.getAssetData(assetId);
      if (!data) throw new Error("O conteúdo deste asset não está disponível no armazenamento.");
      if (urlsRef.current[assetId]) return;
      const blob = data instanceof Blob ? data : new Blob([typeof data === "string" ? await (await fetch(data)).arrayBuffer() : data]);
      const url = URL.createObjectURL(blob);
      setUrls((current) => ({ ...current, [assetId]: url }));
    } catch (error) {
      setErrors((current) => ({ ...current, [assetId]: error instanceof Error ? error.message : "Não foi possível abrir este asset." }));
    }
  };

  return <div className="flex h-full flex-col gap-2 overflow-y-auto bg-[#0b0c16] p-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-xs font-semibold text-slate-200">Biblioteca sonora <span className="font-normal text-slate-500">{visibleAssets.length}/{assets.length}</span></h2>
      <button type="button" onClick={refresh} className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300">Atualizar</button>
    </div>
    <label className="sr-only" htmlFor="audio-asset-search">Pesquisar assets de áudio</label>
    <input id="audio-asset-search" aria-label="Pesquisar assets de áudio" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="rain · forest · Euterpe happy · 120 BPM · C minor" className="w-full rounded border border-[#303650] bg-[#111528] px-2 py-1.5 text-xs text-white placeholder:text-slate-600" />
    <div className="grid grid-cols-2 gap-1.5">
      <label className="sr-only" htmlFor="audio-asset-category">Categoria</label>
      <select id="audio-asset-category" aria-label="Filtrar assets por categoria" value={category} onChange={(event) => setCategory(event.target.value)} className="min-w-0 rounded border border-[#252844] bg-[#111326] px-1.5 py-1 text-[10px] text-slate-300"><option value="">Todas as categorias</option>{facets.categories.map((item) => <option key={item}>{item}</option>)}</select>
      <label className="sr-only" htmlFor="audio-asset-tag">Tag</label>
      <select id="audio-asset-tag" aria-label="Filtrar assets por tag" value={tag} onChange={(event) => setTag(event.target.value)} className="min-w-0 rounded border border-[#252844] bg-[#111326] px-1.5 py-1 text-[10px] text-slate-300"><option value="">Todas as tags</option>{facets.tags.map((item) => <option key={item}>{item}</option>)}</select>
      {facets.characters.length > 0 && <><label className="sr-only" htmlFor="audio-asset-character">Personagem</label><select id="audio-asset-character" aria-label="Filtrar assets por personagem" value={character} onChange={(event) => setCharacter(event.target.value)} className="min-w-0 rounded border border-[#252844] bg-[#111326] px-1.5 py-1 text-[10px] text-slate-300"><option value="">Todos os personagens</option>{facets.characters.map((item) => <option key={item}>{item}</option>)}</select></>}
      {facets.bpms.length > 0 && <><label className="sr-only" htmlFor="audio-asset-bpm">BPM</label><select id="audio-asset-bpm" aria-label="Filtrar assets por BPM" value={bpm} onChange={(event) => setBpm(event.target.value)} className="min-w-0 rounded border border-[#252844] bg-[#111326] px-1.5 py-1 text-[10px] text-slate-300"><option value="">Todos os BPM</option>{facets.bpms.map((item) => <option key={item}>{item}</option>)}</select></>}
      {facets.keys.length > 0 && <><label className="sr-only" htmlFor="audio-asset-key">Tonalidade</label><select id="audio-asset-key" aria-label="Filtrar assets por tonalidade" value={key} onChange={(event) => setKey(event.target.value)} className="min-w-0 rounded border border-[#252844] bg-[#111326] px-1.5 py-1 text-[10px] text-slate-300"><option value="">Todas as tonalidades</option>{facets.keys.map((item) => <option key={item}>{item}</option>)}</select></>}
      <label className="text-[9px] text-slate-500">Duração mín. (ms)<input aria-label="Duração mínima do asset (ms)" type="number" min="0" value={minDuration} onChange={(event) => setMinDuration(event.target.value)} className="mt-0.5 w-full rounded border border-[#252844] bg-[#111326] px-1.5 py-1 text-[10px] text-slate-300" /></label>
      <label className="text-[9px] text-slate-500">Duração máx. (ms)<input aria-label="Duração máxima do asset (ms)" type="number" min="0" value={maxDuration} onChange={(event) => setMaxDuration(event.target.value)} className="mt-0.5 w-full rounded border border-[#252844] bg-[#111326] px-1.5 py-1 text-[10px] text-slate-300" /></label>
      <label className="sr-only" htmlFor="audio-asset-sample-rate">Taxa de amostragem</label><select id="audio-asset-sample-rate" aria-label="Filtrar por taxa de amostragem" value={sampleRate} onChange={(event) => setSampleRate(event.target.value)} className="min-w-0 rounded border border-[#252844] bg-[#111326] px-1.5 py-1 text-[10px] text-slate-300"><option value="">Todas as taxas (medidas)</option>{facets.sampleRates.map((item) => <option key={item} value={item}>{item} Hz</option>)}</select>
      <label className="sr-only" htmlFor="audio-asset-channels">Canais</label><select id="audio-asset-channels" aria-label="Filtrar por número de canais" value={channels} onChange={(event) => setChannels(event.target.value)} className="min-w-0 rounded border border-[#252844] bg-[#111326] px-1.5 py-1 text-[10px] text-slate-300"><option value="">Todos os canais (medidos)</option>{facets.channels.map((item) => <option key={item} value={item}>{item} ch</option>)}</select>
    </div>
    {(query || category || tag || character || bpm || key || minDuration || maxDuration || sampleRate || channels) && <button type="button" onClick={resetFilters} className="self-start text-[10px] text-cyan-300 hover:text-cyan-200">Limpar filtros</button>}
    {invalidDurationRange && <p role="alert" className="text-[10px] text-rose-300">A duração mínima não pode ser maior que a duração máxima.</p>}
    <div className="min-h-0 flex-1 space-y-2">
      {assets.length === 0 ? <div className="py-6 text-center text-xs italic text-slate-500">Nenhum asset de áudio vinculado.</div> : visibleAssets.length === 0 ? <div role="status" className="py-6 text-center text-xs text-slate-500">Nenhum asset corresponde aos filtros.</div> : visibleAssets.map((asset) => {
        const metadata = asset.metadata || {};
        const tags = audioAssetTags(asset);
        const categories = audioAssetCategories(asset);
        return <article key={asset.id} className="space-y-1.5 rounded-lg border border-[#252844] bg-[#111326] p-2">
          <div className="flex items-center justify-between gap-2"><span className="truncate text-xs text-white" title={asset.name}>{asset.name}</span><span className="shrink-0 text-[9px] text-slate-500">{asset.mimeType}</span></div>
          <div className="text-[10px] text-slate-400">{audioAssetDurationMs(asset) === undefined ? "Duração não medida" : `${Math.round(audioAssetDurationMs(asset)!)}ms`} · {audioAssetSampleRate(asset) === undefined ? "Taxa não medida" : `${audioAssetSampleRate(asset)}Hz`} · {audioAssetChannels(asset) === undefined ? "Canais não medidos" : `${audioAssetChannels(asset)}ch`} · {asset.sizeBytes} bytes</div>
          <div className="flex flex-wrap gap-1">{categories.map((item) => <span key={item} className="rounded bg-cyan-950/50 px-1 py-0.5 text-[9px] text-cyan-200">{item}</span>)}{tags.map((item) => <span key={item} className="rounded bg-slate-800 px-1 py-0.5 text-[9px] text-slate-300">#{item}</span>)}{audioAssetCharacter(asset) && <span className="rounded bg-fuchsia-950/50 px-1 py-0.5 text-[9px] text-fuchsia-200">{audioAssetCharacter(asset)}</span>}{audioAssetBpm(asset) && <span className="rounded bg-slate-800 px-1 py-0.5 text-[9px] text-slate-300">{audioAssetBpm(asset)} BPM</span>}{audioAssetKey(asset) && <span className="rounded bg-slate-800 px-1 py-0.5 text-[9px] text-slate-300">{audioAssetKey(asset)}</span>}</div>
          {(Boolean(metadata.license) || Boolean(metadata.provider) || metadata.loopable === true || Boolean(metadata.projectLicenseClaim) || Boolean(metadata.projectAttribution)) && <div className="text-[9px] text-slate-500">{metadata.loopable === true ? `Loop ${String(metadata.loopStartMs ?? 0)}–${String(metadata.loopEndMs ?? metadata.durationMs ?? "?")}ms · ` : ""}{metadata.provider ? `Origem: ${String(metadata.provider)} · ` : ""}{metadata.license ? `Licença de origem: ${String(metadata.license)} · ` : ""}{metadata.projectLicenseClaim ? `Declaração do projeto (não verificada): ${String(metadata.projectLicenseClaim)} · ` : ""}{metadata.projectAttribution ? `Atribuição do projeto: ${String(metadata.projectAttribution)}` : ""}</div>}
          <div className="flex flex-wrap gap-1"><button type="button" onClick={() => void preview(asset.id)} className="rounded bg-blue-900/40 px-2 py-1 text-[10px] text-blue-200">{urls[asset.id] ? "Reabrir preview" : "Preview"}</button>{onInsert && <button type="button" disabled={inserting[asset.id]} onClick={() => void insert(asset.id)} className="rounded bg-emerald-900/40 px-2 py-1 text-[10px] text-emerald-200 disabled:cursor-wait disabled:opacity-60">{inserting[asset.id] ? "Inserindo…" : inserted[asset.id] ? "Inserido ✓" : "Inserir"}</button>}{onProjectMetadataChange && <button type="button" onClick={() => startMetadataEdit(asset.id)} className="rounded bg-violet-900/40 px-2 py-1 text-[10px] text-violet-200">{editingAssetId === asset.id ? "Editando metadados" : "Editar metadados"}</button>}</div>
          {metadataSavedAssetId === asset.id && <p role="status" className="text-[10px] text-emerald-300">Anotações salvas somente neste projeto.</p>}
          {editingAssetId === asset.id && <section aria-label={`Metadados editoriais de ${asset.name}`} className="space-y-2 rounded border border-violet-900/60 bg-[#0c0d18] p-2">
            <p className="text-[9px] text-slate-500">Anotações deste projeto; não alteram bytes, proveniência ou metadata compartilhada do asset.</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[9px] text-slate-500">Categoria<input aria-label={`Categoria do projeto para ${asset.name}`} value={metadataDraft.category || ""} onChange={(event) => setMetadataDraft((current) => ({ ...current, category: event.target.value }))} className="mt-0.5 w-full rounded border border-[#303650] bg-[#111326] p-1.5 text-[10px] text-white" /></label>
              <label className="text-[9px] text-slate-500">Tags<input aria-label={`Tags do projeto para ${asset.name}`} value={(metadataDraft.tags || []).join(", ")} onChange={(event) => setMetadataDraft((current) => ({ ...current, tags: event.target.value.split(/[,;|]/) }))} className="mt-0.5 w-full rounded border border-[#303650] bg-[#111326] p-1.5 text-[10px] text-white" /></label>
              <label className="text-[9px] text-slate-500">Personagem<input aria-label={`Personagem do projeto para ${asset.name}`} value={metadataDraft.character || ""} onChange={(event) => setMetadataDraft((current) => ({ ...current, character: event.target.value }))} className="mt-0.5 w-full rounded border border-[#303650] bg-[#111326] p-1.5 text-[10px] text-white" /></label>
              <label className="text-[9px] text-slate-500">BPM<input aria-label={`BPM do projeto para ${asset.name}`} type="number" min="1" max="1000" value={metadataDraft.bpm ?? ""} onChange={(event) => setMetadataDraft((current) => ({ ...current, bpm: event.target.value === "" ? undefined : Number(event.target.value) }))} className="mt-0.5 w-full rounded border border-[#303650] bg-[#111326] p-1.5 text-[10px] text-white" /></label>
              <label className="text-[9px] text-slate-500">Tonalidade<input aria-label={`Tonalidade do projeto para ${asset.name}`} value={metadataDraft.key || ""} onChange={(event) => setMetadataDraft((current) => ({ ...current, key: event.target.value }))} className="mt-0.5 w-full rounded border border-[#303650] bg-[#111326] p-1.5 text-[10px] text-white" /></label>
              <label className="text-[9px] text-slate-500">Declaração de licença<input aria-label={`Declaração de licença para ${asset.name}`} value={metadataDraft.licenseClaim || ""} onChange={(event) => setMetadataDraft((current) => ({ ...current, licenseClaim: event.target.value }))} className="mt-0.5 w-full rounded border border-[#303650] bg-[#111326] p-1.5 text-[10px] text-white" /></label>
              <label className="text-[9px] text-slate-500">Atribuição<input aria-label={`Atribuição para ${asset.name}`} value={metadataDraft.attribution || ""} onChange={(event) => setMetadataDraft((current) => ({ ...current, attribution: event.target.value }))} className="mt-0.5 w-full rounded border border-[#303650] bg-[#111326] p-1.5 text-[10px] text-white" /></label>
              <label className="col-span-2 text-[9px] text-slate-500">Notas<textarea aria-label={`Notas do projeto para ${asset.name}`} value={metadataDraft.notes || ""} onChange={(event) => setMetadataDraft((current) => ({ ...current, notes: event.target.value }))} rows={2} className="mt-0.5 w-full rounded border border-[#303650] bg-[#111326] p-1.5 text-[10px] text-white" /></label>
            </div>
            <p className="text-[9px] text-amber-300">A declaração de licença é uma anotação do usuário, não uma verificação jurídica. A licença de origem e os dados do provider permanecem intactos.</p>
            {metadataError && <p role="alert" className="text-[10px] text-rose-300">{metadataError}</p>}
            <div className="flex gap-2"><button type="button" onClick={() => saveMetadata(asset.id)} className="rounded bg-violet-700 px-2 py-1 text-[10px] text-white">Salvar metadados do projeto</button><button type="button" onClick={() => { setEditingAssetId(undefined); setMetadataError(undefined); }} className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300">Cancelar</button></div>
          </section>}
          {inserted[asset.id] && <p role="status" className="text-[10px] text-emerald-300">Asset inserido na faixa selecionada.</p>}
          {errors[asset.id] && <p role="alert" className="text-[10px] text-rose-300">{errors[asset.id]}</p>}
          {urls[asset.id] && <audio controls src={urls[asset.id]} className="w-full" aria-label={`Preview de ${asset.name}`} />}
        </article>;
      })}
    </div>
  </div>;
}
