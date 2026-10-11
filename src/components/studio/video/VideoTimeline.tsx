"use client";

import React, { useRef } from "react";
import { VideoDocumentState, VideoClip, VideoTrack } from "@/lib/studio/video/types";
import { Video, Image as ImageIcon, Type, Captions, Volume2, Flag, Eye, EyeOff } from "lucide-react";

interface VideoTimelineProps {
  documentState: VideoDocumentState;
  zoom: number; // Pixels per second
  selectedTrackId?: string;
  selectedClipIds: string[];
  onSelectTrack: (trackId: string) => void;
  onSelectClip: (clipId: string) => void;
  onSeek: (timeMs: number) => void;
  onToggleTrackVisibility: (trackId: string) => void;
}

export function VideoTimeline({
  documentState,
  zoom,
  selectedTrackId,
  selectedClipIds,
  onSelectTrack,
  onSelectClip,
  onSeek,
  onToggleTrackVisibility,
}: VideoTimelineProps) {
  const timelineContentRef = useRef<HTMLDivElement>(null);

  const durationSec = documentState.timeline.durationMs / 1000;
  const totalTimelineWidthPx = Math.max(800, durationSec * zoom);
  const playheadLeftPx = (documentState.playheadMs / 1000) * zoom;

  const stepSec = zoom > 50 ? 1 : zoom > 20 ? 5 : 10;
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

  const getTrackIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return <Video size={12} className="text-[var(--vly-accent)]" />;
      case "IMAGE":
        return <ImageIcon size={12} className="text-[var(--vly-info)]" />;
      case "TEXT":
        return <Type size={12} className="text-[var(--vly-accent)]" />;
      case "SUBTITLE":
        return <Captions size={12} className="text-[var(--vly-warning)]" />;
      default:
        return <Volume2 size={12} className="text-[var(--vly-success)]" />;
    }
  };

  return (
    <div role="region" aria-label="Timeline do Video Studio" className="flex h-full flex-1 select-none flex-col overflow-hidden bg-[var(--vly-world)]">
      {/* Top Ruler & Scenes/Markers */}
      <div className="flex h-7 shrink-0 border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)]">
        <div className="flex w-56 shrink-0 items-center border-r border-[var(--vly-border-subtle)] px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
          Faixas ({documentState.tracks.length})
        </div>

        <div
          ref={timelineContentRef}
          onClick={handleRulerClick}
          className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-pointer"
        >
          <div style={{ width: `${totalTimelineWidthPx}px` }} className="h-full relative">
            {ticks.map((sec) => (
              <div
                key={sec}
                style={{ left: `${sec * zoom}px` }}
                className="pointer-events-none absolute bottom-0 top-0 flex items-center border-l border-[var(--vly-border-subtle)] pl-1 font-mono text-[9px] text-[var(--vly-text-muted)]"
              >
                {Math.floor(sec / 60)}:{(sec % 60).toString().padStart(2, "0")}
              </div>
            ))}

            {/* Markers */}
            {documentState.timeline.markers.map((marker) => (
              <div
                key={marker.id}
                style={{ left: `${(marker.timeMs / 1000) * zoom}px` }}
                className="absolute bottom-0 top-0 z-30 flex items-center gap-0.5 rounded-r border-l-2 border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/20 px-1 text-[9px] font-semibold text-[var(--vly-warning)]"
              >
                <Flag size={9} />
                {marker.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Track Lanes */}
      <div className="flex-1 flex overflow-y-auto">
        {/* Left Track Headers */}
        <div className="w-56 shrink-0 flex flex-col">
          {documentState.tracks.map((track) => (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              role="button"
              tabIndex={0}
              aria-current={track.id === selectedTrackId ? "true" : undefined}
              aria-label={`Selecionar faixa ${track.name}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTrack(track.id);
                }
              }}
              style={{ borderLeftColor: track.color || "var(--vly-accent)" }}
              className={`flex h-16 cursor-pointer items-center justify-between border-b border-r border-[var(--vly-border-subtle)] border-l-4 px-3 py-2 transition ${
                track.id === selectedTrackId ? "bg-[var(--vly-surface-raised)]" : "bg-[var(--vly-surface)] hover:bg-[var(--vly-surface-raised)]"
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {getTrackIcon(track.type)}
                <span className="max-w-[110px] truncate text-xs font-semibold text-[var(--vly-text-primary)]">
                  {track.name}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTrackVisibility(track.id);
                }}
                aria-label={`${track.visible ? "Ocultar" : "Mostrar"} faixa ${track.name}`}
                className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
              >
                {track.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-[var(--vly-danger)]" />}
              </button>
            </div>
          ))}
        </div>

        {/* Right Interactive Clip Lanes */}
        <div
          onClick={handleRulerClick}
          className="relative flex-1 overflow-x-auto overflow-y-hidden bg-[var(--vly-world)]"
        >
          <div style={{ width: `${totalTimelineWidthPx}px` }} className="relative h-full">
            {ticks.map((sec) => (
              <div
                key={sec}
                style={{ left: `${sec * zoom}px` }}
                className="pointer-events-none absolute bottom-0 top-0 border-l border-[var(--vly-border-subtle)]"
              />
            ))}

            {/* Tracks */}
            {documentState.tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                role="group"
                aria-label={`Clips da faixa ${track.name}`}
                className={`relative h-16 border-b border-[var(--vly-border-subtle)] transition-colors ${
                  track.id === selectedTrackId ? "bg-[var(--vly-accent)]/10" : ""
                }`}
              >
                {/* Visual / Audio Clips */}
                {track.clips.map((clip) => {
                  const clipDuration = clip.sourceEndMs - clip.sourceStartMs;
                  const leftPx = (clip.timelineStartMs / 1000) * zoom;
                  const widthPx = Math.max(16, (clipDuration / 1000) * zoom);
                  const isSelected = selectedClipIds.includes(clip.id);

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip.id);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-current={isSelected ? "true" : undefined}
                      aria-label={`Selecionar clip ${clip.name || clip.textContent || "Clip"}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectClip(clip.id);
                        }
                      }}
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                        borderColor: isSelected ? "var(--vly-accent)" : track.color || "var(--vly-accent)",
                      }}
                      className={`absolute bottom-1 top-1 flex cursor-pointer select-none flex-col justify-between overflow-hidden rounded-lg border transition-shadow ${
                        isSelected
                          ? "z-20 bg-[var(--vly-accent)]/25 shadow-lg ring-2 ring-[var(--vly-accent)]"
                          : "z-10 bg-[var(--vly-surface-raised)]/90 hover:bg-[var(--vly-surface)]"
                      }`}
                    >
                      <div className="truncate bg-[var(--vly-world)]/40 px-2 py-0.5 text-[10px] font-medium text-[var(--vly-text-secondary)]">
                        {clip.name || clip.textContent || "Clip"}
                      </div>
                    </div>
                  );
                })}

                {/* Subtitle Cues */}
                {track.type === "SUBTITLE" &&
                  track.subtitles?.map((cue) => {
                    const duration = cue.endMs - cue.startMs;
                    const leftPx = (cue.startMs / 1000) * zoom;
                    const widthPx = Math.max(16, (duration / 1000) * zoom);

                    return (
                      <div
                        key={cue.id}
                        style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                        className="absolute bottom-1.5 top-1.5 z-10 flex items-center truncate rounded border border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/20 px-2 text-[10px] text-[var(--vly-warning)]"
                      >
                        {cue.text}
                      </div>
                    );
                  })}
              </div>
            ))}

            {/* Playhead Scrubber */}
            <div
              style={{ left: `${playheadLeftPx}px` }}
              className="pointer-events-none absolute bottom-0 top-0 z-40 w-0.5 bg-[var(--vly-danger)] shadow-lg"
            >
              <div className="-ml-[5px] -mt-1 h-3 w-3 rotate-45 rounded-sm bg-[var(--vly-danger)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

