"use client";

import type { CSSProperties } from "react";

type SceneEnergy = { bass: number; mids: number; treble: number; loudness: number };

/** Layered, replaceable visual stage for generated art, animation and future scene providers. */
export function VisualScene({ sceneId, background, coverArtwork, previousBackground, accent, energy, reducedMotion }: {
  sceneId: string;
  background?: string;
  coverArtwork?: string;
  previousBackground?: string;
  accent?: string;
  energy: SceneEnergy;
  reducedMotion: boolean;
}) {
  const fallbackImage = coverArtwork ? `url("${coverArtwork}")` : "radial-gradient(ellipse at 18% 26%, #f2bd8140, transparent 30%), radial-gradient(ellipse at 78% 68%, #9274df66, transparent 38%), radial-gradient(ellipse at 46% 54%, #243c5a 0%, #141322 38%, #090910 76%)";
  const image = background ? `url("${background}")` : fallbackImage;
  const style = { "--scene-accent": accent ?? "#a78bfa", "--scene-bass": energy.bass, "--scene-mids": energy.mids, "--scene-treble": energy.treble, "--scene-energy": energy.loudness } as CSSProperties;
  return <div key={sceneId} data-visual-scene="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden" style={style} aria-hidden="true">
    <div data-scene-layer="BackgroundLayer" className="scene-background absolute -inset-[8%] bg-cover bg-center">
      {background ? <img key={background} className="scene-art absolute inset-0 h-full w-full object-cover" src={background} alt="" /> : <div key="fallback" className="scene-art absolute inset-0 bg-cover bg-center" style={{ backgroundImage: fallbackImage }} />}
      {previousBackground && <img key={previousBackground} className="scene-art-exit absolute inset-0 h-full w-full object-cover" src={previousBackground} alt="" />}
    </div>
    <div data-scene-layer="MidgroundLayer" className="scene-midground absolute -inset-[10%] bg-cover bg-center opacity-35 mix-blend-screen" style={{ backgroundImage: image }} />
    <div data-scene-layer="ForegroundLayer" className="scene-foreground absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,transparent_18%,rgba(3,4,12,.32)_68%,rgba(3,4,12,.9)_100%)]" />
    <div data-scene-layer="ParticleLayer" className="absolute inset-0 overflow-hidden">{Array.from({ length: 24 }, (_, i) => <span key={i} className="scene-particle absolute h-1 w-1 rounded-full bg-cyan-100/70 shadow-[0_0_12px_rgba(165,243,252,.9)]" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${-(i % 9)}s`, opacity: Math.min(.8, .15 + energy.treble * .7) }} />)}</div>
    <div data-scene-layer="LightingLayer" className="scene-lighting absolute inset-0 mix-blend-screen" />
    <div data-scene-layer="AudioReactiveLayer" className="scene-audio-reactive absolute inset-0" />
    <style jsx>{`
      .scene-background { animation: scene-crossfade 1.2s ease-out, ${reducedMotion ? "none" : "scene-drift 28s ease-in-out infinite alternate"}; transform: scale(${1.1 + energy.bass * .045}); filter: blur(${Math.max(0, 9 - energy.loudness * 7)}px); transition: transform 900ms ease, filter 900ms ease, background-image 900ms ease; }
      .scene-art { animation: scene-crossfade 1.6s ease-out both; }
      .scene-art-exit { animation: scene-crossfade-out 1.6s ease-in both; }
      .scene-midground { animation: scene-crossfade 1.7s ease-out, ${reducedMotion ? "none" : "scene-drift 19s ease-in-out infinite alternate-reverse"}; transform: translate(${(energy.mids - .5) * 14}px, ${(energy.mids - .5) * -8}px) scale(1.14); filter: blur(7px); }
      .scene-particle { animation: ${reducedMotion ? "none" : "scene-particle 9s linear infinite"}; }
      .scene-lighting { background: radial-gradient(ellipse at 50% 82%, color-mix(in srgb, var(--scene-accent) calc(20% + var(--scene-bass) * 48%), transparent), transparent 55%); opacity: .6; transition: opacity 200ms ease; }
      .scene-audio-reactive { box-shadow: inset 0 0 ${20 + energy.bass * 70}px color-mix(in srgb, var(--scene-accent) ${Math.round(8 + energy.loudness * 24)}%, transparent); }
      @keyframes scene-drift { from { transform: scale(1.08) translate3d(-.6%,0,0); } to { transform: scale(1.14) translate3d(.6%,-.5%,0); } }
      @keyframes scene-crossfade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes scene-crossfade-out { from { opacity: .82; } to { opacity: 0; } }
      @keyframes scene-particle { 0% { transform: translate3d(0,18px,0) scale(.7); } 50% { transform: translate3d(5px,-22px,0) scale(1.3); } 100% { transform: translate3d(0,-60px,0) scale(.6); } }
    `}</style>
  </div>;
}
