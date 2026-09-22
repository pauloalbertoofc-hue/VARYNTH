"use client";

import type { CSSProperties } from "react";

export function CoverArtwork({ src, title, className = "" }: { src?: string; title: string; className?: string }) {
  if (src) return <img src={src} alt={`Artwork de ${title}`} draggable={false} className={`h-full w-full object-cover ${className}`} />;
  return <div role="img" aria-label={`Composição visual local para ${title}`} className={`h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_25%_30%,#f0c18c55,transparent_45%),radial-gradient(ellipse_at_75%_70%,#9277d988,transparent_45%),linear-gradient(140deg,#20152d,#0b0b15_55%,#161d27)] ${className}`}><span className="block h-full w-full rounded-[42%] border border-white/10 bg-[radial-gradient(ellipse_at_50%_48%,transparent_32%,#fff1_33%,transparent_36%)]" /></div>;
}

/** Presentation controls depth and light; artwork stays an independent replaceable asset. */
export function CoverPresentation({ src, title, accent, bass, mids, playing, reducedMotion }: { src?: string; title: string; accent: string; bass: number; mids: number; playing: boolean; reducedMotion: boolean }) {
  const style = { "--cover-accent": accent, transform: `perspective(1000px) rotateY(${reducedMotion ? 0 : (mids - .5) * 8}deg) rotateX(${reducedMotion ? 0 : (bass - .5) * -6}deg) translateY(${playing && !reducedMotion ? -2 : 0}px)`, filter: `drop-shadow(0 26px 54px rgba(0,0,0,.52)) drop-shadow(0 0 ${8 + bass * 26}px color-mix(in srgb, ${accent} 45%, transparent))` } as CSSProperties;
  return <div className={`cover-presentation relative aspect-square w-full ${!reducedMotion ? "cover-drift" : ""}`} style={style}>
    <div className="pointer-events-none absolute -inset-20 rounded-full opacity-50 blur-[60px]" style={{ background: `radial-gradient(ellipse, color-mix(in srgb, ${accent} ${18 + bass * 42}%, transparent), transparent 68%)` }} />
    <div className="relative h-full w-full overflow-hidden rounded-[30%] [clip-path:polygon(50%_0%,90%_12%,100%_50%,90%_88%,50%_100%,10%_88%,0%_50%,10%_12%)] ring-1 ring-white/20"><CoverArtwork src={src} title={title} /></div>
    <style jsx>{`@keyframes drift{0%,100%{translate:0 0}50%{translate:0 -7px}}.cover-drift{animation:drift 8s ease-in-out infinite}`}</style>
  </div>;
}
