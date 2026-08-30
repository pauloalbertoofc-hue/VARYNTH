"use client";

import React, { useMemo } from "react";
import { VideoDocumentState } from "@/lib/studio/video/types";
import { videoRenderEngine } from "@/lib/studio/video/video-render-engine";
import { formatTimecode } from "@/lib/studio/temporal/temporal-core";

interface VideoPreviewFrameProps {
  documentState: VideoDocumentState;
  playheadMs: number;
}

export function VideoPreviewFrame({
  documentState,
  playheadMs,
}: VideoPreviewFrameProps) {
  const { width, height, frameRate } = documentState.timeline;
  const aspectRatio = `${width} / ${height}`;

  // Find active visual clips & subtitles at playhead
  const activeElements = useMemo(() => {
    const visualTracks = documentState.tracks
      .filter((t) => t.visible && ["VIDEO", "IMAGE", "TEXT", "SUBTITLE", "OVERLAY"].includes(t.type))
      .sort((a, b) => a.order - b.order); // Bottom to top

    const activeClips: { clip: any; transform: any; trackType: string }[] = [];
    let activeSubtitle: string | null = null;

    for (const track of visualTracks) {
      if (track.type === "SUBTITLE" && track.subtitles) {
        const currentCue = track.subtitles.find(
          (s) => playheadMs >= s.startMs && playheadMs <= s.endMs
        );
        if (currentCue) activeSubtitle = currentCue.text;
      }

      for (const clip of track.clips) {
        const clipEnd = clip.timelineStartMs + (clip.sourceEndMs - clip.sourceStartMs);
        if (playheadMs >= clip.timelineStartMs && playheadMs <= clipEnd) {
          const transform = videoRenderEngine.computeClipTransformAtTime(clip, playheadMs);
          activeClips.push({ clip, transform, trackType: track.type });
        }
      }
    }

    return { activeClips, activeSubtitle };
  }, [documentState, playheadMs]);

  return (
    <div className="flex-1 h-full bg-[#05060b] flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Video Container Box with Aspect Ratio */}
      <div
        style={{ aspectRatio }}
        className="relative max-w-full max-h-full w-auto h-auto bg-black rounded-xl overflow-hidden border border-[#222442] shadow-2xl flex items-center justify-center"
      >
        {/* Background / Empty State */}
        <div className="absolute inset-0 bg-[#0c0d18] flex items-center justify-center text-slate-700 text-xs font-mono">
          {width} × {height} @ {Math.round(frameRate.numerator / frameRate.denominator)}fps
        </div>

        {/* Composited Layers */}
        {activeElements.activeClips.map((item, idx) => {
          const { clip, transform, trackType } = item;

          return (
            <div
              key={clip.id || idx}
              style={{
                opacity: transform.opacity ?? 1,
                transform: `scale(${transform.scaleX || 1}, ${transform.scaleY || 1}) rotate(${transform.rotation || 0}deg)`,
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform"
            >
              {trackType === "TEXT" ? (
                <div
                  style={{
                    fontSize: `${clip.textStyle?.fontSize || 32}px`,
                    color: clip.textStyle?.color || "#ffffff",
                    backgroundColor: clip.textStyle?.backgroundColor || "rgba(0,0,0,0.6)",
                  }}
                  className="px-4 py-2 rounded-lg font-bold shadow-lg"
                >
                  {clip.textContent || clip.name || "Texto"}
                </div>
              ) : trackType === "IMAGE" ? (
                <div className="w-4/5 h-4/5 bg-purple-950/40 border border-purple-500/40 rounded-xl flex items-center justify-center text-purple-300 font-medium text-sm shadow-inner">
                  {clip.name || "Imagem / Slide"}
                </div>
              ) : (
                <div className="w-full h-full bg-blue-950/30 border border-blue-500/20 flex items-center justify-center text-blue-300 font-medium text-sm">
                  {clip.name || "Vídeo Principal"}
                </div>
              )}
            </div>
          );
        })}

        {/* Subtitle Overlay Bar */}
        {activeElements.activeSubtitle && (
          <div className="absolute bottom-6 left-8 right-8 flex justify-center pointer-events-none z-30">
            <span className="px-4 py-1.5 bg-black/85 text-yellow-300 text-sm font-semibold rounded-lg shadow-lg border border-yellow-500/30 text-center max-w-xl">
              {activeElements.activeSubtitle}
            </span>
          </div>
        )}

        {/* Timecode HUD Overlay */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 rounded border border-white/10 font-mono text-[10px] text-blue-400 pointer-events-none">
          {formatTimecode(playheadMs, { fps: frameRate, showFrames: true })}
        </div>
      </div>
    </div>
  );
}

