"use client";
import { useState } from "react";
import { assetManager } from "@/lib/artifacts/asset-manager";
import { SamplerDefinition, validateSamplerDefinition } from "@/lib/studio/audio/sampler-domain";
import { LocalSamplerInstrument } from "@/lib/studio/audio/instrument-engine";

async function previewSampler(definition: SamplerDefinition): Promise<void> {
  if (typeof window === "undefined") throw new Error("[SAMPLER_RUNTIME_UNAVAILABLE] Pré-escuta requer um navegador.");
  const Constructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) throw new Error("[SAMPLER_RUNTIME_UNAVAILABLE] AudioContext não está disponível.");
  const raw = await assetManager.getAssetData(definition.assetId);
  if (!raw) throw new Error(`[SAMPLER_ASSET_UNAVAILABLE] Asset '${definition.assetId}' não está disponível.`);
  const context = new Constructor();
  try {
    await context.resume();
    const buffer = await context.decodeAudioData(raw.slice(0));
    const instrument = new LocalSamplerInstrument(definition, context);
    instrument.loadBuffer(buffer);
    instrument.noteOn({ midi: definition.rootMidi, velocity: 100 });
    await new Promise((resolve) => window.setTimeout(resolve, Math.min(1800, Math.max(250, buffer.duration * 1000))));
    instrument.noteOff(definition.rootMidi);
    await new Promise((resolve) => window.setTimeout(resolve, Math.max(40, definition.envelope.releaseMs + 40)));
    instrument.dispose();
  } finally {
    await context.close();
  }
}

export function SamplerPanel({ definitions, onChange, onPreview = previewSampler }: { definitions: SamplerDefinition[]; onChange: (definitions: SamplerDefinition[]) => void; onPreview?: (definition: SamplerDefinition) => Promise<void> }) {
  const [name, setName] = useState(""); const [assetId, setAssetId] = useState(""); const [rootMidi, setRootMidi] = useState(60); const [minMidi, setMinMidi] = useState(0); const [maxMidi, setMaxMidi] = useState(127); const [message, setMessage] = useState<string>(); const [previewing, setPreviewing] = useState<string>();
  const preview = async (definition: SamplerDefinition) => { if (!onPreview) return; setPreviewing(definition.id); setMessage(undefined); try { await onPreview(definition); setMessage(`Pré-escuta reproduzida: ${definition.name}.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível reproduzir o sampler."); } finally { setPreviewing(undefined); } };
  const create = () => { try { const definition = validateSamplerDefinition({ id: `sampler-${Date.now()}`, name, assetId, rootMidi, minMidi, maxMidi, envelope: { attackMs: 5, decayMs: 80, sustain: 0.8, releaseMs: 120 }, gain: 1 }); onChange([...definitions, definition]); setName(""); setAssetId(""); setMessage("Sampler salvo no projeto."); } catch (error) { setMessage(error instanceof Error ? error.message : "Definição de sampler inválida."); } };
  return <section className="mt-5 max-w-3xl rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-3" aria-label="Sampler"><h3 className="text-xs font-semibold text-fuchsia-200">Sampler local</h3><p className="mt-1 text-[10px] text-slate-400">Mapeie um asset de áudio real para tocar melodicamente. O asset não é duplicado.</p><div className="mt-3 grid gap-2 md:grid-cols-5"><input aria-label="Nome do sampler" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" className="rounded border border-[#303650] bg-[#111528] px-2 py-1 text-[10px] text-white" /><input aria-label="Asset do sampler" value={assetId} onChange={(event) => setAssetId(event.target.value)} placeholder="assetId" className="rounded border border-[#303650] bg-[#111528] px-2 py-1 text-[10px] text-white" /><input aria-label="Root MIDI do sampler" type="number" min="0" max="127" value={rootMidi} onChange={(event) => setRootMidi(Number(event.target.value))} className="rounded border border-[#303650] bg-[#111528] px-2 py-1 text-[10px] text-white" /><input aria-label="MIDI mínimo do sampler" type="number" min="0" max="127" value={minMidi} onChange={(event) => setMinMidi(Number(event.target.value))} className="rounded border border-[#303650] bg-[#111528] px-2 py-1 text-[10px] text-white" /><input aria-label="MIDI máximo do sampler" type="number" min="0" max="127" value={maxMidi} onChange={(event) => setMaxMidi(Number(event.target.value))} className="rounded border border-[#303650] bg-[#111528] px-2 py-1 text-[10px] text-white" /></div><button type="button" disabled={!name.trim() || !assetId.trim()} onClick={create} className="mt-3 rounded bg-fuchsia-700 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40">Adicionar sampler</button>{message && <p role="status" className="mt-2 text-[10px] text-fuchsia-200">{message}</p>}<div className="mt-3 space-y-1">{definitions.map((definition) => <div key={definition.id} className="flex items-center justify-between gap-2 rounded bg-[#111326] px-2 py-1 text-[10px]"><span className="text-slate-200">{definition.name} · {definition.assetId} · C{definition.rootMidi}</span><div className="flex gap-1"><button type="button" disabled={!onPreview || Boolean(previewing)} onClick={() => void preview(definition)} className="rounded bg-fuchsia-800/70 px-2 py-1 text-fuchsia-100 disabled:opacity-40">{previewing === definition.id ? "Tocando…" : "Pré-escuta"}</button><button type="button" onClick={() => onChange(definitions.filter((item) => item.id !== definition.id))} className="rounded bg-rose-900/60 px-2 py-1 text-rose-200">Remover</button></div></div>)}</div></section>;
}
