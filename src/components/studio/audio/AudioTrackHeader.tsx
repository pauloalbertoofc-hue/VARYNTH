"use client";

import React from "react";
import { AudioTrack } from "@/lib/studio/audio/types";
import { Volume2, VolumeX, Mic, Music, Sparkles, Radio } from "lucide-react";

interface AudioTrackHeaderProps {
  track: AudioTrack;
  isSelected: boolean;
  onSelect: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onUpdateVolume: (volume: number) => void;
  onUpdatePan: (pan: number) => void;
}

export function AudioTrackHeader({
  track,
  isSelected,
  onSelect,
  onToggleMute,
  onToggleSolo,
  onUpdateVolume,
  onUpdatePan,
}: AudioTrackHeaderProps) {
  const getTrackIcon = () => {
    switch (track.type) {
      case "VOICE":
        return <Mic size={12} className="text-blue-400" />;
      case "MUSIC":
        return <Music size={12} className="text-purple-400" />;
      case "SFX":
        return <Sparkles size={12} className="text-amber-400" />;
      default:
        return <Radio size={12} className="text-slate-400" />;
    }
  };

  return (
    <div
      onClick={onSelect}
      style={{
        borderLeftColor: track.color || "#3b82f6",
      }}
      className={`w-60 h-24 border-l-4 border-b border-r border-[#1e2038] p-2.5 flex flex-col justify-between select-none cursor-pointer transition ${
        isSelected
          ? "bg-[#141628] border-blue-500/50 shadow-inner"
          : "bg-[#0c0d18] hover:bg-[#101120]"
      }`}
    >
      {/* Top Row: Track Name & Type */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {getTrackIcon()}
          <span className="font-semibold text-xs text-white truncate max-w-[120px]">
            {track.name}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Mute Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className={`w-5 h-5 rounded text-[10px] font-bold transition flex items-center justify-center ${
              track.muted
                ? "bg-red-500 text-white shadow-sm"
                : "bg-[#1a1c30] text-slate-400 hover:text-white"
            }`}
            title="Mute (Silenciar Faixa)"
          >
            M
          </button>

          {/* Solo Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSolo();
            }}
            className={`w-5 h-5 rounded text-[10px] font-bold transition flex items-center justify-center ${
              track.solo
                ? "bg-amber-500 text-black shadow-sm font-extrabold"
                : "bg-[#1a1c30] text-slate-400 hover:text-white"
            }`}
            title="Solo (Isolar Faixa)"
          >
            S
          </button>
        </div>
      </div>

      {/* Sliders Row: Volume & Pan */}
      <div className="space-y-1.5 text-[10px] text-slate-400">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[9px] w-8">
            <Volume2 size={10} /> Vol
          </span>
          <input
            type="range"
            min="0"
            max="150"
            value={Math.round((track.volume ?? 1.0) * 100)}
            onChange={(e) => onUpdateVolume(parseInt(e.target.value) / 100)}
            onClick={(e) => e.stopPropagation()}
            className="w-full accent-blue-500 h-1 bg-[#1a1c32] rounded cursor-pointer"
          />
          <span className="font-mono text-[9px] text-slate-300 w-7 text-right">
            {Math.round((track.volume ?? 1.0) * 100)}%
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] w-8">Pan</span>
          <input
            type="range"
            min="-100"
            max="100"
            value={Math.round((track.pan ?? 0) * 100)}
            onChange={(e) => onUpdatePan(parseInt(e.target.value) / 100)}
            onClick={(e) => e.stopPropagation()}
            className="w-full accent-purple-500 h-1 bg-[#1a1c32] rounded cursor-pointer"
          />
          <span className="font-mono text-[9px] text-slate-300 w-7 text-right">
            {(track.pan ?? 0) === 0 ? "C" : (track.pan ?? 0) < 0 ? `L${Math.abs(Math.round((track.pan ?? 0) * 100))}` : `R${Math.round((track.pan ?? 0) * 100)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

