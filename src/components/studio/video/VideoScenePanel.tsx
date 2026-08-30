"use client";

import React from "react";
import { VideoScene } from "@/lib/studio/video/types";
import { Film, Clock, Plus, LayoutGrid, List } from "lucide-react";
import { formatTimecode } from "@/lib/studio/temporal/temporal-core";

interface VideoScenePanelProps {
  scenes: VideoScene[];
  selectedSceneId?: string;
  isStoryboardMode: boolean;
  onToggleStoryboard: () => void;
  onSelectScene: (sceneId: string) => void;
  onAddScene?: () => void;
}

export function VideoScenePanel({
  scenes,
  selectedSceneId,
  isStoryboardMode,
  onToggleStoryboard,
  onSelectScene,
  onAddScene,
}: VideoScenePanelProps) {
  return (
    <div className="h-full flex flex-col bg-[#0b0c16] text-xs text-slate-300 select-none overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#1c1d32] flex items-center justify-between bg-[#111222]">
        <div className="flex items-center gap-1.5 font-bold text-white text-xs">
          <Film size={14} className="text-blue-400" />
          Cenas Semânticas ({scenes.length})
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStoryboard}
            className={`p-1.5 rounded-lg border transition ${
              isStoryboardMode
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-[#16172e] border-[#222442] text-slate-400 hover:text-white"
            }`}
            title={isStoryboardMode ? "Modo Lista de Cenas" : "Modo Storyboard Visual"}
          >
            {isStoryboardMode ? <List size={13} /> : <LayoutGrid size={13} />}
          </button>

          {onAddScene && (
            <button
              onClick={onAddScene}
              className="p-1.5 bg-[#16172e] hover:bg-[#202244] border border-[#222442] text-blue-400 rounded-lg"
              title="Criar Nova Cena"
            >
              <Plus size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Content: List or Storyboard Cards */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {isStoryboardMode ? (
          <div className="grid grid-cols-2 gap-2">
            {scenes.map((scene, idx) => {
              const isSelected = scene.id === selectedSceneId;
              const durationSec = Math.round((scene.endMs - scene.startMs) / 1000);

              return (
                <div
                  key={scene.id}
                  onClick={() => onSelectScene(scene.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between aspect-video ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                      : "bg-[#111222] border-[#1e2038] text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate max-w-[100px]">{scene.name}</span>
                    <span className="font-mono text-[9px] bg-[#1a1c34] px-1.5 py-0.5 rounded text-blue-300">
                      {durationSec}s
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">
                    {scene.description || `Cena ${idx + 1} da linha do tempo`}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          scenes.map((scene, idx) => {
            const isSelected = scene.id === selectedSceneId;
            const startTc = formatTimecode(scene.startMs);
            const endTc = formatTimecode(scene.endMs);

            return (
              <div
                key={scene.id}
                onClick={() => onSelectScene(scene.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? "bg-blue-600/15 border-blue-500 text-white font-medium"
                    : "bg-[#101120] border-transparent text-slate-400 hover:bg-[#141528] hover:text-white"
                }`}
              >
                <div className="overflow-hidden max-w-[65%]">
                  <div className="font-semibold text-xs text-white truncate">{scene.name}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {scene.description || `Intervalo de cena semântica`}
                  </div>
                </div>

                <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={10} />
                  <span>{startTc}</span>
                  <span className="text-slate-600">→</span>
                  <span>{endTc}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

