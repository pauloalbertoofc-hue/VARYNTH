"use client";

import React, { useRef } from "react";
import { AudioDocumentState, AudioClip } from "@/lib/studio/audio/types";
import { AudioTrackHeader } from "./AudioTrackHeader";
import { AudioClipBlock } from "./AudioClipBlock";
import { Flag } from "lucide-react";

interface AudioTimelineProps {
  documentState: AudioDocumentState;
  zoom: number; // Pixels per second
  selectedTrackId?: string;
  selectedClipIds: string[];
  onSelectTrack: (trackId: string) => void;
  onSelectClip: (clipId: string, additive?: boolean) => void;
  onSeek: (timeMs: number) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackSolo: (trackId: string) => void;
  onUpdateTrackVolume: (trackId: string, volume: number) => void;
  onUpdateTrackPan: (trackId: string, pan: number) => void;
  onMoveClip?: (clipId: string, timelineStartMs: number) => void;
  onTrimClip?: (clipId: string, side: "start" | "end", deltaMs: number) => void;
  onImportFiles?: (files: File[]) => void;
}

export function AudioTimeline({
  documentState,
  zoom,
  selectedTrackId,
  selectedClipIds,
  onSelectTrack,
  onSelectClip,
  onSeek,
  onToggleTrackMute,
  onToggleTrackSolo,
  onUpdateTrackVolume,
  onUpdateTrackPan,
  onMoveClip,
  onTrimClip,
  onImportFiles,
}: AudioTimelineProps) {
  const timelineContentRef = useRef<HTMLDivElement>(null);

  const durationSec = documentState.timeline.durationMs / 1000;
  const totalTimelineWidthPx = Math.max(800, durationSec * zoom);
  const playheadLeftPx = (documentState.playheadMs / 1000) * zoom;

  // Generate ruler tick marks every 1s, 5s or 10s depending on zoom
  const stepSec = zoom > 60 ? 1 : zoom > 20 ? 5 : 10;
  const tickCount = Math.ceil(durationSec / stepSec);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * stepSec);

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineContentRef.current) {
      const rect = timelineContentRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + timelineContentRef.current.scrollLeft;
      const targetTimeMs = Math.max(0, Math.min(documentState.timeline.durationMs, (clickX / zoom) * 1000));
      onSeek(targetTimeMs);
    }
  };

  return (
    <main aria-label="Timeline do Audio Studio" className="flex h-full flex-1 select-none flex-col overflow-hidden bg-[var(--vly-surface)]">
      {/* Top Header & Time Ruler */}
      <div className="flex h-7 shrink-0 border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)]">
        {/* Track Headers Placeholder */}
        <div className="w-28 shrink-0 truncate border-r border-[var(--vly-border-default)] px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)] sm:w-60 sm:px-3">
          Faixas ({documentState.tracks.length})
        </div>

        {/* Time Ruler Container */}
        <div
          ref={timelineContentRef}
          onClick={handleRulerClick}
          aria-label="Régua temporal; clique para mover o playhead"
          className="relative flex-1 cursor-pointer overflow-x-auto overflow-y-hidden"
        >
          <div style={{ width: `${totalTimelineWidthPx}px` }} className="h-full relative">
            {ticks.map((sec) => (
              <div
                key={sec}
                style={{ left: `${sec * zoom}px` }}
                className="pointer-events-none absolute bottom-0 top-0 flex items-center border-l border-[var(--vly-border-default)] pl-1 font-mono text-[9px] text-[var(--vly-text-muted)]"
              >
                {Math.floor(sec / 60)}:{(sec % 60).toString().padStart(2, "0")}
              </div>
            ))}

            {/* Timeline Markers */}
            {documentState.timeline.markers.map((marker) => (
              <div
                key={marker.id}
                style={{ left: `${(marker.timeMs / 1000) * zoom}px` }}
                className="absolute bottom-0 top-0 z-30 flex items-center gap-0.5 rounded-r border-l-2 border-[var(--vly-warning)] bg-[var(--vly-surface-warning)] px-1 text-[9px] font-semibold text-[var(--vly-warning)]"
              >
                <Flag size={9} />
                {marker.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Timeline Lanes Area */}
      <div className="flex flex-1 overflow-y-auto" role="region" aria-label="Faixas e clips de áudio">
        {/* Left: Track Headers Stack */}
        <div className="w-28 sm:w-60 shrink-0 flex flex-col">
          {documentState.tracks.map((track) => (
            <AudioTrackHeader
              key={track.id}
              track={track}
              isSelected={track.id === selectedTrackId}
              onSelect={() => onSelectTrack(track.id)}
              onToggleMute={() => onToggleTrackMute(track.id)}
              onToggleSolo={() => onToggleTrackSolo(track.id)}
              onUpdateVolume={(vol) => onUpdateTrackVolume(track.id, vol)}
              onUpdatePan={(pan) => onUpdateTrackPan(track.id, pan)}
            />
          ))}
        </div>

        {/* Right: Interactive Clip Lanes */}
        <div
          onClick={handleRulerClick}
          onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith("audio/")); if (files.length) onImportFiles?.(files); }}
          className="relative flex-1 overflow-x-auto overflow-y-hidden bg-[var(--vly-surface)]"
        >
          <div style={{ width: `${totalTimelineWidthPx}px` }} className="relative h-full">
            {/* Background Grid Lines */}
            {ticks.map((sec) => (
              <div
                key={sec}
                style={{ left: `${sec * zoom}px` }}
                className="pointer-events-none absolute bottom-0 top-0 border-l border-[var(--vly-border-subtle)]"
              />
            ))}

            {/* Track Lanes */}
            {documentState.tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                role="group"
                aria-label={`Lane da faixa ${track.name}`}
                className={`relative h-24 border-b border-[var(--vly-border-subtle)] transition-colors ${
                  track.id === selectedTrackId ? "bg-[color-mix(in_srgb,var(--vly-accent)_8%,transparent)]" : ""
                }`}
              >
                {/* Clips in this track */}
                {track.clips.map((clip) => (
                  <AudioClipBlock
                    key={clip.id}
                    clip={clip}
                    trackColor={track.color}
                    zoom={zoom}
                    isSelected={selectedClipIds.includes(clip.id)}
                    onSelect={(additive) => onSelectClip(clip.id, additive)}
                    onMove={(timeMs) => onMoveClip?.(clip.id, documentState.timeline.snapToGrid ? Math.round(timeMs / 100) * 100 : timeMs)}
                    onTrimStart={(deltaMs) => onTrimClip?.(clip.id, "start", deltaMs)}
                    onTrimEnd={(deltaMs) => onTrimClip?.(clip.id, "end", deltaMs)}
                  />
                ))}
              </div>
            ))}

            {/* Playhead Scrubber Vertical Line */}
            <div
              style={{ left: `${playheadLeftPx}px` }}
              aria-label={`Playhead em ${documentState.playheadMs} ms`}
              className="pointer-events-none absolute bottom-0 top-0 z-40 w-0.5 bg-[var(--vly-danger)] shadow-lg shadow-[var(--vly-danger)]/50"
            >
              <div className="-ml-[5px] -mt-1 h-3 w-3 rotate-45 rounded-sm bg-[var(--vly-danger)]" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
