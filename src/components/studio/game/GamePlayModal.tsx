"use client";

import React, { useState, useEffect, useRef } from "react";
import { GameDocumentState, GameTestSession } from "@/lib/studio/game/types";
import { gameRuntimeEngine } from "@/lib/studio/game/game-runtime-engine";
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Play Session on Open
  useEffect(() => {
    if (isOpen) {
      const res = gameRuntimeEngine.startPlaySession(documentState, "v1.0", 123456);
      if (res.success && res.session) {
        setSession(res.session);
        setErrorMessage(null);
        setIsPlaying(true);
      } else {
        setErrorMessage(res.error || "Falha ao inicializar sessão de playtest.");
      }
    } else {
      if (session) {
        gameRuntimeEngine.stopPlaySession(session.id);
        setSession(null);
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isOpen]);

  // Simulation Loop (Fixed Timestep 60Hz tick)
  useEffect(() => {
    if (isPlaying && session && session.status === "RUNNING") {
      intervalRef.current = setInterval(() => {
        const stepRes = gameRuntimeEngine.stepSimulation(session.id, documentState, []);
        if (stepRes.success && stepRes.session) {
          setSession({ ...stepRes.session });
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
  }, [isPlaying, session?.status]);

  if (!isOpen) return null;

  const currentScene = documentState.scenes.find((s) => s.id === session?.runtimeState.activeSceneId);
  const currentSceneEntities = documentState.entities.filter((e) => e.sceneId === currentScene?.id);

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
    }
  };

  const handleStepOnce = () => {
    if (!session) return;
    const stepRes = gameRuntimeEngine.stepSimulation(session.id, documentState, []);
    if (stepRes.success && stepRes.session) {
      setSession({ ...stepRes.session });
    }
  };

  const handleRestart = () => {
    if (session) gameRuntimeEngine.stopPlaySession(session.id);
    const res = gameRuntimeEngine.startPlaySession(documentState, "v1.0", 123456);
    if (res.success && res.session) {
      setSession(res.session);
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
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              {isPlaying ? "Pausar" : "Executar"}
            </button>
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

                    const x = tr && tr.type === "TRANSFORM" ? (tr.x / 800) * 640 : 100;
                    const y = tr && tr.type === "TRANSFORM" ? (tr.y / 600) * 480 : 100;

                    return (
                      <div
                        key={ent.id}
                        onClick={() => handleEntityClick(ent.id)}
                        className={`absolute cursor-pointer select-none transition-transform hover:scale-105 ${!ent.active ? "hidden" : ""}`}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: "translate(-50%, -50%)",
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
            </div>

            {/* Sandbox Console Logs */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-2.5 border-b border-[#1c1d30] bg-[#0f1020] flex items-center gap-2 font-bold text-white text-[11px] uppercase tracking-wider">
                <Terminal size={13} className="text-emerald-400" />
                Console do Sandbox
              </div>
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

