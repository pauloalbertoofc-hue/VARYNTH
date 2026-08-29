"use client";

import React, { useMemo } from "react";
import { AudioClip } from "@/lib/studio/audio/types";
import { audioRenderEngine } from "@/lib/studio/audio/audio-render-engine";
import { Volume2 } from "lucide-react";

interface AudioClipBlockProps {
  clip: AudioClip;
  trackColor?: string;
  zoom: number; // Pixels per second
  isSelected: boolean;
  onSelect: () => void;
  onTrimStart?: (deltaMs: number) => void;
  onTrimEnd?: (deltaMs: number) => void;
}

export function AudioClipBlock({
  clip,
  trackColor = "#3b82f6",
  zoom,
  isSelected,
  onSelect,
}: AudioClipBlockProps) {
  const clipDurationMs = clip.sourceEndMs - clip.sourceStartMs;
  const leftPx = (clip.timelineStartMs / 1000) * zoom;
  const widthPx = Math.max(16, (clipDurationMs / 1000) * zoom);

  const waveform = useMemo(() => {
    return audioRenderEngine.generateWaveform(clip.assetId, clipDurationMs);
  }, [clip.assetId, clipDurationMs]);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
        borderColor: isSelected ? "#60a5fa" : trackColor,
      }}
      className={`absolute top-1 bottom-1 rounded-lg border flex flex-col justify-between overflow-hidden cursor-pointer select-none transition-shadow ${
        isSelected
          ? "bg-blue-950/70 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400 z-20"
          : "bg-[#121426]/90 hover:bg-[#181a32] z-10"
      }`}
    >
      {/* Header with Title & Gain indicator */}
      <div className="px-2 py-0.5 flex items-center justify-between text-[10px] font-medium bg-black/40 text-slate-300">
        <span className="truncate max-w-[80%]">{clip.name || `Clip (${Math.round(clipDurationMs / 1000)}s)`}</span>
        {clip.gain !== 1.0 && (
          <span className="font-mono text-[9px] text-amber-400 flex items-center gap-0.5">
            <Volume2 size={9} />
            {Math.round(clip.gain * 100)}%
          </span>
        )}
      </div>

      {/* Waveform Peaks Canvas/SVG */}
      <div className="flex-1 flex items-center px-1 gap-[1px] opacity-80 overflow-hidden">
        {waveform.peaks.slice(0, Math.max(10, Math.round(widthPx / 4))).map((peak, idx) => (
          <div
            key={idx}
            style={{
              height: `${Math.max(15, peak * 100)}%`,
              backgroundColor: isSelected ? "#93c5fd" : trackColor,
            }}
            className="flex-1 rounded-full min-w-[2px] transition-all"
          />
        ))}
      </div>

      {/* Fade Overlays */}
      {clip.fadeInMs && clip.fadeInMs > 0 && (
        <div
          style={{ width: `${(clip.fadeInMs / 1000) * zoom}px` }}
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-black/80 to-transparent pointer-events-none"
        />
      )}
      {clip.fadeOutMs && clip.fadeOutMs > 0 && (
        <div
          style={{ width: `${(clip.fadeOutMs / 1000) * zoom}px` }}
          className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-black/80 to-transparent pointer-events-none"
        />
      )}
    </div>
  );
}

