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
  onSelectClip: (clipId: string) => void;
  onSeek: (timeMs: number) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackSolo: (trackId: string) => void;
  onUpdateTrackVolume: (trackId: string, volume: number) => void;
  onUpdateTrackPan: (trackId: string, pan: number) => void;
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
    <div className="flex-1 flex flex-col h-full bg-[#080912] overflow-hidden select-none">
      {/* Top Header & Time Ruler */}
      <div className="flex border-b border-[#1e2038] bg-[#0c0d1a] h-7 shrink-0">
        {/* Track Headers Placeholder */}
        <div className="w-28 sm:w-60 shrink-0 border-r border-[#1e2038] px-2 sm:px-3 flex items-center text-[10px] uppercase font-semibold text-slate-500 tracking-wider truncate">
          Faixas ({documentState.tracks.length})
        </div>

        {/* Time Ruler Container */}
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
                className="absolute top-0 bottom-0 border-l border-[#222442] flex items-center pl-1 font-mono text-[9px] text-slate-500 pointer-events-none"
              >
                {Math.floor(sec / 60)}:{(sec % 60).toString().padStart(2, "0")}
              </div>
            ))}

            {/* Timeline Markers */}
            {documentState.timeline.markers.map((marker) => (
              <div
                key={marker.id}
                style={{ left: `${(marker.timeMs / 1000) * zoom}px` }}
                className="absolute top-0 bottom-0 z-30 flex items-center gap-0.5 text-[9px] font-semibold text-amber-400 bg-amber-500/20 px-1 border-l-2 border-amber-500 rounded-r"
              >
                <Flag size={9} />
                {marker.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Timeline Lanes Area */}
      <div className="flex-1 flex overflow-y-auto">
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
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#090a16]"
        >
          <div style={{ width: `${totalTimelineWidthPx}px` }} className="relative h-full">
            {/* Background Grid Lines */}
            {ticks.map((sec) => (
              <div
                key={sec}
                style={{ left: `${sec * zoom}px` }}
                className="absolute top-0 bottom-0 border-l border-[#141628] pointer-events-none"
              />
            ))}

            {/* Track Lanes */}
            {documentState.tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`h-24 border-b border-[#181a2e] relative transition-colors ${
                  track.id === selectedTrackId ? "bg-blue-950/10" : ""
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
                    onSelect={() => onSelectClip(clip.id)}
                  />
                ))}
              </div>
            ))}

            {/* Playhead Scrubber Vertical Line */}
            <div
              style={{ left: `${playheadLeftPx}px` }}
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none shadow-lg shadow-red-500/50"
            >
              <div className="w-3 h-3 bg-red-500 -ml-[5px] -mt-1 rotate-45 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

