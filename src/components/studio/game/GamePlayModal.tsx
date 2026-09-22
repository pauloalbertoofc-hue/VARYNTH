"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { GameDocumentState, GameTestSession, GameEntity } from "@/lib/studio/game/types";
import { assetManager } from "@/lib/artifacts/asset-manager";
import { gameRuntimeEngine } from "@/lib/studio/game/game-runtime-engine";
import { selectVariation, selectVariationSequence } from "@/lib/studio/audio/game-audio-domain";
import { crossfadeLoopChannels } from "@/lib/studio/audio/audio-loop";
import { Play, Pause, Square, SkipForward, RefreshCw, X, Terminal, Cpu, Box, AlertTriangle } from "lucide-react";

interface GamePlayModalProps {
  isOpen: boolean;
  documentState: GameDocumentState;
  onClose: () => void;
}

export const GamePlayModal: React.FC<GamePlayModalProps> = ({
  isOpen,
  documentState,
  onClose,
}) => {
  const [session, setSession] = useState<GameTestSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runtimeEntities, setRuntimeEntities] = useState<Record<string, GameEntity>>({});
  const [showBounds, setShowBounds] = useState(false);
  const [showColliders, setShowColliders] = useState(false);
  const [audioRuntimeMessage, setAudioRuntimeMessage] = useState("");
  const [audioRuntimeStatus, setAudioRuntimeStatus] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const documentStateRef = useRef(documentState);
  const sessionRef = useRef(session);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInstancesRef = useRef(new Set<AudioBufferSourceNode>());
  const audioGainsRef = useRef(new Map<AudioBufferSourceNode, GainNode>());
  const audioPausedRef = useRef(false);
  const audioLogCursorRef = useRef(0);
  const audioSessionIdRef = useRef("");
  const audioVariationIndexRef = useRef(new Map<string, number>());
  const audioSceneIdRef = useRef("");

  useEffect(() => { documentStateRef.current = documentState; sessionRef.current = session; }, [documentState, session]);

  const stopRuntimeAudio = useCallback(() => {
    for (const source of audioInstancesRef.current) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); audioGainsRef.current.get(source)?.disconnect(); }
    audioInstancesRef.current.clear(); audioLogCursorRef.current = 0; audioVariationIndexRef.current.clear(); audioSceneIdRef.current = "";
    audioGainsRef.current.clear();
  }, []);
  const releaseRuntimeAudio = useCallback(() => {
    stopRuntimeAudio();
    const context = audioContextRef.current; audioContextRef.current = null;
    audioPausedRef.current = false;
    if (context && context.state !== "closed") void context.close();
  }, [stopRuntimeAudio]);
  const setRuntimeAudioPaused = useCallback(async (paused: boolean) => {
    audioPausedRef.current = paused;
    const context = audioContextRef.current;
    if (!context || context.state === "closed") return;
    try { if (paused && context.state === "running") await context.suspend(); else if (!paused && context.state === "suspended") await context.resume(); }
    catch { setAudioRuntimeMessage("O navegador bloqueou a retomada do áudio. Interaja com o playtest e tente novamente."); }
  }, []);

  const playLocalAudio = useCallback(async (assetId: string, options: { volume?: number; playbackRate?: number; loop?: boolean; loopStartMs?: number; loopEndMs?: number; crossfadeMs?: number } = {}) => {
    try {
      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) throw new Error("Este navegador não oferece Web Audio para reproduzir o evento.");
      const context = audioContextRef.current || (audioContextRef.current = new AudioContextConstructor());
      if (!audioPausedRef.current && context.state === "suspended") await context.resume();
      const data = await assetManager.getAssetData(assetId);
      if (!data) throw new Error(`Asset ${assetId} não está disponível no armazenamento local.`);
      let raw: ArrayBuffer;
      if (typeof data === "string") { const response = await fetch(data); if (!response.ok) throw new Error(`Falha ao ler asset ${assetId} (${response.status}).`); raw = await response.arrayBuffer(); }
      else if (data instanceof ArrayBuffer) raw = data.slice(0);
      else raw = await data.arrayBuffer();
      const decoded = await context.decodeAudioData(raw);
      let playbackBuffer = decoded;
      let loopBounds: { startFrame: number; endFrame: number } | undefined;
      const hasRegion = options.loopStartMs !== undefined && options.loopEndMs !== undefined;
      if (hasRegion) {
        const startMs = Math.max(0, options.loopStartMs!);
        const endMs = Math.min(decoded.duration * 1000, options.loopEndMs!);
        const loop = crossfadeLoopChannels(Array.from({ length: decoded.numberOfChannels }, (_, channel) => decoded.getChannelData(channel)), decoded.sampleRate, startMs, endMs, options.crossfadeMs ?? 0);
        if (loop.crossfadeFrames > 0) { playbackBuffer = context.createBuffer(decoded.numberOfChannels, decoded.length, decoded.sampleRate); loop.channels.forEach((samples, channel) => playbackBuffer.getChannelData(channel).set(samples)); }
        loopBounds = { startFrame: loop.loopStartFrame, endFrame: loop.loopEndFrame };
      }
      const source = context.createBufferSource(); source.buffer = playbackBuffer;
      source.playbackRate.value = Math.max(0.05, Math.min(4, options.playbackRate ?? 1));
      if (loopBounds) { source.loop = true; source.loopStart = loopBounds.startFrame / decoded.sampleRate; source.loopEnd = loopBounds.endFrame / decoded.sampleRate; }
      else if (options.loop) source.loop = true;
      const gain = context.createGain(); gain.gain.value = Math.max(0, Math.min(4, options.volume ?? 1));
      source.connect(gain).connect(context.destination);
      audioInstancesRef.current.add(source);
      audioGainsRef.current.set(source, gain);
      source.onended = () => { audioInstancesRef.current.delete(source); audioGainsRef.current.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(context.currentTime, loopBounds ? Math.max(0, options.loopStartMs! / 1000) : 0);
      if (audioPausedRef.current && context.state === "running") await context.suspend();
      setAudioRuntimeMessage(""); setAudioRuntimeStatus(`Reproduzindo asset ${assetId}`);
    } catch (error) {
      setAudioRuntimeStatus("");
      setAudioRuntimeMessage(error instanceof Error ? error.message : `Não foi possível reproduzir o asset ${assetId}.`);
    }
  }, []);

  // Initialize Play Session on Open
  useEffect(() => {
    if (isOpen) {
      stopRuntimeAudio(); audioPausedRef.current = false; setAudioRuntimeMessage("");
      const res = gameRuntimeEngine.startPlaySession(documentStateRef.current, "v1.0", 123456);
      if (res.success && res.session) {
        setSession(res.session);
        setRuntimeEntities(gameRuntimeEngine.getRuntimeEntities(res.session.id) || {});
        setErrorMessage(null);
        setIsPlaying(true);
      } else {
        setErrorMessage(res.error || "Falha ao inicializar sessão de playtest.");
      }
    } else {
      releaseRuntimeAudio();
      if (sessionRef.current) {
        gameRuntimeEngine.stopPlaySession(sessionRef.current.id);
        setSession(null);
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isOpen, releaseRuntimeAudio, stopRuntimeAudio]);

  useEffect(() => {
    if (!isOpen || !session) return;
    if (audioSessionIdRef.current !== session.id) { audioSessionIdRef.current = session.id; audioLogCursorRef.current = 0; audioVariationIndexRef.current.clear(); audioSceneIdRef.current = ""; }
    const newLogs = session.logs.slice(audioLogCursorRef.current); audioLogCursorRef.current = session.logs.length;
    const packageData = documentState.gameAudioPackage;
    const randomInRange = (range: [number, number], seed: number) => range[0] + ((Math.abs(Math.sin(seed * 12.9898) * 43758.5453)) % 1) * (range[1] - range[0]);
    for (const log of newLogs) {
      const eventMatch = log.match(/\[ACTION_AUDIO_EVENT\] Reproduzindo evento de áudio "([^"]+)"\./);
      if (eventMatch && packageData) {
        const event = packageData.events.find((item) => item.id === eventMatch[1]); if (!event) { setAudioRuntimeMessage(`Evento de áudio ${eventMatch[1]} não existe no pacote.`); continue; }
        const sequence = audioVariationIndexRef.current.get(event.id) || 0; audioVariationIndexRef.current.set(event.id, sequence + 1);
        const group = packageData.variationGroups.find((item) => item.id === event.variationGroupId);
        const chosen = group ? group.selectionMode === "weighted" ? selectVariation(group, session.seed + sequence) : selectVariationSequence(group, sequence + 1, session.seed).at(-1) : undefined;
        const assetId = chosen?.assetId || event.assetIds?.[0];
        if (assetId) void playLocalAudio(assetId, { volume: randomInRange(event.volumeRange, session.seed + sequence), playbackRate: randomInRange(event.pitchRange, session.seed + sequence + 1), loopStartMs: event.loop?.startMs, loopEndMs: event.loop?.endMs, crossfadeMs: event.loop?.crossfadeMs });
        else setAudioRuntimeMessage(`Evento ${event.name} não referencia um asset reproduzível.`);
        continue;
      }
      const assetMatch = log.match(/\[ACTION_AUDIO\] Reproduzindo asset "([^"]+)"\./);
      if (assetMatch) void playLocalAudio(assetMatch[1]);
    }
    const sceneId = session.runtimeState.activeSceneId;
    if (sceneId && sceneId !== audioSceneIdRef.current) {
      audioSceneIdRef.current = sceneId;
      for (const entity of documentState.entities.filter((item) => item.sceneId === sceneId && item.active)) {
        const source = entity.components.find((component) => component.type === "AUDIO_SOURCE" && component.playOnStart);
        if (source?.type === "AUDIO_SOURCE") void playLocalAudio(source.assetId, { loop: source.loop, volume: source.volume });
      }
    }
  }, [isOpen, session, documentState, playLocalAudio]);

  useEffect(() => () => {
    releaseRuntimeAudio();
  }, [releaseRuntimeAudio]);

  // Simulation Loop (Fixed Timestep 60Hz tick)
  useEffect(() => {
    const currentSession = sessionRef.current;
    if (isPlaying && currentSession && currentSession.status === "RUNNING") {
      intervalRef.current = setInterval(() => {
        const currentSession = sessionRef.current;
        if (!currentSession) return;
        const stepRes = gameRuntimeEngine.stepSimulation(currentSession.id, documentStateRef.current, []);
        if (stepRes.success && stepRes.session) {
          setSession({ ...stepRes.session });
          setRuntimeEntities(gameRuntimeEngine.getRuntimeEntities(stepRes.session.id) || {});
        } else if (stepRes.error) {
          setErrorMessage(stepRes.error);
          setIsPlaying(false);
        }
      }, 50); // Simulation heartbeat tick
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, session?.id, session?.status]);

  useEffect(() => {
    if (!isOpen || !session) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const action = documentState.inputActions.find((mapping) => mapping.keys.includes(event.code))?.action;
      if (!action) return;
      event.preventDefault();
      const result = gameRuntimeEngine.stepSimulation(session.id, documentState, [{ tickId: session.runtimeState.simulationTick + 1, timeMs: session.runtimeState.simulationClockMs, type: "ACTION_DOWN", action }]);
      if (result.success && result.session) {
        setSession({ ...result.session });
        setRuntimeEntities(gameRuntimeEngine.getRuntimeEntities(result.session.id) || {});
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, session, documentState]);

  if (!isOpen) return null;

  const currentScene = documentState.scenes.find((s) => s.id === session?.runtimeState.activeSceneId);
  const currentSceneEntities = Object.values(runtimeEntities).filter((e) => e.sceneId === currentScene?.id);
  const activeCamera = currentSceneEntities.find((entity) => entity.components.some((component) => component.type === "CAMERA"));
  const camera = activeCamera?.components.find((component) => component.type === "CAMERA");
  const cameraState = camera && camera.type === "CAMERA" ? ((camera as typeof camera & { runtimeState?: { x: number; y: number } }).runtimeState || { x: 400, y: 300 }) : { x: 400, y: 300 };
  const cameraZoom = camera && camera.type === "CAMERA" ? camera.zoom : 1;

  const handleEntityClick = (entityId: string) => {
    if (!session) return;
    const stepRes = gameRuntimeEngine.stepSimulation(session.id, documentState, [
      {
        tickId: session.runtimeState.simulationTick + 1,
        timeMs: session.runtimeState.simulationClockMs,
        type: "CLICK",
        entityId,
      },
    ]);
    if (stepRes.success && stepRes.session) {
      setSession({ ...stepRes.session });
      setRuntimeEntities(gameRuntimeEngine.getRuntimeEntities(stepRes.session.id) || {});
    }
  };

  const handleStepOnce = () => {
    if (!session) return;
    const stepRes = gameRuntimeEngine.stepSimulation(session.id, documentState, []);
    if (stepRes.success && stepRes.session) {
      setSession({ ...stepRes.session });
      setRuntimeEntities(gameRuntimeEngine.getRuntimeEntities(stepRes.session.id) || {});
    }
  };

  const handleRestart = () => {
    stopRuntimeAudio();
    audioPausedRef.current = false;
    if (session) gameRuntimeEngine.stopPlaySession(session.id);
    const res = gameRuntimeEngine.startPlaySession(documentState, "v1.0", 123456);
    if (res.success && res.session) {
      setSession(res.session);
      setRuntimeEntities(gameRuntimeEngine.getRuntimeEntities(res.session.id) || {});
      setErrorMessage(null);
      setIsPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-5xl h-[85vh] bg-[#0c0d18] border border-[#252848] rounded-2xl flex flex-col shadow-2xl overflow-hidden select-none">
        {/* Modal Header */}
        <div className="p-4 bg-[#101222] border-b border-[#20223c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Play size={16} className="text-emerald-400 fill-emerald-400" />
                Play Mode — Sandbox Test Session
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Sessão: {session?.id || "N/A"} | Seed: {session?.seed} | Ticks: {session?.runtimeState.simulationTick || 0} ({Math.round((session?.runtimeState.simulationClockMs || 0) / 1000)}s)
              </span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { void setRuntimeAudioPaused(isPlaying); setIsPlaying(!isPlaying); }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              {isPlaying ? "Pausar" : "Executar"}
            </button>
            <button onClick={() => setShowBounds((value) => !value)} className={`px-2 py-1.5 rounded-lg text-[11px] border ${showBounds ? "bg-amber-500/20 border-amber-500/40 text-amber-200" : "bg-[#1e2038] border-white/10 text-slate-300"}`}>Bounds</button>
            <button onClick={() => setShowColliders((value) => !value)} className={`px-2 py-1.5 rounded-lg text-[11px] border ${showColliders ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200" : "bg-[#1e2038] border-white/10 text-slate-300"}`}>Colliders</button>
            <button
              onClick={handleStepOnce}
              className="px-3 py-1.5 bg-[#1e2038] hover:bg-[#282a4a] text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/10"
              title="Avançar 1 Frame/Tick"
            >
              <SkipForward size={13} /> Step
            </button>
            <button
              onClick={handleRestart}
              className="p-1.5 bg-[#1e2038] hover:bg-[#282a4a] text-slate-300 rounded-lg border border-white/10"
              title="Reiniciar Sessão com mesmo Seed"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Viewport + HUD & Logs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main 2D Sandbox Canvas */}
          <div className="flex-1 bg-[#07080f] flex items-center justify-center p-4 relative overflow-hidden">
            {errorMessage ? (
              <div className="p-6 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs max-w-md text-center space-y-2">
                <AlertTriangle size={24} className="mx-auto text-rose-400" />
                <p className="font-bold">Erro de Execução no Sandbox</p>
                <p className="text-[11px] text-slate-400">{errorMessage}</p>
                <button
                  onClick={handleRestart}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold mt-2"
                >
                  Reiniciar
                </button>
              </div>
            ) : (
              <div
                className="relative w-[640px] h-[480px] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col justify-between"
                style={{ backgroundColor: currentScene?.backgroundColor || "#0f172a" }}
              >
                {/* HUD Overlay */}
                <div className="p-3 bg-black/60 backdrop-blur-sm border-b border-white/10 flex items-center justify-between text-xs text-white font-mono z-20">
                  <span className="text-emerald-400 font-bold">Cena: {currentScene?.name}</span>
                  <span>Pontuação: {session?.runtimeState.score || 0}</span>
                </div>

                {/* Render Entities in Play Session */}
                <div className="relative flex-1 w-full h-full">
                  {currentSceneEntities.map((ent) => {
                    const tr = ent.components.find((c) => c.type === "TRANSFORM");
                    const sprite = ent.components.find((c) => c.type === "SPRITE");
                    const textComp = ent.components.find((c) => c.type === "TEXT");
                    const uiComp = ent.components.find((c) => c.type === "UI");
                    const collider = ent.components.find((c) => c.type === "COLLIDER");

                    const worldX = tr && tr.type === "TRANSFORM" ? tr.x : 100;
                    const worldY = tr && tr.type === "TRANSFORM" ? tr.y : 100;
                    const x = 320 + (worldX - cameraState.x) * 0.8 * cameraZoom;
                    const y = 240 + (worldY - cameraState.y) * 0.8 * cameraZoom;

                    return (
                      <div
                        key={ent.id}
                        onClick={() => handleEntityClick(ent.id)}
                        className={`absolute cursor-pointer select-none transition-transform hover:scale-105 ${!ent.active || (tr && tr.type === "TRANSFORM" && tr.visible === false) ? "hidden" : ""}`}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: `translate(-50%, -50%) scale(${cameraZoom})`,
                        }}
                      >
                        {sprite && sprite.type === "SPRITE" ? (
                          <div
                            className="bg-emerald-600/40 border border-emerald-400 rounded flex flex-col items-center justify-center p-2 text-center shadow-lg"
                            style={{ width: `${(sprite.width / 800) * 640}px`, height: `${(sprite.height / 600) * 480}px` }}
                          >
                            <Box size={16} className="text-emerald-300" />
                            <span className="text-[9px] font-bold text-white line-clamp-1">{ent.name}</span>
                          </div>
                        ) : textComp && textComp.type === "TEXT" ? (
                          <div
                            className="font-bold text-center px-3 py-1.5 bg-black/60 rounded border border-white/20 shadow-md"
                            style={{ color: textComp.color, fontSize: `${textComp.fontSize - 2}px` }}
                          >
                            {textComp.text}
                          </div>
                        ) : uiComp && uiComp.type === "UI" ? (
                          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xl border border-indigo-400/40">
                            {uiComp.text || ent.name}
                          </button>
                        ) : (
                          <div className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-white">
                            {ent.name}
                          </div>
                        )}
                        {showBounds && <div className="absolute inset-0 border border-dashed border-amber-300 pointer-events-none" />}
                        {showColliders && collider && collider.type === "COLLIDER" && <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-cyan-300/80 pointer-events-none ${collider.shape === "CIRCLE" ? "rounded-full" : ""}`} style={{ width: `${(collider.shape === "CIRCLE" ? (collider.radius || 0) * 2 : collider.width) * 0.8 * cameraZoom}px`, height: `${(collider.shape === "CIRCLE" ? (collider.radius || 0) * 2 : collider.height) * 0.8 * cameraZoom}px` }} />}
                      </div>
                    );
                  })}
                </div>

                {/* Footer Notice */}
                <div className="p-2 bg-black/60 text-center text-[10px] text-slate-400 border-t border-white/10 font-mono">
                  Sandbox isolado: alterações em runtime não sobrescrevem a definição do projeto.
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Live State HUD & Console Logs */}
          <div className="w-80 border-l border-[#1f2038] bg-[#0c0d18] flex flex-col text-xs text-slate-300">
            {/* Live State Variables HUD */}
            <div className="p-3 border-b border-[#1c1d30] bg-[#0f1020] space-y-2">
              <div className="flex items-center gap-2 font-bold text-white text-[11px] uppercase tracking-wider">
                <Cpu size={14} className="text-emerald-400" />
                Estado em Tempo Real
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(session?.runtimeState.variables || {}).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-1.5 bg-[#141526] rounded border border-white/5 flex items-center justify-between font-mono text-[11px]"
                  >
                    <span className="text-slate-400">{key}:</span>
                    <span className="text-emerald-300 font-bold">{String(val)}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-mono text-slate-400"><span>FPS 60</span><span>Ents {currentSceneEntities.length}</span><span>Tick {session?.runtimeState.simulationTick || 0}</span></div>
            </div>

            {/* Sandbox Console Logs */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-2.5 border-b border-[#1c1d30] bg-[#0f1020] flex items-center gap-2 font-bold text-white text-[11px] uppercase tracking-wider">
                <Terminal size={13} className="text-emerald-400" />
                Console do Sandbox
              </div>
              {audioRuntimeMessage && <p role="alert" className="border-b border-rose-900/50 bg-rose-950/30 p-2 text-[10px] text-rose-200">Áudio: {audioRuntimeMessage}</p>}
              {audioRuntimeStatus && <p role="status" className="border-b border-emerald-900/50 bg-emerald-950/20 p-2 text-[10px] text-emerald-200">Áudio: {audioRuntimeStatus}</p>}
              <div className="flex-1 p-3 font-mono text-[11px] text-slate-400 overflow-y-auto space-y-1 bg-[#07080e]">
                {session?.logs.map((log, i) => (
                  <div key={i} className="text-slate-300 leading-tight">
                    {log}
                  </div>
                ))}
                {session?.errors.map((err, i) => (
                  <div key={i} className="text-rose-400 font-bold leading-tight">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
