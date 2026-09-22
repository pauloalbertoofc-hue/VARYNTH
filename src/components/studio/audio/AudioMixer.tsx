"use client";

import React, { useEffect, useState } from "react";
import { AudioBus, AudioDocumentState, AudioSend } from "@/lib/studio/audio/types";
import { audioEngine } from "@/lib/studio/audio/audio-engine";

export function AudioMixer({ state, onChange }: { state: AudioDocumentState; onChange: (state: AudioDocumentState) => void }) {
  const [meter, setMeter] = useState({ peak: 0, rms: 0 });
  const [inputMeter, setInputMeter] = useState({ peak: 0, rms: 0 });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => { void audioEngine.listInputDevices().then(setDevices); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { setMeter(audioEngine.metering()); setInputMeter(audioEngine.inputMetering()); }, 100);
    return () => window.clearInterval(timer);
  }, []);

  const updateTrack = (id: string, patch: Record<string, unknown>) => onChange({ ...state, tracks: state.tracks.map((track) => track.id === id ? { ...track, ...patch } : track) });
  const updateBus = (id: string, patch: Record<string, unknown>) => onChange({ ...state, buses: (state.buses || []).map((bus) => bus.id === id ? { ...bus, ...patch } : bus) });
  const addBus = () => {
    const bus: AudioBus = { id: `bus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: `Bus ${(state.buses || []).length + 1}`, volume: 1, pan: 0, muted: false, solo: false, effects: [] };
    onChange({ ...state, buses: [...(state.buses || []), bus] });
  };
  const addSend = (trackId: string) => {
    const bus = state.buses?.[0];
    if (!bus) return;
    const track = state.tracks.find((item) => item.id === trackId);
    const send: AudioSend = { id: `send-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, busId: bus.id, level: 0.5, enabled: true };
    updateTrack(trackId, { sends: [...(track?.sends || []), send] });
  };
  const updateSend = (trackId: string, sendId: string, patch: Partial<AudioSend>) => {
    const track = state.tracks.find((item) => item.id === trackId);
    updateTrack(trackId, { sends: (track?.sends || []).map((send) => send.id === sendId ? { ...send, ...patch } : send) });
  };
  const addEffect = (target: "master" | string, type: string) => {
    const effect = { id: `effect-${Date.now()}`, type, enabled: true, parameters: type === "LIMITER" ? { threshold: -1, ratio: 20 } : { threshold: -24, ratio: 4 } };
    if (target === "master") onChange({ ...state, masterBus: { ...(state.masterBus || { id: "master", name: "Master", volume: 1, pan: 0, muted: false, solo: false }), effects: [...(state.masterBus?.effects || []), effect] } });
    else updateBus(target, { effects: [...(state.buses?.find((bus) => bus.id === target)?.effects || []), effect] });
  };

  return <div className="flex-1 overflow-auto bg-[#080912] p-4">
    <div className="mb-3 flex items-center gap-3">
      <div className="flex-1 rounded border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 text-[10px] text-cyan-200">Input monitor: {(20 * Math.log10(Math.max(0.00001, inputMeter.peak))).toFixed(1)} dBFS</div>
      <button type="button" onClick={addBus} className="rounded bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-600">+ Bus/Aux</button>
    </div>
    <div className="flex h-full min-w-max items-stretch gap-3">
      {state.tracks.map((track) => <div key={track.id} className="flex w-36 flex-col gap-3 rounded-lg border border-[#252844] bg-[#111326] p-3">
        <div className="truncate text-xs font-semibold text-white">{track.name}</div>
        <div className="relative h-40 overflow-hidden rounded bg-[#090a16]"><div className="absolute inset-x-0 bottom-0 bg-emerald-500/70" style={{ height: `${Math.min(100, audioEngine.trackMetering(track.id).peak * 100)}%` }} /><div className="absolute inset-y-0 left-1/2 border-l border-slate-700" /></div>
        <label className="text-[10px] text-slate-400">Saída<select aria-label={`${track.name} output bus`} value={track.busId || "master"} onChange={(event) => updateTrack(track.id, { busId: event.target.value === "master" ? undefined : event.target.value })} className="mt-1 w-full rounded bg-[#20233b] px-1 py-1 text-[10px] text-slate-200"><option value="master">Master</option>{(state.buses || []).map((bus) => <option key={bus.id} value={bus.id}>{bus.name}</option>)}</select></label>
        {devices.length > 0 && <select aria-label={`${track.name} input`} value={track.inputDeviceId || ""} onChange={(event) => onChange({ ...state, tracks: state.tracks.map((item) => item.id === track.id ? { ...item, inputDeviceId: event.target.value } : item) })} className="w-full bg-[#20233b] text-[10px] text-slate-300"><option value="">Entrada padrão</option>{devices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Dispositivo de áudio"}</option>)}</select>}
        <label className="text-[10px] text-slate-400">Volume<input aria-label={`${track.name} volume`} type="range" min="0" max="1.5" step="0.01" value={track.volume} onChange={(event) => updateTrack(track.id, { volume: Number(event.target.value) })} className="w-full" /></label>
        <label className="text-[10px] text-slate-400">Pan<input aria-label={`${track.name} pan`} type="range" min="-1" max="1" step="0.01" value={track.pan} onChange={(event) => updateTrack(track.id, { pan: Number(event.target.value) })} className="w-full" /></label>
        {state.buses?.length ? <div className="border-t border-slate-700 pt-2">
          <button type="button" aria-label={`${track.name} add send`} onClick={() => addSend(track.id)} className="rounded bg-cyan-950/70 px-2 py-1 text-[10px] text-cyan-200">+ Send</button>
          {(track.sends || []).map((send) => <div key={send.id} className="mt-2">
            <select aria-label={`${track.name} send ${send.id} destination`} value={send.busId} onChange={(event) => updateSend(track.id, send.id, { busId: event.target.value })} className="w-full rounded bg-[#20233b] px-1 py-1 text-[10px] text-slate-200">{state.buses?.map((bus) => <option key={bus.id} value={bus.id}>{bus.name}</option>)}</select>
            <label className="text-[10px] text-slate-400">Send level<input aria-label={`${track.name} send ${send.id} level`} type="range" min="0" max="1" step="0.01" value={send.level} onChange={(event) => updateSend(track.id, send.id, { level: Number(event.target.value) })} className="w-full" /></label>
            <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={send.enabled} onChange={(event) => updateSend(track.id, send.id, { enabled: event.target.checked })} />Ativo</label>
            <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={Boolean(send.preFader)} onChange={(event) => updateSend(track.id, send.id, { preFader: event.target.checked })} />Pré-fader</label>
          </div>)}
        </div> : null}
        <div className="flex gap-1"><button onClick={() => updateTrack(track.id, { muted: !track.muted })} className={`flex-1 rounded px-2 py-1 text-[10px] ${track.muted ? "bg-rose-500 text-white" : "bg-[#20233b] text-slate-300"}`}>M</button><button onClick={() => updateTrack(track.id, { solo: !track.solo })} className={`flex-1 rounded px-2 py-1 text-[10px] ${track.solo ? "bg-amber-500 text-black" : "bg-[#20233b] text-slate-300"}`}>S</button></div>
      </div>)}
      {(state.buses || []).map((bus) => <div key={bus.id} className="w-36 rounded-lg border border-cyan-500/30 bg-[#101a26] p-3">
        <div className="text-xs font-semibold text-cyan-300">{bus.name}</div>
        <div className="relative my-2 h-24 overflow-hidden rounded bg-[#090a16]"><div className="absolute inset-x-0 bottom-0 bg-cyan-400/70" style={{ height: `${Math.min(100, audioEngine.busMetering(bus.id).peak * 100)}%` }} /></div>
        <label className="mt-2 block text-[10px] text-slate-400">Saída<select aria-label={`${bus.name} output bus`} value={bus.outputBusId || "master"} onChange={(event) => updateBus(bus.id, { outputBusId: event.target.value === "master" ? undefined : event.target.value })} className="mt-1 w-full rounded bg-[#20233b] px-1 py-1 text-slate-200"><option value="master">Master</option>{(state.buses || []).filter((candidate) => candidate.id !== bus.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
        <label className="mt-2 block text-[10px] text-slate-400">Pan<input aria-label={`${bus.name} pan`} type="range" min="-1" max="1" step="0.01" value={bus.pan} onChange={(event) => updateBus(bus.id, { pan: Number(event.target.value) })} className="w-full" /></label>
        <label className="text-[10px] text-slate-400">Volume<input aria-label={`${bus.name} volume`} type="range" min="0" max="1.5" step="0.01" value={bus.volume} onChange={(event) => updateBus(bus.id, { volume: Number(event.target.value) })} className="w-full" /></label>
        <div className="flex gap-1"><button onClick={() => updateBus(bus.id, { muted: !bus.muted })} className="flex-1 rounded bg-[#20233b] px-2 py-1 text-[10px] text-slate-300">{bus.muted ? "Unmute" : "Mute"}</button><button type="button" aria-label={`${bus.name} solo`} aria-pressed={bus.solo} onClick={() => updateBus(bus.id, { solo: !bus.solo })} className={`flex-1 rounded px-2 py-1 text-[10px] ${bus.solo ? "bg-amber-500 text-black" : "bg-[#20233b] text-slate-300"}`}>S</button></div>
        <button onClick={() => addEffect(bus.id, "COMPRESSOR")} className="mt-2 rounded bg-cyan-900/40 px-2 py-1 text-[10px] text-cyan-200">+ Compressor</button>
        {(bus.effects || []).map((effect) => <button key={effect.id} onClick={() => updateBus(bus.id, { effects: bus.effects.map((item) => item.id === effect.id ? { ...item, enabled: !item.enabled } : item) })} className="block w-full truncate text-left text-[10px] text-slate-400">{effect.enabled ? "●" : "○"} {effect.type}</button>)}
      </div>)}
      <div className="flex w-40 flex-col gap-3 rounded-lg border border-amber-500/40 bg-[#171426] p-3">
        <div className="text-xs font-semibold text-amber-300">Master</div>
        <div className="relative h-40 rounded bg-[#090a16]"><div className="absolute inset-x-1 bottom-0 bg-amber-500/70" style={{ height: `${Math.min(100, meter.peak * 100)}%` }} /></div>
        <div className="text-[10px] font-mono text-slate-400">Peak {(20 * Math.log10(Math.max(0.00001, meter.peak))).toFixed(1)} dBFS</div>
        <label className="text-[10px] text-slate-400">Volume<input aria-label="Master volume" type="range" min="0" max="1.5" step="0.01" value={state.masterBus?.volume ?? 1} onChange={(event) => onChange({ ...state, masterBus: { ...(state.masterBus || { id: "master", name: "Master", pan: 0, muted: false, solo: false, effects: [] }), volume: Number(event.target.value) } })} className="w-full" /></label>
        <label className="text-[10px] text-slate-400">Pan<input aria-label="Master pan" type="range" min="-1" max="1" step="0.01" value={state.masterBus?.pan ?? 0} onChange={(event) => onChange({ ...state, masterBus: { ...(state.masterBus || { id: "master", name: "Master", volume: 1, muted: false, solo: false, effects: [] }), pan: Number(event.target.value) } })} className="w-full" /></label>
        <button onClick={() => addEffect("master", "LIMITER")} className="rounded bg-amber-900/40 px-2 py-1 text-[10px] text-amber-200">+ Limiter</button>
        {(state.masterBus?.effects || []).map((effect) => <button key={effect.id} onClick={() => onChange({ ...state, masterBus: { ...state.masterBus!, effects: state.masterBus!.effects.map((item) => item.id === effect.id ? { ...item, enabled: !item.enabled } : item) } })} className="truncate text-left text-[10px] text-slate-400">{effect.enabled ? "●" : "○"} {effect.type}</button>)}
      </div>
    </div>
  </div>;
}
