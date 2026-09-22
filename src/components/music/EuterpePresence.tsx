"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from "react";
import type { VisualQuality } from "@/lib/music/music-studio";
import { getEuterpeCharacterAsset, type EuterpeVisualState } from "@/lib/music/euterpe-character";
import { clampPosition, classifyEuterpeGesture, EUTERPE_DRAG_THRESHOLD, EUTERPE_POSITION_KEY, isEuterpeMotionEnabled, readEuterpePosition, saveEuterpePosition, type NormalizedPosition } from "@/lib/music/euterpe-avatar";
import { idlePhase, idleRestPosition } from "@/lib/music/euterpe-living";

export type EuterpeAudioMetrics = { bass: number; mids: number; treble: number; energy: number; calmness: number };
const label: Record<EuterpeVisualState, string> = { IDLE:"disponível", LISTENING:"ouvindo", THINKING:"processando resposta", SPEAKING:"respondendo", HAPPY:"contente", CURIOUS:"curiosa", ALERT:"atenta", SLEEP:"em repouso", MUSIC_REACTIVE:"ouvindo música", MUSIC_PAUSED:"música pausada", TRACK_CHANGED:"faixa mudou", ATHENA_DELEGATION:"em contato com Athena" };
const avatarSize = { width: 88, height: 116 };

/** In-page presence only; web browsers do not provide a cross-app character overlay. */
export function EuterpePresence({ state, audio, quality, onClick, onHide, onBackToMusic, reducedMotion = false, reactiveMotion = true }: {
  state: EuterpeVisualState; audio: EuterpeAudioMetrics; quality: VisualQuality; onClick: () => void; onHide?: () => void; onBackToMusic?: () => void; reducedMotion?: boolean; reactiveMotion?: boolean;
}) {
  const [smooth, setSmooth] = useState(audio);
  const [position, setPosition] = useState<NormalizedPosition>({ x: .88, y: .78 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [left, setLeft] = useState(0); const [top, setTop] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [tapPulse, setTapPulse] = useState(false);
  const [idleElapsed, setIdleElapsed] = useState(0);
  const node = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const longPressTimer = useRef<number | null>(null); const longPressed = useRef(false);
  const activityAt = useRef(Date.now());
  const setFromNormalized = useCallback((p: NormalizedPosition) => { const bounded = clampPosition(p); setPosition(bounded); setLeft(bounded.x * Math.max(0, window.innerWidth - avatarSize.width)); setTop(bounded.y * Math.max(0, window.innerHeight - avatarSize.height)); }, []);
  useEffect(() => { setFromNormalized(readEuterpePosition(window.localStorage) ?? { x: .88, y: .78 }); const resize = () => setFromNormalized(position); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); // normalized coordinates adapt to viewport changes
  }, [setFromNormalized]);
  useEffect(() => setSmooth((old) => ({ bass: old.bass*.78+audio.bass*.22, mids:old.mids*.82+audio.mids*.18, treble:old.treble*.8+audio.treble*.2, energy:old.energy*.84+audio.energy*.16, calmness:old.calmness*.9+audio.calmness*.1 })), [audio.bass,audio.mids,audio.treble,audio.energy,audio.calmness]);
  useEffect(() => { const timer = window.setInterval(() => setIdleElapsed(Date.now() - activityAt.current), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const markActivity = () => { activityAt.current = Date.now(); setIdleElapsed(0); };
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    return () => { window.removeEventListener("pointerdown", markActivity); window.removeEventListener("keydown", markActivity); };
  }, []);
  useEffect(() => { activityAt.current = Date.now(); setIdleElapsed(0); }, [state]);
  useEffect(() => () => { if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current); }, []);
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button[data-menu-action]")) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id:event.pointerId,x:event.clientX,y:event.clientY,left,top,moved:false }; longPressed.current=false;
    longPressTimer.current=window.setTimeout(()=>{ if(pointer.current&&!pointer.current.moved){longPressed.current=true;setMenuOpen(true);} },560);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start=pointer.current; if(!start||start.id!==event.pointerId)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(!start.moved&&Math.hypot(dx,dy)>=EUTERPE_DRAG_THRESHOLD){start.moved=true;setDragging(true);setMenuOpen(false);if(longPressTimer.current!==null)window.clearTimeout(longPressTimer.current);}
    if(start.moved){const nextLeft=Math.max(0,Math.min(window.innerWidth-avatarSize.width,start.left+dx));const nextTop=Math.max(0,Math.min(window.innerHeight-avatarSize.height,start.top+dy));setLeft(nextLeft);setTop(nextTop);const next={x:nextLeft/Math.max(1,window.innerWidth-avatarSize.width),y:nextTop/Math.max(1,window.innerHeight-avatarSize.height)};setPosition(next);}
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start=pointer.current;if(!start||start.id!==event.pointerId)return;
    if(longPressTimer.current!==null)window.clearTimeout(longPressTimer.current);
    if(start.moved){saveEuterpePosition(window.localStorage,position,EUTERPE_POSITION_KEY);setDragging(false);}
    else if(classifyEuterpeGesture(start.moved,longPressed.current)==="TAP"){ activityAt.current=Date.now(); setIdleElapsed(0); setTapPulse(true); window.setTimeout(()=>setTapPulse(false),700); setMenuOpen((open)=>!open); }
    pointer.current=null;
  };
  const handleKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => { if(event.key==="Enter"||event.key===" "){event.preventDefault();setMenuOpen((open)=>!open);} };
  const speed=Math.max(4.2,Math.min(8,6.5-smooth.energy*1.8+smooth.calmness));
  const motionEnabled=isEuterpeMotionEnabled(reducedMotion,reactiveMotion);
  const audioTransform=motionEnabled&&state==="MUSIC_REACTIVE"?`translateY(${Math.max(-2,Math.min(1,(smooth.mids-.15)*3))}px) scale(${1+Math.min(.022,smooth.bass*.022)})`:undefined;
  const playPose=state==="MUSIC_REACTIVE"||state==="TRACK_CHANGED";
  const phase = idlePhase(idleElapsed);
  const resting = phase === "REST_ELIGIBLE" && (state === "IDLE" || state === "MUSIC_PAUSED");
  const displayState = resting ? "SLEEP" : state;
  const asset = getEuterpeCharacterAsset(displayState);
  useEffect(() => {
    if (!resting) return;
    const spot = idleRestPosition();
    const timer = window.setTimeout(() => {
      setFromNormalized(spot);
      saveEuterpePosition(window.localStorage, spot, EUTERPE_POSITION_KEY);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [resting, setFromNormalized]);
  const phaseClass = phase === "ACTIVE_IDLE" ? "euterpe-active" : phase === "RELAXED_IDLE" ? "euterpe-relaxed" : "euterpe-rest-ready";
  return <div ref={node} role="group" aria-label="Presença de Euterpe" data-idle-phase={phase} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} className={`fixed z-40 flex h-[116px] w-[88px] touch-none select-none items-end justify-center ${phaseClass} ${resting ? "euterpe-resting transition-[left,top] duration-[1400ms] ease-in-out" : dragging ? "transition-none" : ""} ${dragging?"cursor-grabbing":"cursor-grab"}`} style={{left,top,touchAction:"none"}} data-testid="euterpe-presence">
    <span className="sr-only" aria-live="polite">Euterpe está {resting ? "descansando" : label[displayState]}.</span>
    <button type="button" aria-label={`Euterpe, ${resting ? "descansando" : label[displayState]}. Toque para opções; segure e arraste para mover.`} aria-expanded={menuOpen} onKeyDown={handleKeyboard} className="relative z-10 flex h-full w-full items-end justify-center border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100"><img src={playPose?"/music/euterpe/euterpe-chibi-lyre.png":asset.src} alt="" draggable={false} className={`h-auto max-h-[108px] w-auto max-w-[82px] object-contain ${motionEnabled||tapPulse?"euterpe-breathe":""}`} style={{transform:audioTransform,filter:`drop-shadow(0 2px ${5+smooth.energy*6}px rgba(232,203,159,${.18+smooth.energy*.17}))`,"--euterpe-duration":`${tapPulse?.7:speed}s`} as CSSProperties} /></button>
    {state==="LISTENING"&&<span className="pointer-events-none absolute left-1 top-8 h-5 w-5 rounded-full border border-amber-100/65 animate-ping" aria-hidden="true"/>}
    {state==="ATHENA_DELEGATION"&&<span className="pointer-events-none absolute right-0 top-2 rounded-full bg-[#171217]/80 px-2 py-1 text-[9px] text-amber-100">Athena</span>}
    {playPose&&quality!=="low"&&reactiveMotion&&!reducedMotion&&smooth.treble>.12&&<span className="pointer-events-none absolute right-2 top-4 text-xs text-amber-50/80" aria-hidden="true">♪</span>}
    {menuOpen&&<div role="group" aria-label="Opções de Euterpe" className="absolute bottom-[calc(100%-8px)] right-0 z-20 w-40 space-y-1 rounded-xl border border-amber-100/15 bg-[#17151bf2] p-2 text-left shadow-xl backdrop-blur-xl" onPointerDown={(e)=>e.stopPropagation()}>
      <button data-menu-action type="button" onClick={onClick} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-white hover:bg-white/10">Conversar</button>
      <button data-menu-action type="button" disabled title="Interação por voz ainda não está disponível" className="block w-full rounded-lg px-3 py-2 text-left text-xs text-white/45">Falar · indisponível</button>
      <button data-menu-action type="button" onClick={()=>{setMenuOpen(false);onBackToMusic?.();}} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-white hover:bg-white/10">Voltar ao Music</button>
      <button data-menu-action type="button" onClick={()=>{saveEuterpePosition(window.localStorage,{x:.88,y:.78});setFromNormalized({x:.88,y:.78});}} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-white hover:bg-white/10">Redefinir posição</button>
      <button data-menu-action type="button" onClick={()=>{setMenuOpen(false);onHide?.();}} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-white hover:bg-white/10">Ocultar Euterpe</button>
    </div>}
    <style jsx>{`@keyframes euterpe-breathe{0%,100%{translate:0 0;rotate:-.5deg}50%{translate:0 -2px;rotate:.5deg}}@keyframes euterpe-relaxed{0%,100%{translate:0 0;rotate:-1deg}50%{translate:0 -3px;rotate:1deg}}@keyframes euterpe-lookaround{0%,70%,100%{translate:0 0;rotate:0}82%{translate:-4px -1px;rotate:-3deg}91%{translate:4px 0;rotate:3deg}}.euterpe-breathe{animation:euterpe-breathe var(--euterpe-duration) ease-in-out infinite;transform-origin:50% 90%}.euterpe-relaxed .euterpe-breathe{animation-name:euterpe-relaxed;animation-duration:8s}.euterpe-rest-ready .euterpe-breathe{animation-name:euterpe-lookaround;animation-duration:12s}.euterpe-resting .euterpe-breathe{animation-name:euterpe-relaxed;animation-duration:10s;filter:saturate(.88)}@media(prefers-reduced-motion:reduce){.euterpe-breathe{animation:none}}`}</style>
  </div>;
}
