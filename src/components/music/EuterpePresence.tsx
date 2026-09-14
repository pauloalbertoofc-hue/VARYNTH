"use client";

import { useEffect, useState } from "react";

export type EuterpeState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING" | "HAPPY" | "CURIOUS" | "ALERT" | "SLEEP" | "MUSIC_REACTIVE";

const stateLabel: Record<EuterpeState, string> = {
  IDLE: "disponível", LISTENING: "ouvindo", THINKING: "pensando", SPEAKING: "respondendo",
  HAPPY: "contente", CURIOUS: "curiosa", ALERT: "atenção", SLEEP: "em repouso", MUSIC_REACTIVE: "sentindo a música",
};

export function EuterpePresence({ state, energy, onClick }: { state: EuterpeState; energy: number; onClick: () => void }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return <button type="button" data-state={state} onClick={onClick} aria-label={`Conversar com Euterpe, ${stateLabel[state]}`} title={`Euterpe · ${stateLabel[state]}`} className="group fixed bottom-5 right-5 z-40 grid h-[76px] w-[76px] place-items-center rounded-full border border-violet-200/30 bg-[#100f1b]/80 shadow-[0_0_35px_rgba(139,92,246,0.22)] backdrop-blur-xl transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-200 sm:bottom-7 sm:right-7" style={{ ["--euterpe-energy" as string]: String(Math.max(0, Math.min(1, energy))) }}>
    <span className={`euterpe-motion relative grid h-14 w-14 place-items-center ${reducedMotion ? "!animate-none" : ""}`}>
      <span className="absolute inset-1 rounded-[45%] bg-gradient-to-br from-cyan-200/80 via-violet-300/55 to-fuchsia-400/70 blur-[1px] transition-transform duration-300" style={{ transform: `scale(${1 + Math.min(energy, .6) * .16})` }} />
      <svg viewBox="0 0 64 64" aria-hidden="true" className="relative h-12 w-12 overflow-visible drop-shadow-[0_0_10px_rgba(165,180,252,0.8)]">
        <path d="M32 7c9 8 16 15 16 25 0 12-7 21-16 24C23 53 16 44 16 32 16 22 23 14 32 7Z" fill="url(#euterpe-core)" stroke="rgba(224,231,255,.9)" strokeWidth="1.5" />
        <path d="M23 29c2-5 5-8 9-10 4 2 7 5 9 10-4-2-6-3-9-3s-5 1-9 3Z" fill="rgba(15,18,35,.82)" />
        <ellipse cx="27" cy="34" rx="2.5" ry="3.3" fill="#dffcff" /><ellipse cx="37" cy="34" rx="2.5" ry="3.3" fill="#dffcff" />
        <path d="M27 42q5 4 10 0" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="1.4" />
        <path d="M8 34c4-3 5-7 5-11m43 11c-4-3-5-7-5-11" fill="none" stroke="rgba(165,243,252,.85)" strokeWidth="1.5" />
        <circle cx="11" cy="19" r="1.5" fill="#c4b5fd" /><circle cx="53" cy="16" r="1.2" fill="#a5f3fc" />
        <defs><linearGradient id="euterpe-core" x1="18" x2="47" y1="10" y2="54" gradientUnits="userSpaceOnUse"><stop stopColor="#a5f3fc" /><stop offset=".5" stopColor="#a78bfa" /><stop offset="1" stopColor="#e879f9" /></linearGradient></defs>
      </svg>
      <span className="absolute -bottom-1 rounded-full border border-white/10 bg-[#141321] px-2 py-0.5 text-[9px] font-medium text-violet-100">Euterpe</span>
    </span>
    <style jsx>{`
      .euterpe-motion { animation: euterpe-float 4s ease-in-out infinite; }
      button[data-state="SLEEP"] .euterpe-motion { animation-duration: 7s; opacity: .76; }
      button[data-state="THINKING"] .euterpe-motion { animation-name: euterpe-think; animation-duration: 5s; }
      button[data-state="LISTENING"] .euterpe-motion { animation-duration: 2.8s; }
      button[data-state="SPEAKING"] .euterpe-motion, button[data-state="HAPPY"] .euterpe-motion { animation-duration: 1.8s; }
      button[data-state="CURIOUS"] .euterpe-motion { animation-name: euterpe-tilt; }
      button[data-state="ALERT"] { box-shadow: 0 0 42px rgba(251,191,36,.32); }
      button[data-state="MUSIC_REACTIVE"] .euterpe-motion { animation-duration: calc(4s - var(--euterpe-energy) * 1.1s); }
      @keyframes euterpe-float { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-5px) rotate(1deg); } }
      @keyframes euterpe-think { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-4px) rotate(3deg); } }
      @keyframes euterpe-tilt { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(4deg) translateY(-4px); } }
      @media (prefers-reduced-motion: reduce) { .euterpe-motion { animation: none !important; } }
    `}</style>
  </button>;
}
