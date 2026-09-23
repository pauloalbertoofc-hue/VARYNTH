"use client";

import type { CSSProperties } from "react";
import type { ParticleType } from "@/lib/music/visual-profile";
import { visualMotionDurationSeconds } from "@/lib/music/visual-profile";

type SceneEnergy = { bass: number; mids: number; treble: number; loudness: number };

/** Layered, account-replaceable stage whose motion and particles follow the saved track profile. */
export function VisualScene({ sceneId, background, coverArtwork, previousBackground, accent, energy, reducedMotion, motionSpeed = 0.2, particleType = "stars", particleDensity = 0.3 }: {
  sceneId: string;
  background?: string;
  coverArtwork?: string;
  previousBackground?: string;
  accent?: string;
  energy: SceneEnergy;
  reducedMotion: boolean;
  motionSpeed?: number;
  particleType?: ParticleType;
  particleDensity?: number;
}) {
  const fallbackImage = coverArtwork ? `url("${coverArtwork}")` : "radial-gradient(ellipse at 18% 26%, #f2bd8140, transparent 30%), radial-gradient(ellipse at 78% 68%, #9274df66, transparent 38%), radial-gradient(ellipse at 46% 54%, #243c5a 0%, #141322 38%, #090910 76%)";
  const image = background ? `url("${background}")` : fallbackImage;
  const duration = visualMotionDurationSeconds(motionSpeed);
  const activeMotion = !reducedMotion && duration > 0;
  const frameEnergy = activeMotion ? energy : { bass: 0, mids: 0.5, treble: 0, loudness: 0 };
  const particleCount = particleType === "none" ? 0 : particleType === "wave" ? 3 : Math.round(Math.max(0, Math.min(1, particleDensity)) * 42);
  const style = {
    "--scene-accent": accent ?? "#a78bfa",
    "--scene-bass": frameEnergy.bass,
    "--scene-mids": frameEnergy.mids,
    "--scene-treble": frameEnergy.treble,
    "--scene-energy": frameEnergy.loudness,
  } as CSSProperties;
  return <div key={sceneId} data-visual-scene="true" data-particle-effect={particleType} data-motion-duration={activeMotion ? duration : 0} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" style={style} aria-hidden="true">
    <div data-scene-layer="BackgroundLayer" className="scene-background absolute -inset-[8%] bg-cover bg-center">
      {background ? <img key={`background-${background}`} className="scene-art absolute inset-0 h-full w-full object-cover" src={background} alt="" /> : <div key="fallback" className="scene-art absolute inset-0 bg-cover bg-center" style={{ backgroundImage: fallbackImage }} />}
      {previousBackground && <img key={`previous-${previousBackground}`} className="scene-art-exit absolute inset-0 h-full w-full object-cover" src={previousBackground} alt="" />}
      {coverArtwork && <img data-scene-layer="CoverArtworkLayer" key={`cover-${coverArtwork}`} className="absolute inset-[12%] h-[76%] w-[76%] object-contain opacity-20 mix-blend-screen blur-[1px]" src={coverArtwork} alt="" />}
    </div>
    <div data-scene-layer="MidgroundLayer" className="scene-midground absolute -inset-[10%] bg-cover bg-center opacity-35 mix-blend-screen" style={{ backgroundImage: image }} />
    <div data-scene-layer="ForegroundLayer" className="scene-foreground absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,transparent_18%,rgba(3,4,12,.32)_68%,rgba(3,4,12,.9)_100%)]" />
    <div data-scene-layer="ParticleLayer" className={`scene-particles scene-particles--${particleType} absolute inset-0 overflow-hidden`}>
      {Array.from({ length: particleCount }, (_, i) => {
        const left = particleType === "wave" ? 0 : (i * 37) % 100;
        const top = particleType === "wave" ? 27 + i * 23 : (i * 53) % 100;
        return <span key={i} data-visual-particle={particleType} className={`scene-particle scene-particle--${particleType} absolute rounded-full bg-cyan-100/70 shadow-[0_0_12px_rgba(165,243,252,.9)]`} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${-(i % 9)}s`, opacity: Math.min(.8, .15 + frameEnergy.treble * .7), ...(particleType === "wave" ? { width: `${55 + i * 9}%`, height: "1px" } : {}) }} />;
      })}
    </div>
    <div data-scene-layer="LightingLayer" className="scene-lighting absolute inset-0 mix-blend-screen" />
    <div data-scene-layer="AudioReactiveLayer" className="scene-audio-reactive absolute inset-0" />
    <style jsx>{`
      .scene-background { animation: ${activeMotion ? `scene-crossfade 1.2s ease-out, scene-drift ${duration}s ease-in-out infinite alternate` : "none"}; transform: scale(${1.1 + frameEnergy.bass * .045}); filter: blur(${Math.max(0, 9 - frameEnergy.loudness * 7)}px); transition: transform 900ms ease, filter 900ms ease, background-image 900ms ease; }
      .scene-art { animation: ${reducedMotion ? "none" : "scene-crossfade 1.6s ease-out both"}; }
      .scene-art-exit { animation: ${reducedMotion ? "none" : "scene-crossfade-out 1.6s ease-in both"}; }
      .scene-midground { animation: ${activeMotion ? `scene-drift ${Math.max(4, duration * .72).toFixed(1)}s ease-in-out infinite alternate-reverse` : "none"}; transform: translate(${(frameEnergy.mids - .5) * 14}px, ${(frameEnergy.mids - .5) * -8}px) scale(1.14); filter: blur(7px); }
      .scene-particle { animation: ${activeMotion ? `scene-particle ${duration}s linear infinite` : "none"}; }
      .scene-particle--rain { width: 1px; height: 16px; border-radius: 0; animation-duration: ${Math.max(1.2, duration * .3)}s; animation-name: ${activeMotion ? "scene-rain" : "none"}; }
      .scene-particle--stars { animation-name: ${activeMotion ? "scene-twinkle" : "none"}; animation-duration: ${Math.max(2, duration * .45)}s; }
      .scene-particle--wave { border-radius: 50%; animation-name: ${activeMotion ? "scene-wave" : "none"}; animation-duration: ${Math.max(3, duration * .8)}s; }
      .scene-lighting { background: radial-gradient(ellipse at 50% 82%, color-mix(in srgb, var(--scene-accent) calc(20% + var(--scene-bass) * 48%), transparent), transparent 55%); opacity: .6; transition: opacity 200ms ease; }
      .scene-audio-reactive { box-shadow: inset 0 0 ${20 + energy.bass * 70}px color-mix(in srgb, var(--scene-accent) ${Math.round(8 + energy.loudness * 24)}%, transparent); }
      @keyframes scene-drift { from { transform: scale(1.08) translate3d(-.6%,0,0); } to { transform: scale(1.14) translate3d(.6%,-.5%,0); } }
      @keyframes scene-crossfade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes scene-crossfade-out { from { opacity: .82; } to { opacity: 0; } }
      @keyframes scene-particle { 0% { transform: translate3d(0,18px,0) scale(.7); } 50% { transform: translate3d(5px,-22px,0) scale(1.3); } 100% { transform: translate3d(0,-60px,0) scale(.6); } }
      @keyframes scene-rain { from { transform: translate3d(0,-28px,0); } to { transform: translate3d(3px,100vh,0); } }
      @keyframes scene-twinkle { 0%,100% { transform: scale(.55); opacity: .25; } 50% { transform: scale(1.5); opacity: .95; } }
      @keyframes scene-wave { from { transform: translateX(-24%) scaleX(.88); opacity: .05; } 50% { opacity: .42; } to { transform: translateX(115%) scaleX(1.08); opacity: .05; } }
    `}</style>
  </div>;
}
