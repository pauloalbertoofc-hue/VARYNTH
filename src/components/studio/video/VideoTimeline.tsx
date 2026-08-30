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
        return <Video size={12} className="text-blue-400" />;
      case "IMAGE":
        return <ImageIcon size={12} className="text-purple-400" />;
      case "TEXT":
        return <Type size={12} className="text-pink-400" />;
      case "SUBTITLE":
        return <Captions size={12} className="text-yellow-400" />;
      default:
        return <Volume2 size={12} className="text-emerald-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080912] overflow-hidden select-none">
      {/* Top Ruler & Scenes/Markers */}
      <div className="flex border-b border-[#1e2038] bg-[#0c0d1a] h-7 shrink-0">
        <div className="w-56 shrink-0 border-r border-[#1e2038] px-3 flex items-center text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
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
                className="absolute top-0 bottom-0 border-l border-[#222442] flex items-center pl-1 font-mono text-[9px] text-slate-500 pointer-events-none"
              >
                {Math.floor(sec / 60)}:{(sec % 60).toString().padStart(2, "0")}
              </div>
            ))}

            {/* Markers */}
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

      {/* Main Track Lanes */}
      <div className="flex-1 flex overflow-y-auto">
        {/* Left Track Headers */}
        <div className="w-56 shrink-0 flex flex-col">
          {documentState.tracks.map((track) => (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              style={{ borderLeftColor: track.color || "#3b82f6" }}
              className={`h-16 border-l-4 border-b border-r border-[#1e2038] px-3 py-2 flex items-center justify-between cursor-pointer transition ${
                track.id === selectedTrackId ? "bg-[#141628]" : "bg-[#0c0d18] hover:bg-[#101120]"
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {getTrackIcon(track.type)}
                <span className="font-semibold text-xs text-white truncate max-w-[110px]">
                  {track.name}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTrackVisibility(track.id);
                }}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                {track.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-red-400" />}
              </button>
            </div>
          ))}
        </div>

        {/* Right Interactive Clip Lanes */}
        <div
          onClick={handleRulerClick}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#090a16]"
        >
          <div style={{ width: `${totalTimelineWidthPx}px` }} className="relative h-full">
            {ticks.map((sec) => (
              <div
                key={sec}
                style={{ left: `${sec * zoom}px` }}
                className="absolute top-0 bottom-0 border-l border-[#141628] pointer-events-none"
              />
            ))}

            {/* Tracks */}
            {documentState.tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`h-16 border-b border-[#181a2e] relative transition-colors ${
                  track.id === selectedTrackId ? "bg-blue-950/10" : ""
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
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                        borderColor: isSelected ? "#60a5fa" : track.color || "#3b82f6",
                      }}
                      className={`absolute top-1 bottom-1 rounded-lg border flex flex-col justify-between overflow-hidden cursor-pointer select-none transition-shadow ${
                        isSelected
                          ? "bg-blue-950/70 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400 z-20"
                          : "bg-[#121426]/90 hover:bg-[#181a32] z-10"
                      }`}
                    >
                      <div className="px-2 py-0.5 text-[10px] font-medium bg-black/40 text-slate-300 truncate">
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
                        className="absolute top-1.5 bottom-1.5 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] px-2 flex items-center truncate z-10"
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

