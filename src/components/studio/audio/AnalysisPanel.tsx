"use client";

import { useEffect, useRef, useState } from "react";
import { audioEngine } from "@/lib/studio/audio/audio-engine";
import { analyzeProgramLoudness, analyzeRhythm, analyzeSamples, AudioAnalysis, ProgramLoudnessAnalysis, RhythmAnalysis } from "@/lib/studio/audio/audio-analysis";
import { assetManager } from "@/lib/artifacts/asset-manager";
import { audioRenderEngine } from "@/lib/studio/audio/audio-render-engine";
import type { AudioTrack } from "@/lib/studio/audio/types";

const emptyAnalysis: AudioAnalysis = { peak: 0, rms: 0, clipping: false, confidence: 0 };

export function AnalysisPanel({ tracks, selectedClipIds }: { tracks: AudioTrack[]; selectedClipIds: string[] }) {
  const [meter, setMeter] = useState({ peak: 0, rms: 0 });
  const [spectrum, setSpectrum] = useState<number[]>([]);
  const [inputAnalysis, setInputAnalysis] = useState<AudioAnalysis>(emptyAnalysis);
  const [monitoring, setMonitoring] = useState(false);
  const [inputError, setInputError] = useState("");
  const [inputState, setInputState] = useState("Microfone desligado");
  const [clipResults, setClipResults] = useState<Array<{ clipId: string; name: string; result?: ProgramLoudnessAnalysis; rhythm?: RhythmAnalysis; pitch?: AudioAnalysis; error?: string }>>([]);
  const [analyzingClips, setAnalyzingClips] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const db = meter.rms > 0 ? 20 * Math.log10(meter.rms) : -Infinity;
  const cents = inputAnalysis.cents ?? 0;
  const selectedClips = tracks.flatMap((track) => track.clips.filter((clip) => selectedClipIds.includes(clip.id)).map((clip) => ({ clip, trackName: track.name })));

  useEffect(() => {
    const timer = window.setInterval(() => { setMeter(audioEngine.metering()); setSpectrum(audioEngine.spectrum().slice(0, 48)); }, 80);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void contextRef.current?.close();
  }, []);

  const stopMonitoring = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    sourceRef.current?.disconnect(); sourceRef.current = null;
    analyserRef.current?.disconnect(); analyserRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    const context = contextRef.current; contextRef.current = null;
    if (context && context.state !== "closed") void context.close();
    setInputAnalysis(emptyAnalysis); setMonitoring(false); setInputState("Microfone desligado");
  };

  const startMonitoring = async () => {
    setInputError(""); setInputState("Solicitando acesso ao microfone…");
    if (!navigator.mediaDevices?.getUserMedia) { setInputError("Este navegador não disponibiliza captura de microfone."); setInputState("Entrada indisponível"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = stream;
      const AudioContextConstructor = window.AudioContext;
      const context = new AudioContextConstructor(); contextRef.current = context;
      if (context.state === "suspended") await context.resume();
      const source = context.createMediaStreamSource(stream); sourceRef.current = source;
      const analyser = context.createAnalyser(); analyser.fftSize = 4096; analyser.smoothingTimeConstant = 0; analyserRef.current = analyser;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      setMonitoring(true); setInputState("Aguardando sinal com altura estável…");
      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(samples);
        const analysis = analyzeSamples(samples, context.sampleRate);
        setInputAnalysis(analysis);
        setInputState(analysis.note && analysis.confidence >= 0.75 ? "Nota detectada" : analysis.rms < 0.003 ? "Aguardando sinal…" : "Sinal sem altura estável");
        frameRef.current = requestAnimationFrame(update);
      };
      update();
      stream.getAudioTracks()[0]?.addEventListener("ended", () => { stopMonitoring(); setInputState("Entrada do microfone encerrada"); }, { once: true });
    } catch (error) {
      stopMonitoring();
      const name = error instanceof DOMException ? error.name : "";
      const message = name === "NotAllowedError" || name === "SecurityError" ? "Permissão de microfone negada. Autorize o acesso no navegador e tente novamente." : name === "NotFoundError" ? "Nenhum microfone disponível foi encontrado." : name === "NotReadableError" ? "O microfone está ocupado ou não pode ser lido." : error instanceof Error ? error.message : "Não foi possível iniciar a entrada de áudio.";
      setInputError(message); setInputState("Entrada indisponível");
    }
  };

  const analyzeSelectedClips = async () => {
    if (!selectedClips.length || analyzingClips) return;
    setAnalyzingClips(true); setClipResults([]);
    const results: typeof clipResults = [];
    try {
      for (const { clip, trackName } of selectedClips.slice(0, 8)) {
        const name = clip.name || `${trackName} · ${clip.id}`;
        try {
          const data = await assetManager.getAssetData(clip.assetId);
          if (!data) throw new Error("O conteúdo do asset não está disponível localmente.");
          let buffer: ArrayBuffer;
          if (data instanceof Blob) buffer = await data.arrayBuffer();
          else if (typeof data === "string") buffer = await (await fetch(data)).arrayBuffer();
          else buffer = data.slice(0);
          const context = new AudioContext();
          try {
            const decoded = await context.decodeAudioData(buffer);
            const limit = audioRenderEngine.validateAudioLimits(decoded.duration * 1000, decoded.sampleRate, decoded.numberOfChannels);
            if (!limit.valid) throw new Error(limit.error || "Este áudio excede o limite seguro de análise.");
            const start = Math.max(0, Math.floor(clip.sourceStartMs / 1000 * decoded.sampleRate));
            const endMs = clip.sourceEndMs > clip.sourceStartMs ? clip.sourceEndMs : decoded.duration * 1000;
            const end = Math.min(decoded.length, Math.floor(endMs / 1000 * decoded.sampleRate));
            if (end <= start) throw new Error("O trecho selecionado não contém amostras de áudio.");
            const channels = Array.from({ length: decoded.numberOfChannels }, (_, channel) => decoded.getChannelData(channel).slice(start, end));
            const mono = new Float32Array(end - start);
            for (let index = 0; index < mono.length; index++) { let sum = 0; for (const channel of channels) sum += channel[index]; mono[index] = sum / channels.length; }
            const pitchWindow = mono.length > decoded.sampleRate * 0.2 ? mono.slice(0, Math.min(mono.length, decoded.sampleRate * 1.5)) : mono;
            results.push({ clipId: clip.id, name, result: analyzeProgramLoudness(channels, decoded.sampleRate), rhythm: analyzeRhythm(mono, decoded.sampleRate), pitch: analyzeSamples(pitchWindow, decoded.sampleRate) });
          } finally { await context.close(); }
        } catch (error) {
          results.push({ clipId: clip.id, name, error: error instanceof Error ? error.message : "Falha ao analisar o áudio." });
        }
        setClipResults([...results]);
      }
      if (selectedClips.length > 8) results.push({ clipId: "selection-limit", name: `${selectedClips.length - 8} clipes restantes`, error: "Analise até 8 clipes por lote para controlar o uso de memória." });
      setClipResults([...results]);
    } finally { setAnalyzingClips(false); }
  };

  return <section className="flex h-full flex-col overflow-auto bg-[#090b14] p-5 text-slate-200">
    <h2 className="text-sm font-bold text-white">Analysis</h2>
    <p className="mt-1 text-xs text-slate-500">Medição do Audio Engine e tuner de entrada ao vivo</p>
    <div className="mt-5 rounded-lg border border-[#252844] bg-[#111326] p-4">
      <div className="flex items-end gap-1" aria-label="Espectro real">{spectrum.map((value, index) => <span key={index} className="w-2 bg-cyan-500" style={{ height: `${Math.max(2, value * 0.35)}px` }} />)}</div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs"><span>Peak <b className="text-white">{meter.peak.toFixed(3)}</b></span><span>RMS <b className="text-white">{meter.rms.toFixed(3)}</b></span><span>dBFS <b className="text-white">{Number.isFinite(db) ? db.toFixed(1) : "−∞"}</b></span></div>
    </div>
    <div className="mt-4 rounded-lg border border-[#252844] bg-[#111326] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xs font-semibold text-white">Loudness dos clipes</h3><p className="mt-1 text-[10px] text-slate-500">Medição dos bytes locais dos clipes selecionados · mono/estéreo · máximo de 8 por lote</p></div><button type="button" disabled={!selectedClips.length || analyzingClips} onClick={() => void analyzeSelectedClips()} className="rounded bg-cyan-900/60 px-3 py-1.5 text-xs text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">{analyzingClips ? "Analisando…" : `Analisar selecionados (${selectedClips.length})`}</button></div>
      {!selectedClips.length && <p className="mt-3 text-[10px] text-slate-400" role="status">Selecione um ou mais clipes na timeline para medir o loudness.</p>}
      {clipResults.length > 0 && <ul className="mt-3 space-y-2">{clipResults.map((item) => <li key={item.clipId} className="rounded border border-[#252844] px-3 py-2 text-[10px]"><div className="truncate font-medium text-white">{item.name}</div>{item.error ? <p className="mt-1 text-amber-300">{item.error}</p> : item.result && <><p className="mt-1 text-slate-300">{item.result.integratedLufs === null ? item.result.status === "INSUFFICIENT_DURATION" ? "Trecho menor que 400 ms; LUFS integrado não calculado." : item.result.status === "BELOW_GATE" ? "Sinal abaixo do gate de loudness; LUFS integrado indisponível." : `Leitura indisponível (${item.result.status}).` : `LUFS integrado ${item.result.integratedLufs.toFixed(1)} LUFS · pico de amostra ${item.result.samplePeakDbfs.toFixed(1)} dBFS · RMS ${item.result.rmsDbfs.toFixed(1)} dBFS · ${item.result.channels} canal(is)`}</p><p className="mt-1 text-slate-400">Pico interpolado 4× (aprox.) {item.result.interpolatedPeakDbfs.toFixed(1)} dBFS</p>{item.rhythm && <p className="mt-1 text-slate-400">{item.rhythm.bpm === null ? "Tempo/transientes sem confiança suficiente." : `Tempo estimado ${item.rhythm.bpm} BPM · confiança ${(item.rhythm.confidence * 100).toFixed(0)}% · ${item.rhythm.transientTimesMs.length} transiente(s)`}</p>}{item.pitch && <p className="mt-1 text-slate-400">{item.pitch.note && item.pitch.confidence >= 0.75 ? `Pitch estimado ${item.pitch.note} · ${item.pitch.frequencyHz?.toFixed(1)} Hz · ${item.pitch.cents && item.pitch.cents > 0 ? "+" : ""}${item.pitch.cents?.toFixed(0)} cents · confiança ${(item.pitch.confidence * 100).toFixed(0)}%` : "Pitch sem confiança suficiente."}</p>}</>}</li>)}</ul>}
      <p className="mt-2 text-[9px] text-slate-600">Mede o trecho-fonte do clipe; não inclui ganho, fades ou efeitos da timeline. Pico interpolado 4× é um alerta aproximado de inter-sample e não certificação true peak ITU. Multicanal acima de estéreo não é suportado.</p>
    </div>
    <div className="mt-4 rounded-lg border border-[#252844] bg-[#111326] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xs font-semibold text-white">Tuner de entrada</h3><p className="mt-1 text-[10px] text-slate-500">Permissão solicitada somente ao iniciar.</p></div><button type="button" onClick={() => monitoring ? stopMonitoring() : void startMonitoring()} className="rounded bg-cyan-900/60 px-3 py-1.5 text-xs text-cyan-100">{monitoring ? "Parar microfone" : "Ativar microfone"}</button></div>
      <p className="mt-3 text-[10px] text-slate-400" role="status" aria-live="polite">{inputState}</p>
      <div className="mt-3 flex items-center gap-3" aria-label="Indicador de afinação">
        <div className="relative h-16 flex-1 rounded bg-[#090b14]" aria-hidden="true"><span className="absolute inset-y-2 left-1/2 border-l border-slate-500" /><span className="absolute inset-y-3 left-1/2 w-0.5 bg-amber-300 transition-transform" style={{ transform: `translateX(${Math.max(-46, Math.min(46, cents * 1.1))}px)` }} /><div className="absolute inset-x-0 bottom-1 flex justify-between px-2 text-[9px] text-slate-600"><span>−50¢</span><span>0</span><span>+50¢</span></div></div>
        <div className="min-w-20 text-right"><div className="text-2xl font-bold text-white">{inputAnalysis.confidence >= 0.75 ? inputAnalysis.note : "—"}</div><div className="text-[10px] text-slate-400">{inputAnalysis.frequencyHz ? `${inputAnalysis.frequencyHz.toFixed(1)} Hz` : "sem nota"}</div><div className={`text-[10px] ${Math.abs(cents) <= 5 && inputAnalysis.confidence >= 0.75 ? "text-emerald-300" : "text-amber-300"}`}>{inputAnalysis.confidence >= 0.75 ? `${cents > 0 ? "+" : ""}${cents.toFixed(0)} cents` : ""}</div></div>
      </div>
      {inputError && <p role="alert" className="mt-2 text-xs text-rose-300">{inputError}</p>}
      <p className="mt-2 text-[10px] text-slate-600">A detecção YIN requer uma única nota sustentada; acordes, ruído e sinal fraco podem não produzir leitura.</p>
    </div>
  </section>;
}
