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
    <div className="flex h-full flex-1 select-none flex-col items-center justify-center overflow-hidden bg-[var(--vly-world)] p-4">
      {/* Video Container Box with Aspect Ratio */}
      <div
        style={{ aspectRatio }}
        className="relative flex h-auto max-h-full w-auto max-w-full items-center justify-center overflow-hidden rounded-xl border border-[var(--vly-border-strong)] bg-black shadow-[var(--vly-shadow-floating)]"
      >
        {/* Background / Empty State */}
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--vly-surface)] font-mono text-xs text-[var(--vly-text-muted)]">
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
                <div className="w-4/5 h-4/5 bg-[var(--vly-accent)]/10 border border-[var(--vly-border-accent)] rounded-xl flex items-center justify-center text-[var(--vly-accent)] font-medium text-sm shadow-inner">
                  {clip.name || "Imagem / Slide"}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center border border-[var(--vly-border-info)] bg-[var(--vly-info)]/10 text-sm font-medium text-[var(--vly-info)]">
                  {clip.name || "Vídeo Principal"}
                </div>
              )}
            </div>
          );
        })}

        {/* Subtitle Overlay Bar */}
        {activeElements.activeSubtitle && (
          <div className="absolute bottom-6 left-8 right-8 flex justify-center pointer-events-none z-30">
            <span className="px-4 py-1.5 bg-[var(--vly-world)]/85 text-[var(--vly-warning)] text-sm font-semibold rounded-lg shadow-lg border border-[var(--vly-border-warning)] text-center max-w-xl">
              {activeElements.activeSubtitle}
            </span>
          </div>
        )}

        {/* Timecode HUD Overlay */}
        <div className="pointer-events-none absolute right-3 top-3 rounded border border-white/10 bg-black/70 px-2 py-1 font-mono text-[10px] text-[var(--vly-accent)]">
          {formatTimecode(playheadMs, { fps: frameRate, showFrames: true })}
        </div>
      </div>
    </div>
  );
}
