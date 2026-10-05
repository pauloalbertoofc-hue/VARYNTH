"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Disc3, ListMusic, Music2, Pause, Play, Send, SkipBack, SkipForward, Volume2, X, Mic2 } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { athenaEventBus } from "@/lib/athena/events/event-bus";
import { processAthenaQueryAsync } from "@/lib/athena/engine";
import { AthenaCapabilityPlanPanel } from "@/components/athena/AthenaCapabilityPlanPanel";
import { AthenaFeedbackControls } from "@/components/athena/AthenaFeedbackControls";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { adjacentTrackIndex, createMusicTrack, formatMusicTime, isSupportedMusicFile, musicLibrary } from "@/lib/music/music-library";
import { resolveAccountArtwork } from "@/lib/music/visual-artwork-persistence";
import { analyzeSections, LocalVisualGenerationProvider, makeMusicDNA, MUSIC_ANALYSIS_LIMITS, musicSpecialist, musicStudio, RemoteVisualGenerationProvider, spectralFeatures, type MusicDNA, type MusicFeedback, type MusicPlaylist, type VisualQuality } from "@/lib/music/music-studio";
import { musicAgentShouldConsultAthena, resolveEuterpeCorrectionRequest, runMusicAgentTurn } from "@/lib/music/music-agent-bridge";
import { athenaConversationFeedback } from "@/lib/athena/conversation/quality-feedback";
import { readMusicMetadata } from "@/lib/music/music-metadata";
import { importMusicBatch } from "@/lib/music/music-import";
import { MusicTrack } from "@/lib/music/types";
import { applyVisualDirective, applyVisualMotionPreset, createVisualProfile, visualFrameStyle, type ParticleType, type VisualMotionMode, type VisualProfile } from "@/lib/music/visual-profile";
import { authorizeEuterpeProposal, type EuterpeConversationTurn, type EuterpeProposal } from "@/lib/music/euterpe";
import { PermissionPolicyEngine } from "@/lib/permissions/permission-policy";
import { EuterpePresence } from "@/components/music/EuterpePresence";
import { EuterpeCharacterArtwork } from "@/components/music/EuterpeCharacterArtwork";
import type { EuterpeVisualState } from "@/lib/music/euterpe-character";
import { getEuterpeOverlayBridge, type EuterpeNativePlayerState } from "@/lib/music/euterpe-native-bridge";
import { euterpeVoiceProvider } from "@/lib/music/euterpe-voice";
import { VisualScene } from "@/components/music/VisualScene";
import { musicSeekTimeAtPointer } from "@/lib/music/music-playback";
import { decodeWaveform, MusicEngine } from "@/lib/music/music-engine";
import { EuterpeAgent, visualStateForMusic, type EuterpeAgentState } from "@/lib/music/euterpe-agent";
import { varynthEventBus, type VarynthEvent } from "@/lib/events/varynth-event-bus";
import { CoverPresentation } from "@/components/music/CoverPresentation";
import { resolveVisualAssetTargetIds, type VisualAssetScope } from "@/lib/music/visual-asset-targets";
import { VisualEffectControls } from "@/components/music/VisualEffectControls";
import { musicLearningAdapter } from "@/lib/experience/music-learning-adapter";
import { MusicVisualProviderSettings } from "@/components/music/MusicVisualProviderSettings";
import { LEGACY_ATHENA_SESSION_STORAGE_KEY, LEGACY_MUSIC_CHAT_STORAGE_KEY, musicChatScopeFromSession, musicChatStorageKeys } from "@/lib/music/music-chat-storage";

const visualProvider = new LocalVisualGenerationProvider();
const athenaVisualProvider = new RemoteVisualGenerationProvider();
async function toNativeArtworkDataUrl(source: string | undefined): Promise<string | undefined> {
  if (!source || typeof createImageBitmap === "undefined") return undefined;
  try {
    const response = await fetch(source, { credentials: "include", cache: "no-store" });
    if (!response.ok) return undefined;
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) { bitmap.close(); return undefined; }
    const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
    const width = bitmap.width * scale; const height = bitmap.height * scale;
    context.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    bitmap.close();
    return canvas.toDataURL("image/png");
  } catch { return undefined; }
}
async function persistAccountVisualProfile(profile: VisualProfile): Promise<VisualProfile> {
  if (!musicLibrary.isAccountStorageAvailable()) return profile;
  const next = { ...profile };
  for (const kind of ["cover", "background"] as const) {
    const field = kind === "cover" ? "coverDataUrl" : "backgroundDataUrl";
    const value = next[field];
    if (value?.startsWith("data:") && !(kind === "cover" ? profile.coverCleared : profile.backgroundCleared)) {
      const blob = await fetch(value).then((response) => response.blob());
      const extension = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1]?.replace("svg+xml", "svg") || "png";
      const file = new File([blob], `${profile.trackId}.${extension}`, { type: blob.type || "image/png" });
      await musicLibrary.uploadArtwork(file, kind, [profile.trackId]);
    }
  }
  const urls = await musicLibrary.getArtworkUrls(profile.trackId);
  if (urls.coverUrl) next.coverDataUrl = urls.coverUrl;
  if (urls.backgroundUrl) next.backgroundDataUrl = urls.backgroundUrl;
  return next;
}
const colors = ["violet", "cyan", "rose", "amber"];
const playlistDot: Record<string, string> = { violet: "bg-violet-400", cyan: "bg-cyan-400", rose: "bg-rose-400", amber: "bg-amber-400" };
type CuratorMessage = { id: string; sender: "user" | "curator"; text: string; createdAt: string; consultedAthena?: boolean; athenaPlanId?: string; proposal?: EuterpeProposal };
type MusicView = "home" | "library" | "playlists" | "now-playing";
const WELCOME: CuratorMessage = { id: "euterpe-welcome-v1", sender: "curator", text: "Euterpe online. Já estou ouvindo com você. Sou sua sub-IA musical, subordinada à Athena; quando o pedido ultrapassa o Music, consulto Athena e retorno para esta conversa.", createdAt: "" };

export default function MusicPage() {
  const store = useVarynthStore();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [loading, setLoading] = useState(true);
  const [accountStorage, setAccountStorage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [quality, setQuality] = useState<VisualQuality>("balanced");
  const [spectrum, setSpectrum] = useState<number[]>(Array(32).fill(0));
  const [waveform, setWaveform] = useState<number[]>([]);
  const [dna, setDna] = useState<MusicDNA | undefined>();
  const [visualProfile, setVisualProfile] = useState<VisualProfile | undefined>();
  const [visualProfileReadyTrackId, setVisualProfileReadyTrackId] = useState<string | null>(null);
  const [previousSceneBackground, setPreviousSceneBackground] = useState<string | undefined>();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [audioFrame, setAudioFrame] = useState({ bass: 0, mids: 0, treble: 0, loudness: 0 });
  const [sections, setSections] = useState<ReturnType<typeof analyzeSections>>([]);
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [visualConcept, setVisualConcept] = useState("");
  const [visualActionStatus, setVisualActionStatus] = useState("");
  const [visualBusy, setVisualBusy] = useState(false);
  const [visualAssetScope, setVisualAssetScope] = useState<VisualAssetScope>("TRACK");
  const [visualTargetIds, setVisualTargetIds] = useState<string[]>([]);
  const [feedbackRating, setFeedbackRating] = useState(4);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [feedbackRows, setFeedbackRows] = useState<MusicFeedback[]>([]);
  const [activeView, setActiveView] = useState<MusicView>("now-playing");
  const [chatMessages, setChatMessages] = useState<CuratorMessage[]>([WELCOME]);
  const [chatStorageKey, setChatStorageKey] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatStatus, setChatStatus] = useState("");
  const [chatReady, setChatReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [euterpeExpression, setEuterpeExpression] = useState<EuterpeVisualState | null>(null);
  const [agentState, setAgentState] = useState<EuterpeAgentState>("IDLE");
  const [euterpeHidden, setEuterpeHidden] = useState(false);
  const [nativeOverlaySupported, setNativeOverlaySupported] = useState(false);
  const [nativeOverlayGranted, setNativeOverlayGranted] = useState(false);
  const [nativeOverlayEnabled, setNativeOverlayEnabled] = useState(false);
  const [reactiveMotion, setReactiveMotion] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [reducedMotionSetting, setReducedMotionSetting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const previousSceneTimerRef = useRef<number | null>(null);
  const athenaSessionIdRef = useRef("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioCloseTimerRef = useRef<number | null>(null);
  const binsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const musicEngineRef = useRef<MusicEngine | null>(null);
  if (!musicEngineRef.current) musicEngineRef.current = new MusicEngine();
  const euterpeAgentRef = useRef<EuterpeAgent | null>(null);
  if (!euterpeAgentRef.current) euterpeAgentRef.current = new EuterpeAgent();
  const dnaAccumRef = useRef({ count: 0, loudness: 0, centroid: 0, bass: 0, mids: 0, treble: 0 });
  const sectionSamplesRef = useRef<number[]>([]);
  const visualProfileRef = useRef<VisualProfile | undefined>(undefined);
  const selectedTrack = useMemo(() => tracks.find((track) => track.id === selectedId) ?? null, [tracks, selectedId]);
  const selectedTrackRef = useRef(selectedTrack);
  selectedTrackRef.current = selectedTrack;
  const visualProfileReady = !selectedTrack || visualProfileReadyTrackId === selectedTrack.id;
  const selectedVisualProfile = visualProfile?.trackId === selectedTrack?.id ? visualProfile : undefined;
  const selectedVisualProfileRef = visualProfileRef.current?.trackId === selectedTrack?.id ? visualProfileRef.current : undefined;
  useEffect(() => { visualProfileRef.current = visualProfile; }, [visualProfile]);
  const permissionEngine = useMemo(() => new PermissionPolicyEngine(), []);
  const visibleTracks = useMemo(() => { const p = playlists.find((item) => item.id === activePlaylist); return p ? tracks.filter((track) => p.trackIds.includes(track.id)) : tracks; }, [tracks, playlists, activePlaylist]);
  const euterpeState: EuterpeVisualState = chatBusy ? (chatStatus.includes("consultando Athena") ? "ATHENA_DELEGATION" : "THINKING") : euterpeExpression ?? (chatOpen ? "LISTENING" : agentState === "IDLE" && tracks.length ? "IDLE" : visualStateForMusic(agentState));
  useEffect(() => {
    if (!euterpeExpression) return;
    const timer = window.setTimeout(() => setEuterpeExpression(null), 1100);
    return () => window.clearTimeout(timer);
  }, [euterpeExpression]);
  useEffect(() => () => { if (previousSceneTimerRef.current !== null) window.clearTimeout(previousSceneTimerRef.current); }, []);
  useEffect(() => {
    const bridge = getEuterpeOverlayBridge();
    if (!bridge) return;
    setNativeOverlaySupported(true);
    void bridge.checkPermission().then((result) => { setNativeOverlaySupported(result.supported); setNativeOverlayGranted(result.granted); setNativeOverlayEnabled(result.enabled); }).catch(() => setNativeOverlaySupported(false));
  }, []);

  const reloadLibrary = useCallback(async () => {
    try {
      const [saved, lists] = await Promise.all([musicLibrary.list(), musicStudio.listPlaylists()]);
      setAccountStorage(musicLibrary.isAccountStorageAvailable());
      setTracks(saved); setPlaylists(lists);
      setSelectedId((current) => current && saved.some((track) => track.id === current) ? current : saved[0]?.id ?? null);
      const feedback = await musicStudio.listFeedback(); setFeedbackRows(feedback.sort((a, b) => b.createdAt.localeCompare(a.createdAt))); setFeedbackCount(feedback.length);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar a biblioteca local."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reloadLibrary(); }, [reloadLibrary]);
  useEffect(() => {
    const agent = euterpeAgentRef.current!;
    const observe = (event: VarynthEvent) => {
      const decision = agent.observe(event);
      if (!decision.behavior) return;
      setAgentState(agent.visualState);
      if (decision.behavior.durationMs > 0) window.setTimeout(() => setAgentState(agent.currentMusicState), decision.behavior.durationMs);
    };
    const offs = [
      varynthEventBus.on("MUSIC.TRACK_CHANGED", (e) => observe(e)), varynthEventBus.on("MUSIC.PLAYING", (e) => observe(e)), varynthEventBus.on("MUSIC.PAUSED", (e) => observe(e)), varynthEventBus.on("MUSIC.IDLE", (e) => observe(e)),
      varynthEventBus.on("AGENT.LISTENING", (e) => observe(e)), varynthEventBus.on("AGENT.THINKING", (e) => observe(e)), varynthEventBus.on("AGENT.RESULT", (e) => observe(e)), varynthEventBus.on("ATHENA.REQUEST", (e) => observe(e)), varynthEventBus.on("ATHENA.ENTERED_CONTEXT", (e) => observe(e)), varynthEventBus.on("AGENT.SHARED_EVENT", (e) => observe(e)),
    ];
    return () => offs.forEach((off) => off());
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) throw new Error("A identidade da conversa não foi confirmada.");
        const scope = musicChatScopeFromSession(await response.json());
        if (!scope) throw new Error("A identidade da conversa não foi confirmada.");
        const keys = musicChatStorageKeys(scope);
        const legacyChatKey = LEGACY_MUSIC_CHAT_STORAGE_KEY;
        const legacySessionKey = LEGACY_ATHENA_SESSION_STORAGE_KEY;
        const raw = localStorage.getItem(keys.chat) ?? (scope.kind === "device" ? localStorage.getItem(legacyChatKey) : null);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (Array.isArray(saved) && saved.every((item) => item && (item.sender === "user" || item.sender === "curator") && typeof item.text === "string")) {
            if (active) setChatMessages(saved.map((item) => item.sender === "curator" && (item.id === WELCOME.id || item.text.startsWith("Oi! Eu sou a Curadora Musical.")) ? { ...item, id: WELCOME.id, text: WELCOME.text } : item));
          }
        }
        let sessionId = localStorage.getItem(keys.athenaSession) ?? (scope.kind === "device" ? localStorage.getItem(legacySessionKey) : null);
        if (!sessionId) sessionId = `music-curator-${crypto.randomUUID()}`;
        localStorage.setItem(keys.athenaSession, sessionId);
        if (active) { athenaSessionIdRef.current = sessionId; setChatStorageKey(keys.chat); setChatReady(true); }
      } catch {
        if (active) {
          athenaSessionIdRef.current = `music-curator-ephemeral-${crypto.randomUUID()}`;
          setChatStorageKey(null);
          setChatStatus("Não consegui confirmar a conta para salvar a conversa; ela ficará somente nesta sessão.");
          setChatReady(true);
        }
      }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => { if (chatReady && chatStorageKey) { try { localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages)); } catch { /* Keep the current conversation in memory. */ } } }, [chatMessages, chatReady, chatStorageKey]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatBusy]);

  useEffect(() => {
    const track = selectedTrackRef.current;
    musicEngineRef.current!.loadTrack(track ? { id: track.id, name: track.name } : undefined);
    let cancelled = false; let nextUrl: string | null = null; let temporaryUrl = false;
    const previousBackground = visualProfileRef.current?.backgroundDataUrl;
    if (previousBackground) {
      setPreviousSceneBackground(previousBackground);
      if (previousSceneTimerRef.current !== null) window.clearTimeout(previousSceneTimerRef.current);
      previousSceneTimerRef.current = window.setTimeout(() => setPreviousSceneBackground(undefined), 1900);
    }
    setPlaying(false); setCurrentTime(0); setDuration((track?.durationMs ?? 0) / 1000); setAudioUrl(null); setDna(undefined); setSections([]); setVisualProfile(undefined); setVisualProfileReadyTrackId(null);
    dnaAccumRef.current = { count: 0, loudness: 0, centroid: 0, bass: 0, mids: 0, treble: 0 }; sectionSamplesRef.current = [];
    if (!track) { setVisualActionStatus(""); return; }
    setVisualActionStatus("Carregando o perfil visual desta faixa…");
    setWaveform([]);
    void Promise.all([musicStudio.getDNA(track.id), musicStudio.getWaveform(track.id)]).then(async ([savedDNA, storedWaveform]) => {
      const streamingUrl = musicLibrary.streamingUrl(track);
      let audioBlob: Blob | undefined;
      if (streamingUrl) nextUrl = streamingUrl;
      else {
        audioBlob = await musicLibrary.getAudio(track.id, track);
        if (!audioBlob) throw new Error("O arquivo desta faixa não foi encontrado no armazenamento local.");
        nextUrl = URL.createObjectURL(audioBlob); temporaryUrl = true;
      }
      if (cancelled) { if (temporaryUrl) URL.revokeObjectURL(nextUrl); } else {
        setAudioUrl(nextUrl); setDna(savedDNA);
        if (storedWaveform?.schemaVersion === 1 && storedWaveform.peaks.length > 0) setWaveform(storedWaveform.peaks);
        else {
          try {
            audioBlob ??= streamingUrl ? await fetch(streamingUrl, { credentials: "include" }).then((response) => response.ok ? response.blob() : undefined) : undefined;
            if (audioBlob) {
              const decoded = await decodeWaveform(audioBlob, track.id, 128, track.durationMs / 1000);
              if (decoded && !cancelled) { setWaveform(decoded.peaks); await musicStudio.saveWaveform(decoded); }
            }
          } catch { /* Unsupported or large tracks keep seek controls without inventing a waveform. */ }
        }
        const stored = await musicStudio.getVisualProfile(track.id) as VisualProfile | undefined;
        if (cancelled) return;
        if (stored?.schemaVersion === 1) {
          const art = ((!stored.coverDataUrl && !stored.coverCleared) || (!stored.backgroundDataUrl && !stored.backgroundCleared)) ? await visualProvider.generate({ prompt: track.name, title: track.name, artist: track.artist, style: stored.mood, palette: stored.palette, createdAt: new Date().toISOString() }) : undefined;
          let refreshed: VisualProfile = {
            ...stored,
            coverDataUrl: stored.coverCleared ? undefined : stored.coverDataUrl ?? art?.coverDataUrl,
            backgroundDataUrl: stored.backgroundCleared ? undefined : stored.backgroundDataUrl ?? art?.backgroundDataUrl,
          };
          if (musicLibrary.isAccountStorageAvailable()) {
            const cloud = await musicLibrary.getArtworkUrls(track.id);
            const persisted = resolveAccountArtwork(
              { cover: cloud.coverUrl, background: cloud.backgroundUrl, coverCleared: cloud.coverCleared, backgroundCleared: cloud.backgroundCleared },
              { cover: stored.coverDataUrl, background: stored.backgroundDataUrl, coverCleared: stored.coverCleared, backgroundCleared: stored.backgroundCleared },
              { cover: art?.coverDataUrl, background: art?.backgroundDataUrl },
            );
            refreshed = {
              ...refreshed,
              coverDataUrl: persisted.cover,
              backgroundDataUrl: persisted.background,
              coverCleared: persisted.coverCleared,
              backgroundCleared: persisted.backgroundCleared,
              ...(cloud.visualSettings ?? {}),
            };
            refreshed = await persistAccountVisualProfile(refreshed);
          }
          await musicStudio.saveVisualProfile({ ...refreshed }); if (!cancelled) { setVisualProfile(refreshed); setVisualProfileReadyTrackId(track.id); setVisualActionStatus(""); }
        }
        else {
          const cloud = musicLibrary.isAccountStorageAvailable() ? await musicLibrary.getArtworkUrls(track.id) : {};
          const generateCover = !cloud.coverUrl && !cloud.coverCleared;
          const generateBackground = !cloud.backgroundUrl && !cloud.backgroundCleared;
          const generated = generateCover || generateBackground ? await visualProvider.generate({ prompt: track.name, title: track.name, artist: track.artist, style: "capa abstrata responsiva", createdAt: new Date().toISOString() }) : undefined;
          const persisted = resolveAccountArtwork({ cover: cloud.coverUrl, background: cloud.backgroundUrl, coverCleared: cloud.coverCleared, backgroundCleared: cloud.backgroundCleared }, {}, { cover: generated?.coverDataUrl, background: generated?.backgroundDataUrl });
          let profile: VisualProfile = { ...createVisualProfile(track.id, savedDNA), coverDataUrl: persisted.cover, backgroundDataUrl: persisted.background, coverCleared: persisted.coverCleared, backgroundCleared: persisted.backgroundCleared, ...(generated ? { palette: generated.palette, accentColor: generated.palette[0] } : {}), ...(cloud.visualSettings ?? {}) };
          if (musicLibrary.isAccountStorageAvailable()) profile = await persistAccountVisualProfile(profile);
          await musicStudio.saveVisualProfile({ ...profile }); if (!cancelled) { setVisualProfile(profile); setVisualProfileReadyTrackId(track.id); setVisualActionStatus(""); }
        }
      }
    }).catch(async (error: unknown) => {
      if (cancelled) return;
      setMessage(error instanceof Error ? error.message : "Não foi possível abrir esta faixa.");
      try {
        const stored = await musicStudio.getVisualProfile(track.id) as VisualProfile | undefined;
        if (!cancelled) setVisualProfile(stored?.schemaVersion === 1 ? stored : createVisualProfile(track.id));
      } catch { if (!cancelled) setVisualProfile(createVisualProfile(track.id)); }
      if (!cancelled) setVisualProfileReadyTrackId(track.id);
    });
    return () => { cancelled = true; if (temporaryUrl && nextUrl) URL.revokeObjectURL(nextUrl); };
  }, [selectedId]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume, audioUrl]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || typeof window === "undefined") return;
    if (audioCloseTimerRef.current !== null) { window.clearTimeout(audioCloseTimerRef.current); audioCloseTimerRef.current = null; }
    let context: AudioContext | undefined = audioContextRef.current ?? undefined; let frame = 0; let alive = true; let lastPaint = 0;
    try {
      if (!context || context.state === "closed") {
        context = new AudioContext(); audioContextRef.current = context;
        const source = context.createMediaElementSource(audio);
        const analyser = context.createAnalyser(); analyser.fftSize = MUSIC_ANALYSIS_LIMITS.fftSize.balanced;
        analyser.smoothingTimeConstant = 0.78; source.connect(analyser); analyser.connect(context.destination);
        analyzerRef.current = analyser; binsRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      const draw = () => {
        if (!alive) return;
        const bins = binsRef.current; const active = analyzerRef.current;
        if (bins && active && !audio.paused) {
          active.getByteFrequencyData(bins);
          const step = Math.max(1, Math.floor(bins.length / 32));
          const now = performance.now();
          const f = spectralFeatures(bins);
          if (now - lastPaint >= MUSIC_ANALYSIS_LIMITS.visualUpdateIntervalMs) {
            setSpectrum(Array.from({ length: 32 }, (_, i) => bins[Math.min(bins.length - 1, i * step)] / 255));
            setAudioFrame({ bass: f.bass, mids: f.mids, treble: f.treble, loudness: f.loudness });
            lastPaint = now;
          }
          const a = dnaAccumRef.current; a.count++; a.loudness += f.loudness; a.centroid += f.centroid; a.bass += f.bass; a.mids += f.mids; a.treble += f.treble;
          if (sectionSamplesRef.current.length < MUSIC_ANALYSIS_LIMITS.maxSectionSamples && Math.floor(audio.currentTime / MUSIC_ANALYSIS_LIMITS.sectionSampleIntervalSeconds) > sectionSamplesRef.current.length) sectionSamplesRef.current.push(f.loudness);
        }
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    } catch { setMessage("A análise visual não está disponível neste navegador; a reprodução continua disponível."); }
    return () => {
      alive = false; cancelAnimationFrame(frame);
      if (context && typeof window !== "undefined") audioCloseTimerRef.current = window.setTimeout(() => {
        if (audioContextRef.current === context) {
          void context.close(); audioContextRef.current = null; analyzerRef.current = null; binsRef.current = null;
        }
      }, 250);
    };
  }, []);
  useEffect(() => {
    const analyser = analyzerRef.current;
    if (analyser) { analyser.fftSize = MUSIC_ANALYSIS_LIMITS.fftSize[quality]; binsRef.current = new Uint8Array(analyser.frequencyBinCount); }
  }, [quality]);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!playing || !audioUrl || !selectedTrack) return;
    const interval = window.setInterval(() => {
      const a = dnaAccumRef.current; if (!a.count) return;
      const result = makeMusicDNA(selectedTrack.id, duration, [{ loudness: a.loudness / a.count, centroid: a.centroid / a.count, bass: a.bass / a.count, mids: a.mids / a.count, treble: a.treble / a.count }], new Date().toISOString(), "PARTIAL", analyzeSections(sectionSamplesRef.current, duration));
      if (result) { void musicStudio.saveDNA(result); setDna(result); setSections(result.sections); }
    }, MUSIC_ANALYSIS_LIMITS.dnaSaveIntervalMs);
    return () => window.clearInterval(interval);
  }, [playing, audioUrl, selectedTrack, duration]);

  const selectTrack = useCallback((track: MusicTrack) => {
    setSelectedId(track.id); athenaEventBus.emit("MUSIC_CHANGED", { trackId: track.id, title: track.name });
  }, []);
  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current; if (!audio || !audioUrl) return;
    if (audio.paused) { try { await audioContextRef.current?.resume(); await audio.play(); setPlaying(true); athenaEventBus.emit("MUSIC_PLAY", { trackId: selectedId }); setMessage(""); } catch { setPlaying(false); setMessage("O navegador não conseguiu reproduzir este arquivo de áudio."); } }
    else { audio.pause(); setPlaying(false); athenaEventBus.emit("MUSIC_PAUSE", { trackId: selectedId }); }
  }, [audioUrl, selectedId]);
  const stepTrack = useCallback((direction: -1 | 1) => { const index = adjacentTrackIndex(visibleTracks.findIndex((track) => track.id === selectedId), visibleTracks.length, direction); if (index >= 0) selectTrack(visibleTracks[index]); }, [visibleTracks, selectedId, selectTrack]);
  const nativePlayerState = useCallback(async (): Promise<EuterpeNativePlayerState> => ({
    state: euterpeState,
    title: selectedTrack?.name ?? "VARYNTH Music",
    artist: selectedTrack?.artist || "Euterpe está com você",
    playing,
    coverDataUrl: await toNativeArtworkDataUrl(visualProfile?.coverDataUrl),
  }), [euterpeState, selectedTrack, playing, visualProfile?.coverDataUrl]);
  const toggleNativeOverlay = useCallback(async () => {
    const bridge = getEuterpeOverlayBridge();
    if (!bridge) return;
    try {
      if (nativeOverlayEnabled) {
        await bridge.hide(); setNativeOverlayEnabled(false); setMessage("Personagem flutuante desativada."); return;
      }
      const permission = await bridge.checkPermission();
      setNativeOverlayGranted(permission.granted);
      if (!permission.granted) {
        await bridge.show(await nativePlayerState());
        setMessage("O Android abriu a permissão ‘Aparecer sobre outros apps’. Autorize e toque novamente em ‘Ativar personagem flutuante’.");
        return;
      }
      if (!permission.notificationsGranted) {
        const notificationPermission = await bridge.requestNotificationPermission();
        if (!notificationPermission.granted) {
          setMessage("Para manter Euterpe ativa fora do Music, permita as notificações do VARYNTH e tente novamente.");
          return;
        }
      }
      const result = await bridge.show(await nativePlayerState());
      if (result.permissionRequired) { setNativeOverlayGranted(false); setMessage("Autorize a sobreposição nas configurações do Android e tente novamente."); return; }
      setNativeOverlayEnabled(result.enabled);
      setMessage("Euterpe está flutuando sobre outros apps. A notificação oferece o comando para desativar.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível ativar a personagem flutuante."); }
  }, [nativeOverlayEnabled, nativePlayerState]);
  useEffect(() => {
    if (!nativeOverlayEnabled) return;
    const bridge = getEuterpeOverlayBridge();
    if (bridge) void nativePlayerState().then((state) => bridge.update(state)).catch(() => { setNativeOverlayEnabled(false); setMessage("A permissão da personagem flutuante foi removida pelo Android."); });
  }, [nativeOverlayEnabled, nativePlayerState]);
  useEffect(() => {
    const bridge = getEuterpeOverlayBridge();
    if (!bridge) return;
    let active = true;
    let listener: { remove(): Promise<void> } | undefined;
    void bridge.addListener("mediaAction", ({ action }) => {
      if (!active) return;
      if (action === "open") setActiveView("now-playing");
      else if (action === "play" && !playing) void togglePlayback();
      else if (action === "pause" && playing) void togglePlayback();
      else if (action === "previous") { stepTrack(-1); setActiveView("now-playing"); }
      else if (action === "next") { stepTrack(1); setActiveView("now-playing"); }
    }).then((handle) => { if (active) listener = handle; else void handle.remove(); }).catch(() => undefined);
    return () => { active = false; if (listener) void listener.remove(); };
  }, [playing, togglePlayback, stepTrack]);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !selectedTrack) return;
    const session = navigator.mediaSession;
    const cover = visualProfile?.coverDataUrl;
    const artwork = cover ? [{ src: new URL(cover, window.location.href).href, sizes: "512x512", type: /^data:([^;,]+)/.exec(cover)?.[1] || "image/png" }] : [];
    try {
      session.metadata = new MediaMetadata({ title: selectedTrack.name, artist: selectedTrack.artist || "Artista desconhecido", album: selectedTrack.album || "VARYNTH Music", artwork });
      session.setActionHandler("play", () => { const audio = audioRef.current; if (audio?.paused) void togglePlayback(); });
      session.setActionHandler("pause", () => { const audio = audioRef.current; if (audio && !audio.paused) void togglePlayback(); });
      session.setActionHandler("previoustrack", () => stepTrack(-1));
      session.setActionHandler("nexttrack", () => stepTrack(1));
      session.setActionHandler("seekto", (event) => { if (audioRef.current && Number.isFinite(event.seekTime)) audioRef.current.currentTime = Math.max(0, Math.min(duration || Infinity, event.seekTime!)); });
      session.setActionHandler("seekbackward", (event) => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - (event.seekOffset || 10)); });
      session.setActionHandler("seekforward", (event) => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration || Infinity, audioRef.current.currentTime + (event.seekOffset || 10)); });
    } catch { /* Unsupported Media Session actions are optional; in-page controls remain available. */ }
    return () => {
      for (const action of ["play", "pause", "previoustrack", "nexttrack", "seekto", "seekbackward", "seekforward"] as const) {
        try { session.setActionHandler(action, null); } catch { /* Some browsers expose only a subset of actions. */ }
      }
    };
  }, [selectedTrack, visualProfile?.coverDataUrl, duration, togglePlayback, stepTrack]);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    if (duration > 0 && Number.isFinite(currentTime)) {
      try { navigator.mediaSession.setPositionState({ duration, playbackRate: audioRef.current?.playbackRate || 1, position: Math.min(currentTime, duration) }); } catch { /* Position reporting is not supported in every browser. */ }
    }
  }, [playing, duration, currentTime]);

  const importFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []); event.target.value = ""; if (!files.length) return;
    setBusy(true); setMessage(""); setActiveView("library"); let accountImported = 0;
    try {
      const results = await importMusicBatch(files, async (file, index) => {
        if (!isSupportedMusicFile(file)) throw new Error("Formato não reconhecido como áudio ou arquivo vazio.");
        setMessage(`Importando ${index + 1} de ${files.length}: ${file.name}`);
        const metadata = await readMusicMetadata(file);
        const track = createMusicTrack(file, 0, crypto.randomUUID(), metadata);
        const probeUrl = URL.createObjectURL(file); const audio = new Audio(); audio.preload = "metadata";
        try {
          await new Promise<void>((resolve) => {
            let finished = false;
            const finish = () => { if (finished) return; finished = true; window.clearTimeout(timeout); resolve(); };
            const timeout = window.setTimeout(finish, 8000);
            audio.onloadedmetadata = () => { track.durationMs = Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0; finish(); };
            audio.onerror = finish;
            audio.src = probeUrl;
          });
          const storage = await musicLibrary.add(track);
          if (storage === "account") accountImported++;
          athenaEventBus.emit("MUSIC_IMPORTED", { trackId: track.id, title: track.name, sizeBytes: track.sizeBytes });
        } finally { audio.removeAttribute("src"); URL.revokeObjectURL(probeUrl); }
      }, (completed, total) => setMessage(`Importação em andamento · ${completed}/${total} arquivos processados…`));
      const imported = results.filter((result) => result.status === "imported").length;
      const failed = results.filter((result) => result.status === "failed");
      await reloadLibrary();
      const failureDetails = failed.slice(0, 3).map(({ item, error }) => `${item.name}: ${error}`).join(" · ");
      setMessage(`${imported} de ${files.length} faixa(s) importada(s)${accountImported ? ` e sincronizada(s) na conta` : " neste dispositivo"}${failed.length ? `. ${failed.length} falhou/falharam: ${failureDetails}${failed.length > 3 ? " · …" : ""}` : "."}`);
    } catch (error) {
      setMessage(error instanceof Error ? `Não foi possível concluir a importação: ${error.message}` : "Não foi possível concluir a importação.");
    } finally { await reloadLibrary(); setBusy(false); }
  };

  const editTrackMetadata = async (track: MusicTrack) => {
    const name = window.prompt("Título da faixa", track.name);
    if (name === null) return;
    const artist = window.prompt("Artista", track.artist);
    if (artist === null) return;
    try { await musicLibrary.updateMetadata(track.id, name, artist); await reloadLibrary(); setMessage("Metadados atualizados na biblioteca."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar os metadados."); }
  };

  const saveDNA = async (status: "PARTIAL" | "COMPLETE" = "PARTIAL") => {
    if (!selectedTrack || !dnaAccumRef.current.count) { setMessage("Reproduza alguns segundos da faixa para calcular o Music DNA."); return; }
    const a = dnaAccumRef.current; const n = a.count;
    const result: MusicDNA = makeMusicDNA(selectedTrack.id, duration, [{ loudness: a.loudness / n, centroid: a.centroid / n, bass: a.bass / n, mids: a.mids / n, treble: a.treble / n }], new Date().toISOString(), status, analyzeSections(sectionSamplesRef.current, duration))!;
    await musicStudio.saveDNA(result); setDna(result); setSections(result.sections); setMessage(`Music DNA ${status === "COMPLETE" ? "concluído" : "parcial"} salvo localmente; baseado nos trechos reproduzidos.`);
  };
  const createPlaylist = async () => {
    const name = playlistName.trim(); if (!name) return;
    const list: MusicPlaylist = { id: crypto.randomUUID(), name, color: colors[playlists.length % colors.length], trackIds: selectedId ? [selectedId] : [], updatedAt: new Date().toISOString() };
    await musicStudio.savePlaylist(list); setPlaylists(await musicStudio.listPlaylists()); setPlaylistName(""); setActivePlaylist(list.id); setMessage("Playlist local criada. Use “Adicionar” para incluir a faixa selecionada.");
  };
  const addToPlaylist = async (list: MusicPlaylist) => { if (!selectedId) return; const updated = { ...list, trackIds: Array.from(new Set([...list.trackIds, selectedId])), updatedAt: new Date().toISOString() }; await musicStudio.savePlaylist(updated); setPlaylists(await musicStudio.listPlaylists()); };
  const removeFromPlaylist = async (list: MusicPlaylist) => { if (!selectedId) return; await musicStudio.savePlaylist({ ...list, trackIds: list.trackIds.filter((id) => id !== selectedId), updatedAt: new Date().toISOString() }); setPlaylists(await musicStudio.listPlaylists()); };
  const renamePlaylist = async (list: MusicPlaylist) => { const name = window.prompt("Novo nome da playlist", list.name)?.trim(); if (!name) return; await musicStudio.savePlaylist({ ...list, name, updatedAt: new Date().toISOString() }); setPlaylists(await musicStudio.listPlaylists()); };
  const recordMusicExperience = async (input: Parameters<typeof musicLearningAdapter.record>[0]) => {
    try { await musicLearningAdapter.record(input); return true; }
    catch { return false; }
  };
  const recordFeedback = async () => {
    if (!selectedId) return;
    const item: MusicFeedback = { id: crypto.randomUUID(), trackId: selectedId, rating: feedbackRating, tags: [], note: feedbackNote.trim(), createdAt: new Date().toISOString() };
    await musicStudio.saveFeedback(item);
    const experienceRecorded = await recordMusicExperience({ action: "TRACK_RATED", trackId: selectedId, before: null, after: feedbackRating, userInitiated: true });
    const rows = await musicStudio.listFeedback();
    setFeedbackRows(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setFeedbackCount(rows.length);
    setFeedbackNote("");
    setMessage(experienceRecorded
      ? "Avaliação guardada localmente e registrada como evidência explícita; não altera automaticamente perfis nem recomendações."
      : "Avaliação guardada localmente, mas não foi possível registrá-la na Experience Layer.");
  };
  const exportFeedback = async () => { const rows = await musicStudio.listFeedback(); const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), feedback: rows }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "varynth-music-feedback.json"; link.click(); URL.revokeObjectURL(url); };
  const generateVisualPrompt = async () => {
    if (visualBusy) return;
    if (!selectedTrack) { const status = "Escolha uma faixa antes de criar o visual."; setVisualActionStatus(status); setMessage(status); return; }
    if (!visualProfileReady) { const status = "Carregando o perfil visual desta faixa. Tente novamente em instantes."; setVisualActionStatus(status); setMessage(status); return; }
    const reduceMotionForArtwork = reducedMotion || reducedMotionSetting || (visualProfile?.reducedMotion ?? false);
    const visualPrompt = prompt.trim() || selectedTrack.name; setVisualBusy(true); setVisualConcept(reduceMotionForArtwork ? "Euterpe está criando uma composição estática para movimento reduzido…" : "Euterpe está compondo uma animação visual local…"); setMessage(reduceMotionForArtwork ? "Criando capa e fundo sem animação…" : "Criando capa animada e fundo em movimento…");
    try {
      const result = await visualProvider.generate({ prompt: visualPrompt, title: selectedTrack.name, artist: selectedTrack.artist, style: "abstrato responsivo à música", createdAt: new Date().toISOString(), reducedMotion: reduceMotionForArtwork });
      if (!result.coverDataUrl || !result.backgroundDataUrl) throw new Error("O provider visual não entregou capa e fundo válidos.");
      const stamp = new Date().toISOString(); const targetIds = resolveVisualAssetTargetIds(visualAssetScope, selectedTrack.id, visualTargetIds, tracks.map((track) => track.id)); const targets = tracks.filter((track) => targetIds.includes(track.id));
      let cover = result.coverDataUrl; let background = result.backgroundDataUrl;
      if (musicLibrary.isAccountStorageAvailable()) {
        const asFile = async (dataUrl: string, name: string) => { const blob = await fetch(dataUrl).then((response) => response.blob()); const extension = blob.type === "image/svg+xml" ? "svg" : "png"; return new File([blob], `${name}.${extension}`, { type: blob.type || "image/svg+xml" }); };
        await musicLibrary.uploadArtwork(await asFile(cover, "euterpe-cover"), "cover", targets.map((track) => track.id));
        await musicLibrary.uploadArtwork(await asFile(background, "euterpe-background"), "background", targets.map((track) => track.id));
        const urls = await musicLibrary.getArtworkUrls(selectedTrack.id); cover = urls.coverUrl || cover; background = urls.backgroundUrl || background;
      }
      await Promise.all(targets.map(async (track) => { const stored = await musicStudio.getVisualProfile(track.id) as VisualProfile | undefined; const base = stored?.schemaVersion === 1 ? stored : createVisualProfile(track.id, track.id === selectedTrack.id ? dna : undefined); let profile = { ...base, coverDataUrl: cover, backgroundDataUrl: background, coverCleared: false, backgroundCleared: false, palette: result.palette, accentColor: result.palette[0] ?? base.accentColor, updatedAt: stamp }; if (musicLibrary.isAccountStorageAvailable()) { const urls = await musicLibrary.getArtworkUrls(track.id); profile = { ...profile, coverDataUrl: urls.coverUrl || cover, backgroundDataUrl: urls.backgroundUrl || background }; } await musicStudio.saveVisualProfile(profile); }));
      const base = selectedVisualProfile ?? selectedVisualProfileRef ?? createVisualProfile(selectedTrack.id, dna); const next = { ...base, coverDataUrl: cover, backgroundDataUrl: background, coverCleared: false, backgroundCleared: false, palette: result.palette, accentColor: result.palette[0] ?? base.accentColor, updatedAt: stamp }; setVisualProfile(next); setVisualConcept(result.description);
      const destination = visualAssetScope === "LIBRARY" ? "à biblioteca inteira" : visualAssetScope === "SELECTED" ? `a ${targets.length} faixas selecionadas` : "à faixa"; const status = `${reduceMotionForArtwork ? "Capa e fundo estáticos" : "Capa e fundo animados"} criados localmente e aplicados ${destination}.`; setVisualActionStatus(status); setMessage(status);
    } catch (error) { const detail = error instanceof Error ? error.message : "Provider indisponível."; setVisualConcept(""); const status = `Erro ao criar visual: ${detail}`; setVisualActionStatus(status); setMessage(status); }
    finally { setVisualBusy(false); }
  };
  const generateImagesWithAthena = async () => {
    if (visualBusy) return;
    if (!selectedTrack) { setMessage("Escolha uma faixa antes de pedir imagens à Athena."); return; }
    if (!visualProfileReady) { const status = "Carregando o perfil visual desta faixa. Tente novamente em instantes."; setVisualActionStatus(status); setMessage(status); return; }
    const scenePrompt = prompt.trim() || `Uma arte original inspirada no clima de ${selectedTrack.name}`;
    setVisualBusy(true); setVisualConcept("Euterpe enviou seu pedido à Athena. As imagens estão sendo criadas…"); setMessage("Aguardando a capa e o fundo personalizados. Isso pode levar alguns instantes.");
    try {
      const result = await athenaVisualProvider.generate({ prompt: scenePrompt, title: selectedTrack.name, artist: selectedTrack.artist, style: "arte musical original", createdAt: new Date().toISOString() });
      if (!result.coverDataUrl || !result.backgroundDataUrl) throw new Error("Athena retornou imagens incompletas.");
      const targetIds = resolveVisualAssetTargetIds(visualAssetScope, selectedTrack.id, visualTargetIds, tracks.map((track) => track.id));
      const targets = tracks.filter((track) => targetIds.includes(track.id));
      const toFile = async (dataUrl: string, name: string) => {
        const blob = await fetch(dataUrl).then((response) => response.blob());
        if (!["image/webp", "image/png", "image/jpeg"].includes(blob.type) || blob.size > 20 * 1024 * 1024) throw new Error("A imagem retornada não é compatível com o armazenamento do Music.");
        const extension = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
        return new File([blob], `${name}.${extension}`, { type: blob.type });
      };
      let cover = result.coverDataUrl;
      let background = result.backgroundDataUrl;
      if (musicLibrary.isAccountStorageAvailable()) {
        await musicLibrary.uploadArtwork(await toFile(cover, "athena-cover"), "cover", targets.map((track) => track.id));
        await musicLibrary.uploadArtwork(await toFile(background, "athena-background"), "background", targets.map((track) => track.id));
        const saved = await musicLibrary.getArtworkUrls(selectedTrack.id);
        cover = saved.coverUrl || cover; background = saved.backgroundUrl || background;
      }
      const stamp = new Date().toISOString();
      await Promise.all(targets.map(async (track) => {
        const stored = await musicStudio.getVisualProfile(track.id) as VisualProfile | undefined;
        const base = stored?.schemaVersion === 1 ? stored : createVisualProfile(track.id, track.id === selectedTrack.id ? dna : undefined);
        let profile: VisualProfile = { ...base, coverDataUrl: cover, backgroundDataUrl: background, coverCleared: false, backgroundCleared: false, updatedAt: stamp };
        if (musicLibrary.isAccountStorageAvailable()) {
          const saved = await musicLibrary.getArtworkUrls(track.id);
          profile = { ...profile, coverDataUrl: saved.coverUrl || cover, backgroundDataUrl: saved.backgroundUrl || background, ...(saved.visualSettings ?? {}) };
        }
        await musicStudio.saveVisualProfile({ ...profile });
      }));
      const base = selectedVisualProfile ?? selectedVisualProfileRef ?? createVisualProfile(selectedTrack.id, dna);
      const next = { ...base, coverDataUrl: cover, backgroundDataUrl: background, coverCleared: false, backgroundCleared: false, updatedAt: stamp };
      setVisualProfile(next); setVisualConcept(result.description);
      const destination = visualAssetScope === "LIBRARY" ? "à biblioteca inteira" : visualAssetScope === "SELECTED" ? `a ${targets.length} faixas selecionadas` : "à faixa";
      const status = `A Athena criou capa e fundo próprios e os salvou ${destination}. O movimento usa o efeito visual escolhido no Music.`; setVisualActionStatus(status); setMessage(status);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "O serviço de imagens está indisponível.";
      setVisualConcept(""); const status = `Não foi possível concluir as imagens: ${detail}`; setVisualActionStatus(status); setMessage(status);
    } finally { setVisualBusy(false); }
  };
  const uploadVisualAsset = async (event: ChangeEvent<HTMLInputElement>, kind: "cover" | "background") => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !selectedTrack || !file.type.startsWith("image/")) { if (file) { const status = "Escolha uma imagem animada ou estática válida."; setVisualActionStatus(status); setMessage(status); } return; }
    if (!visualProfileReady) { const status = "Carregando o perfil visual desta faixa. Tente novamente em instantes."; setVisualActionStatus(status); setMessage(status); return; }
    if (file.size > 20 * 1024 * 1024) { const status = "A imagem pode ter no máximo 20 MB."; setVisualActionStatus(status); setMessage(status); return; }
    const targetIds = resolveVisualAssetTargetIds(visualAssetScope, selectedTrack.id, visualTargetIds, tracks.map((track) => track.id));
    const targets = tracks.filter((track) => targetIds.includes(track.id));
    if (!targets.length) { const status = "Escolha ao menos uma faixa para aplicar a imagem."; setVisualActionStatus(status); setMessage(status); return; }
    try {
      setMessage("Salvando imagem privada da sua conta…");
      let dataUrl: string;
      if (musicLibrary.isAccountStorageAvailable()) {
        await musicLibrary.uploadArtwork(file, kind, targets.map((track) => track.id));
        const urls = await musicLibrary.getArtworkUrls(selectedTrack.id);
        dataUrl = (kind === "cover" ? urls.coverUrl : urls.backgroundUrl) || "";
        if (!dataUrl) throw new Error("A imagem foi enviada, mas não foi possível confirmar a associação à faixa.");
      } else {
        dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada.")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
      }
      const stamp = new Date().toISOString();
      await Promise.all(targets.map(async (track) => { const stored = await musicStudio.getVisualProfile(track.id) as VisualProfile | undefined; const base = stored?.schemaVersion === 1 ? stored : createVisualProfile(track.id, track.id === selectedTrack.id ? dna : undefined); await musicStudio.saveVisualProfile({ ...base, ...(kind === "cover" ? { coverDataUrl: dataUrl, coverCleared: false } : { backgroundDataUrl: dataUrl, backgroundCleared: false }), updatedAt: stamp }); }));
      const current = { ...(selectedVisualProfile ?? selectedVisualProfileRef ?? createVisualProfile(selectedTrack.id, dna)), ...(kind === "cover" ? { coverDataUrl: dataUrl, coverCleared: false } : { backgroundDataUrl: dataUrl, backgroundCleared: false }), updatedAt: stamp };
      setVisualProfile(current);
      const label = kind === "cover" ? "Capa" : "Fundo"; const animation = file.type === "image/gif" || file.type === "image/webp" ? " animado" : "";
      const destination = visualAssetScope === "LIBRARY" ? "em toda a biblioteca" : visualAssetScope === "SELECTED" ? `em ${targets.length} faixas selecionadas` : "nesta faixa";
      const status = `${label}${animation} salvo de forma permanente ${destination}.`; setVisualActionStatus(status); setMessage(status);
    } catch (error) { const status = error instanceof Error ? error.message : "Não foi possível salvar a imagem."; setVisualActionStatus(status); setMessage(status); }
  };
  const clearVisualAsset = async (kind: "cover" | "background") => { if (!selectedTrack) return; if (!visualProfileReady) { const status = "Carregando o perfil visual desta faixa. Tente novamente em instantes."; setVisualActionStatus(status); setMessage(status); return; } const targetIds = resolveVisualAssetTargetIds(visualAssetScope, selectedTrack.id, visualTargetIds, tracks.map((track) => track.id)); const targets = tracks.filter((track) => targetIds.includes(track.id)); const stamp = new Date().toISOString(); try { await musicLibrary.clearArtwork(kind, targets.map((track) => track.id)); await Promise.all(targets.map(async (track) => { const stored = await musicStudio.getVisualProfile(track.id) as VisualProfile | undefined; const base = stored?.schemaVersion === 1 ? stored : createVisualProfile(track.id, track.id === selectedTrack.id ? dna : undefined); const next = { ...base, updatedAt: stamp }; if (kind === "cover") { delete next.coverDataUrl; next.coverCleared = true; } else { delete next.backgroundDataUrl; next.backgroundCleared = true; } await musicStudio.saveVisualProfile(next); })); const current = { ...(selectedVisualProfile ?? selectedVisualProfileRef ?? createVisualProfile(selectedTrack.id, dna)), updatedAt: stamp }; if (kind === "cover") { delete current.coverDataUrl; current.coverCleared = true; } else { delete current.backgroundDataUrl; current.backgroundCleared = true; } setVisualProfile(current); const status = `${kind === "cover" ? "Capa" : "Fundo"} removido ${visualAssetScope === "LIBRARY" ? "da biblioteca" : visualAssetScope === "SELECTED" ? "das faixas selecionadas" : "desta faixa"}.`; setVisualActionStatus(status); setMessage(status); } catch (error) { const status = error instanceof Error ? error.message : "Não foi possível remover a imagem."; setVisualActionStatus(status); setMessage(status); } };
  const setVisualMotion = async (mode: VisualMotionMode) => {
    if (!selectedTrack) { const status = "Escolha uma faixa antes de ajustar o movimento."; setVisualActionStatus(status); setMessage(status); return; }
    if (!visualProfileReady) { const status = "Carregando o perfil visual desta faixa. Tente novamente em instantes."; setVisualActionStatus(status); setMessage(status); return; }
    const modeLabel = mode === "STATIC" ? "estático" : mode === "SMOOTH" ? "suave" : "animado";
    setVisualActionStatus(`Aplicando movimento ${modeLabel} à faixa…`);
    const base = selectedVisualProfile ?? selectedVisualProfileRef ?? createVisualProfile(selectedTrack.id, dna);
    const next = applyVisualMotionPreset(base, mode);
    visualProfileRef.current = next;
    setVisualProfile(next);
    try {
      await musicStudio.saveVisualProfile({ ...next });
      if (musicLibrary.isAccountStorageAvailable()) await musicLibrary.saveVisualSettings(selectedTrack.id, { particleType: next.particleType, particleDensity: next.particleDensity, motionSpeed: next.motionSpeed, reducedMotion: next.reducedMotion });
      const status = `Movimento ${modeLabel} aplicado e salvo para esta faixa.`; setVisualActionStatus(status); setMessage(status);
      void recordMusicExperience({ action: "VISUAL_MOTION_CHANGED", trackId: selectedTrack.id, before: base.motionSpeed, after: next.motionSpeed, userInitiated: true }).catch(() => undefined);
    } catch (error) {
      const status = error instanceof Error ? error.message : "Não foi possível salvar o movimento visual."; setVisualActionStatus(status); setMessage(status);
    }
  };
  const setVisualEffect = async (effect: ParticleType) => {
    if (!selectedTrack) { const status = "Escolha uma faixa antes de mudar o efeito."; setVisualActionStatus(status); setMessage(status); return; }
    if (!visualProfileReady) { const status = "Carregando o perfil visual desta faixa. Tente novamente em instantes."; setVisualActionStatus(status); setMessage(status); return; }
    const labels: Record<ParticleType, string> = { none: "sem partículas", dust: "poeira luminosa", rain: "chuva", stars: "estrelas", wave: "ondas de luz" };
    setVisualActionStatus(`Aplicando efeito ${labels[effect]} à faixa…`);
    const base = selectedVisualProfile ?? selectedVisualProfileRef ?? createVisualProfile(selectedTrack.id, dna);
    const next = { ...base, particleType: effect, updatedAt: new Date().toISOString() };
    visualProfileRef.current = next;
    setVisualProfile(next);
    try {
      await musicStudio.saveVisualProfile(next);
      if (musicLibrary.isAccountStorageAvailable()) await musicLibrary.saveVisualSettings(selectedTrack.id, { particleType: next.particleType, particleDensity: next.particleDensity, motionSpeed: next.motionSpeed, reducedMotion: next.reducedMotion });
      const status = `Efeito ${labels[effect]} salvo para esta faixa.`; setVisualActionStatus(status); setMessage(status);
      void recordMusicExperience({ action: "VISUAL_EFFECT_CHANGED", trackId: selectedTrack.id, before: base.particleType, after: next.particleType, userInitiated: true }).catch(() => undefined);
    } catch (error) {
      const status = error instanceof Error ? error.message : "Não foi possível salvar o efeito visual."; setVisualActionStatus(status); setMessage(status);
    }
  };
  const sendToCurator = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const messageText = chatInput.trim(); if (!messageText || chatBusy || !chatReady) return;
    const userMessage: CuratorMessage = { id: crypto.randomUUID(), sender: "user", text: messageText, createdAt: new Date().toISOString() };
    setChatMessages((current) => [...current, userMessage]); setChatInput(""); setChatBusy(true);
    const recentConversation: EuterpeConversationTurn[] = [...chatMessages, userMessage].slice(-12).map((turn) => ({ sender: turn.sender, text: turn.text, consultedAthena: turn.sender === "curator" && turn.consultedAthena === true }));
    const feedbackResolution = resolveEuterpeCorrectionRequest(messageText, athenaConversationFeedback.latest(athenaSessionIdRef.current || "music-curator-session", "euterpe"));
    if (feedbackResolution.kind === "clarify") {
      setChatMessages((current) => [...current, { id: crypto.randomUUID(), sender: "curator", text: feedbackResolution.response, createdAt: new Date().toISOString() }]);
      setChatBusy(false);
      return;
    }
    const effectiveMessage = feedbackResolution.prompt;
    let resultOutcome: "response" | "proposal" | "error" = "response";
    const delegatesToAthena = musicAgentShouldConsultAthena(effectiveMessage, recentConversation);
    setChatStatus(delegatesToAthena ? "Euterpe está consultando Athena…" : "Euterpe está pensando…");
    varynthEventBus.emit("AGENT.THINKING", { agentId: "euterpe", delegatedTo: delegatesToAthena ? "athena" : undefined });
    try {
      const scopeId = musicLibrary.getIdentityNamespace();
      const [preferences, memories] = await Promise.all([musicStudio.listPreferences(scopeId), musicStudio.listAgentMemory(scopeId)]);
      const turn = await runMusicAgentTurn({
        message: effectiveMessage,
        track: selectedTrack,
        dna,
        preferences,
        memories,
        conversation: recentConversation,
        consultAthena: async (userRequest, conversationContext) => {
          varynthEventBus.emit("ATHENA.ENTERED_CONTEXT", { sessionId: athenaSessionIdRef.current });
          varynthEventBus.emit("ATHENA.REQUEST", { sessionId: athenaSessionIdRef.current });
          athenaEventBus.emit("MUSIC_AGENT_ATHENA_DELEGATED", { agentId: "euterpe", sessionId: athenaSessionIdRef.current });
          const answer = await processAthenaQueryAsync(userRequest, "geral", store, undefined, athenaSessionIdRef.current || "music-curator-session", conversationContext?.map((turn) => ({ role: turn.sender === "user" ? "user" as const : "athena" as const, text: turn.text })));
          varynthEventBus.emit("ATHENA.RESPONSE", { sessionId: athenaSessionIdRef.current });
          return { text: answer.text, metadata: answer.metadata };
        },
      });
      resultOutcome = turn.proposal ? "proposal" : "response";
      setEuterpeExpression(turn.proposal ? "CURIOUS" : "SPEAKING");
      if (!turn.proposal) window.setTimeout(() => setEuterpeExpression("HAPPY"), 800);
      const planId = turn.athenaMetadata?.capabilityPlanId;
      const curatorMessage: CuratorMessage = { id: crypto.randomUUID(), sender: "curator", text: turn.text, createdAt: new Date().toISOString(), consultedAthena: turn.consultedAthena, athenaPlanId: typeof planId === "string" ? planId : undefined, proposal: turn.proposal };
      setChatMessages((current) => [...current, curatorMessage]);
      athenaEventBus.emit("MUSIC_AGENT_REPLIED", { agentId: turn.agent, delegated: turn.consultedAthena });
    } catch (error) {
      resultOutcome = "error";
      setEuterpeExpression("ALERT");
      setChatMessages((current) => [...current, { id: crypto.randomUUID(), sender: "curator", text: `Não consegui concluir este turno${error instanceof Error ? `: ${error.message}` : ". Vou continuar disponível para tentar novamente."}`, createdAt: new Date().toISOString() }]);
    } finally { varynthEventBus.emit("AGENT.RESULT", { agentId: "euterpe", outcome: resultOutcome }); setChatBusy(false); setChatStatus(""); }
  };
  const applyProposal = async (proposal: EuterpeProposal) => {
    const decision = authorizeEuterpeProposal(permissionEngine, proposal);
    if (!decision.allowed && decision.policy !== "CONFIRM") { setMessage(decision.reason); return; }
    try {
      if (proposal.kind === "visual-profile") {
        if (!selectedTrack || selectedTrack.id !== proposal.trackId) throw new Error("Selecione novamente a faixa da proposta.");
        const base = selectedVisualProfile ?? selectedVisualProfileRef ?? createVisualProfile(selectedTrack.id, dna);
        const directed = applyVisualDirective(base, proposal.instruction);
        const art = await visualProvider.generate({ prompt: proposal.instruction, title: selectedTrack.name, artist: selectedTrack.artist, style: directed.mood, palette: directed.palette, createdAt: new Date().toISOString() });
        const updated = { ...directed, coverDataUrl: art.coverDataUrl, backgroundDataUrl: art.backgroundDataUrl };
        await musicStudio.saveVisualProfile(updated); setVisualProfile(updated); setMessage("Perfil visual aplicado após sua confirmação.");
      } else if (proposal.kind === "playlist") {
        const playlist = { id: crypto.randomUUID(), name: proposal.name, color: colors[playlists.length % colors.length], trackIds: proposal.trackIds, updatedAt: new Date().toISOString() };
        await musicStudio.savePlaylist(playlist); setPlaylists(await musicStudio.listPlaylists()); setMessage("Playlist criada após sua confirmação.");
      } else {
        const scopeId = musicLibrary.getIdentityNamespace();
        const item = { id: `${scopeId}:${proposal.key}`, scopeId, key: proposal.key, value: proposal.value, confidence: 1, source: "explicit" as const, updatedAt: new Date().toISOString() };
        await musicStudio.savePreference(item); await musicStudio.saveAgentMemory({ id: crypto.randomUUID(), scopeId, kind: "favorite", value: proposal.value, createdAt: new Date().toISOString() }); setMessage("Preferência salva na memória musical deste dispositivo e isolada para a conta ativa.");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível aplicar a proposta."); }
  };
  const recentTracks = [...tracks].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 6);
  return <PageLayout title="Music" subtitle="Player, biblioteca e visualização musical" className={activeView === "now-playing" ? "!overflow-hidden !p-0" : undefined}>
    <div className={activeView === "now-playing" ? "relative h-full min-h-0" : "mx-auto max-w-7xl space-y-5 p-4 sm:p-6"}>
      <nav aria-label="Navegação Music" className={`flex flex-wrap items-center gap-2 ${activeView === "now-playing" ? "absolute left-3 right-3 top-3 z-30 border border-white/10 bg-[#101018]/35 p-2 backdrop-blur-lg sm:left-6 sm:right-6 sm:top-5" : "rounded-xl border border-white/[0.07] bg-[#101018] p-2"}`}>{([ ["home", "Início"], ["library", "Biblioteca"], ["playlists", "Playlists"], ["now-playing", "Tocando agora"] ] as const).map(([view, label]) => <button key={view} onClick={() => setActiveView(view)} aria-current={activeView === view ? "page" : undefined} className={`rounded-lg px-3 py-2 text-xs sm:px-4 sm:text-sm ${activeView === view ? "bg-violet-500/20 text-violet-100" : "text-slate-300 hover:bg-white/[0.08]"}`}>{label}</button>)}<label className={`ml-auto inline-flex cursor-pointer items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-medium text-white sm:px-4 sm:text-sm ${busy ? "pointer-events-none opacity-60" : ""}`}>{busy ? "Importando…" : "Importar músicas"}<input className="sr-only" type="file" accept="audio/*,.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac,.opus,.webm" multiple onChange={importFiles} disabled={busy} /></label></nav>
      <section hidden={activeView !== "home"} className="relative overflow-hidden rounded-3xl border border-violet-400/15 bg-gradient-to-br from-[#171329] via-[#10111d] to-[#0c1118] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_340px] lg:items-center">
          <div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300"><Music2 size={15} /> Music · versão 1.3</div><h2 className="text-3xl font-semibold text-white">{selectedTrack?.name ?? "Sua música começa aqui."}</h2><p className="mt-2 text-sm text-slate-400">{accountStorage ? "Seus áudios ficam privados na sua conta e disponíveis em outros dispositivos." : "Esta biblioteca está neste dispositivo; entre na sua conta para sincronizar as faixas."}</p>
            <p className="mt-5 text-sm text-slate-300">{tracks.length} faixa(s) na sua biblioteca · importe uma ou várias de uma vez pelo botão acima.</p>
            {message && <p role="status" className="mt-3 text-xs text-slate-300">{message}</p>}
          </div>
          <div className="relative flex aspect-[1.45] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/15 via-slate-900 to-cyan-500/10 bg-cover bg-center p-4" style={{ backgroundImage: selectedVisualProfile?.backgroundDataUrl ? `linear-gradient(#08081199,#08081199),url("${selectedVisualProfile.backgroundDataUrl}")` : undefined, ...visualFrameStyle({ ...(selectedVisualProfile ?? createVisualProfile(selectedId ?? "empty", dna)), reducedMotion: reducedMotion || (selectedVisualProfile?.reducedMotion ?? false) }, { ...audioFrame, playing }) } as CSSProperties} aria-label={`Visualização musical, qualidade ${quality}`}>
            <div className="flex h-full w-full items-end justify-center gap-[3px]" aria-hidden="true">{spectrum.map((value, i) => <span key={i} className="min-h-1 flex-1 rounded-t-full bg-gradient-to-t from-violet-500 to-cyan-300 transition-[height] duration-75" style={{ height: `${Math.max(3, value * 100)}%`, opacity: playing ? 0.35 + value * 0.65 : 0.25 }} />)}</div>
            <svg aria-hidden="true" className="pointer-events-none absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={waveform.map((sample, i) => `${(i / Math.max(1, waveform.length - 1)) * 100},${50 - sample * 45}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" /></svg>
            <Disc3 size={45} className={`absolute text-white/60 ${playing ? "animate-spin [animation-duration:8s]" : ""}`} strokeWidth={0.8} />
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">Qualidade da visualização:{(["low", "balanced", "high"] as VisualQuality[]).map((q) => <button key={q} onClick={() => setQuality(q)} aria-pressed={quality === q} className={`rounded-full border px-3 py-1 ${quality === q ? "border-violet-400 bg-violet-500/20 text-violet-100" : "border-white/10"}`}>{q === "low" ? "Econômica" : q === "high" ? "Alta" : "Equilibrada"}</button>)}<span className="ml-auto">FFT local · sem upload de áudio</span></div>
      </section>

      <section hidden={activeView !== "now-playing"} className="absolute inset-0 isolate overflow-hidden bg-[#080811]" aria-label="Cena Tocando agora">
        <VisualScene sceneId={selectedTrack?.id ?? "empty-scene"} background={selectedVisualProfile?.backgroundDataUrl} coverArtwork={selectedVisualProfile?.coverDataUrl} previousBackground={previousSceneBackground} accent={selectedVisualProfile?.accentColor} energy={reactiveMotion ? audioFrame : { bass: 0, mids: 0, treble: 0, loudness: 0 }} reducedMotion={reducedMotion || reducedMotionSetting || (selectedVisualProfile?.reducedMotion ?? false)} motionSpeed={selectedVisualProfile?.motionSpeed ?? 0.2} particleType={selectedVisualProfile?.particleType ?? "stars"} particleDensity={selectedVisualProfile?.particleDensity ?? 0.3} />
        {!selectedTrack ? <div className="relative z-10 grid h-full place-items-center px-6 text-center"><div><Music2 className="mx-auto mb-4 text-slate-300/70" size={42} /><h2 className="text-2xl text-white">A música ainda não chegou</h2><p className="mt-2 text-sm text-white/60">Escolha uma faixa para abrir seu ambiente sonoro.</p><button onClick={() => setActiveView("library")} className="mt-5 rounded-lg bg-violet-500 px-4 py-2 text-sm text-white">Abrir biblioteca</button></div></div>
          : <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute left-[7%] top-[25%] max-w-[44%] text-left sm:top-[30%]"><p className="text-[10px] uppercase tracking-[0.38em] text-violet-100/75">VARYNTH · MUSIC · NOW PLAYING</p><p className="mt-5 text-xs uppercase tracking-[0.24em] text-violet-100">{playing ? "Em reprodução" : "Em pausa"}</p><h2 className="mt-3 break-words text-3xl font-semibold text-white drop-shadow-lg sm:text-5xl lg:text-6xl">{selectedTrack.name}</h2><p className="mt-2 text-sm text-white/75 sm:text-lg">{selectedTrack.artist}{selectedTrack.album ? ` · ${selectedTrack.album}` : ""}</p></div>
            <div className="pointer-events-auto absolute right-[7%] top-[16%] w-[min(43vw,520px)] sm:top-[15%]"><CoverPresentation src={selectedVisualProfile?.coverDataUrl} title={selectedTrack.name} accent={selectedVisualProfile?.accentColor ?? "#b997f4"} bass={reactiveMotion ? audioFrame.bass : 0} mids={reactiveMotion ? audioFrame.mids : 0} playing={playing} reducedMotion={reducedMotion || reducedMotionSetting || (selectedVisualProfile?.reducedMotion ?? false)} motionSpeed={selectedVisualProfile?.motionSpeed ?? 0.2} /></div>
            <div className="pointer-events-auto absolute bottom-5 left-[6%] right-[6%] sm:bottom-7 sm:left-[8%] sm:right-[8%]">
              <div role="slider" aria-label={waveform.length ? "Waveform da faixa. Toque ou arraste para buscar" : "Posição na faixa. Toque ou arraste para buscar; waveform indisponível"} aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={Math.min(currentTime, duration || 0)} tabIndex={audioUrl && duration > 0 ? 0 : -1} onKeyDown={(event) => { if (!audioRef.current || !duration) return; const next = Math.max(0, Math.min(duration, currentTime + (event.key === "ArrowLeft" ? -5 : event.key === "ArrowRight" ? 5 : 0))); audioRef.current.currentTime = next; setCurrentTime(next); }} onPointerDown={(event) => { if (!audioRef.current || !duration) return; event.currentTarget.setPointerCapture(event.pointerId); const bounds = event.currentTarget.getBoundingClientRect(); const next = musicSeekTimeAtPointer(event.clientX, bounds.left, bounds.width, duration); audioRef.current.currentTime = next; setCurrentTime(next); }} onPointerMove={(event) => { if (event.buttons === 1 && audioRef.current && duration) { const bounds = event.currentTarget.getBoundingClientRect(); const next = musicSeekTimeAtPointer(event.clientX, bounds.left, bounds.width, duration); audioRef.current.currentTime = next; setCurrentTime(next); } }} className="flex h-10 cursor-pointer items-center gap-[2px] touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
                {waveform.length ? waveform.map((peak, i) => { const progress = (i + .5) / waveform.length <= (duration ? currentTime / duration : 0); return <span key={i} className={`flex-1 rounded-full transition-colors duration-150 ${progress ? "bg-cyan-100 shadow-[0_0_9px_rgba(165,243,252,.55)]" : "bg-white/40"}`} style={{ height: `${Math.max(3, peak * 100)}%`, transform: `scaleY(${1 + audioFrame.bass * .08})` }} />; }) : <span className="h-px w-full bg-white/35"><span className="block h-px bg-cyan-100" style={{ width: `${duration ? currentTime/duration*100 : 0}%` }} /></span>}
              </div><div className="mt-1 flex justify-between text-xs text-white/60"><span>{formatMusicTime(currentTime * 1000)}</span><span>{formatMusicTime(duration * 1000)}</span></div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-5"><button aria-label="Faixa anterior" onClick={() => stepTrack(-1)}><SkipBack size={19} /></button><button aria-label={playing ? "Pausar" : "Reproduzir"} onClick={() => void togglePlayback()} disabled={!audioUrl} className="grid h-12 w-12 place-items-center rounded-full bg-white text-black disabled:opacity-40">{playing ? <Pause size={20} /> : <Play size={20} />}</button><button aria-label="Próxima faixa" onClick={() => stepTrack(1)}><SkipForward size={19} /></button><span className="ml-2 hidden text-[11px] text-white/55 sm:inline">Graves {Math.round(audioFrame.bass*100)} · médios {Math.round(audioFrame.mids*100)} · agudos {Math.round(audioFrame.treble*100)}</span></div><div className="flex items-center gap-2"><Volume2 size={16} className="text-white/65"/><input aria-label="Volume" className="w-16 accent-violet-300 sm:w-28" type="range" min={0} max={1} step={0.01} value={volume} onChange={(e)=>setVolume(Number(e.target.value))}/><button onClick={()=>setReactiveMotion((v)=>!v)} className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-white/70">{reactiveMotion?"Desativar reação":"Ativar reação"}</button><button onClick={()=>setReducedMotionSetting((v)=>!v)} className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-white/70">{reducedMotion||reducedMotionSetting?"Movimento reduzido":"Reduzir movimento"}</button><button onClick={()=>setFocusMode((v)=>!v)} aria-pressed={focusMode} className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-white/70">{focusMode?"Sair do foco":"Foco"}</button><button onClick={()=>setEuterpeHidden((v)=>{if(v)setFocusMode(false);return !v;})} className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-white/70">{euterpeHidden?"Mostrar Euterpe":"Ocultar Euterpe"}</button></div></div>
            </div>
          </div>}
      </section>

      <section hidden={activeView !== "home"} className="rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-white">Continue ouvindo</h2><p className="mt-1 text-xs text-slate-500">Adicionadas recentemente</p></div><button onClick={() => setActiveView("library")} className="text-xs text-violet-300">Abrir biblioteca</button></div>{recentTracks.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{recentTracks.map((track) => <button key={track.id} onClick={() => { selectTrack(track); setActiveView("library"); }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left hover:bg-white/[0.07]"><span className="block truncate text-sm text-slate-100">{track.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{track.artist}</span></button>)}</div> : <p className="text-sm text-slate-500">Importe músicas para começar sua biblioteca.</p>}</section>

      {selectedTrack && activeView !== "now-playing" && <button onClick={() => setActiveView("now-playing")} className="fixed bottom-5 left-4 z-30 flex max-w-[calc(100vw-7rem)] items-center gap-3 rounded-full border border-white/10 bg-[#11111beb] px-3 py-2 text-left shadow-xl backdrop-blur-xl sm:bottom-7 sm:left-7"><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-violet-500/20">{visualProfile?.coverDataUrl ? <img src={visualProfile.coverDataUrl} alt="" className="h-full w-full object-cover" /> : playing ? "♫" : <Disc3 size={20} />}</span><span className="min-w-0"><span className="block truncate text-xs font-medium text-white">{selectedTrack.name}</span><span className="block text-[10px] text-white/50">{playing ? "Em reprodução" : "Abrir Now Playing"}</span></span><span className="px-2 text-white">{playing ? <Pause size={15} /> : <Play size={15} />}</span></button>}
      {chatOpen && <>
        <button aria-label="Fechar conversa com Euterpe" onClick={() => setChatOpen(false)} className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none" />
        <section role="dialog" aria-modal="true" aria-label="Conversa com Euterpe" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88svh] flex-col overflow-hidden rounded-t-3xl border border-violet-300/20 bg-[#0c0c15]/95 shadow-[0_-25px_100px_rgba(0,0,0,.65)] backdrop-blur-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[430px] lg:max-h-none lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l">
        <div className="flex min-h-[92px] items-center justify-between border-b border-white/[0.07] px-5 py-2"><div className="flex min-w-0 items-center gap-3"><EuterpeCharacterArtwork variant="chibi" state={euterpeState} width={48} label="Euterpe" /><div className="min-w-0"><h3 className="font-semibold text-white">Euterpe</h3><p className="mt-1 text-xs text-slate-400">Uma presença musical própria · ligada à Athena</p></div></div><div className="flex items-center gap-2"><button type="button" disabled={!euterpeVoiceProvider.available} title={euterpeVoiceProvider.available ? "Iniciar conversa por voz" : "STT/TTS ainda não configurados"} aria-label={euterpeVoiceProvider.available ? "Iniciar conversa por voz" : "Conversa por voz indisponível"} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-500 disabled:cursor-not-allowed"><Mic2 size={16} /></button><button type="button" onClick={() => setChatOpen(false)} aria-label="Fechar conversa" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-300"><X size={17} /></button></div></div>
        <div className="max-h-[32rem] space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">{!chatReady && <p className="text-xs text-slate-400" role="status">Preparando uma conversa privada…</p>}{chatMessages.map((chat, index) => <div key={chat.id}><div className={`flex ${chat.sender === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 ${chat.sender === "user" ? "bg-violet-500/20 text-violet-50" : "border border-white/[0.07] bg-white/[0.03] text-slate-200"}`}><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{chat.sender === "user" ? "Você" : `Euterpe${chat.consultedAthena ? " · consultou Athena" : ""}`}</p><p className="whitespace-pre-wrap text-sm leading-6">{chat.text}</p>{chat.sender === "curator" && chat.id !== WELCOME.id && <AthenaFeedbackControls messageId={chat.id} response={chat.text} sessionId={athenaSessionIdRef.current || "music-curator-session"} prompt={chatMessages[index - 1]?.sender === "user" ? chatMessages[index - 1].text : undefined} agentId="euterpe" moduleId="music" agentName="Euterpe" />}{chat.proposal && <button onClick={() => void applyProposal(chat.proposal!)} className="mt-3 rounded-lg border border-violet-300/30 bg-violet-400/10 px-3 py-2 text-xs font-medium text-violet-100">Revisar e aplicar proposta</button>}</div></div>{chat.athenaPlanId && <div className="mt-3"><p className="mb-2 text-xs text-amber-200">Athena preparou um plano para revisão. Aprove, confirme ou execute pelos controles abaixo conforme as permissões.</p><AthenaCapabilityPlanPanel store={store} planId={chat.athenaPlanId} /></div>}</div>)}{chatBusy && <p className="text-xs text-violet-300" role="status">{chatStatus}</p>}{chatReady && chatStatus && !chatBusy && <p className="text-xs text-amber-200" role="status">{chatStatus}</p>}<div ref={chatEndRef} /></div>
        <form onSubmit={(event) => void sendToCurator(event)} className="flex gap-2 border-t border-white/[0.07] p-3"><input aria-label="Mensagem para Euterpe" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Converse com Euterpe…" disabled={chatBusy || !chatReady} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-600" /><button type="submit" aria-label="Enviar para Euterpe" disabled={chatBusy || !chatReady || !chatInput.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white disabled:opacity-40"><Send size={17} /></button></form>
        <p className="px-4 pb-3 text-[10px] text-slate-600">Você conversa com Euterpe; quando o pedido exige recursos gerais, ela consulta Athena e traz a resposta. Histórico e memória ficam neste navegador.</p>
        </section>
      </>}
      {!euterpeHidden && !focusMode && <EuterpePresence state={euterpeState} audio={{ bass: audioFrame.bass, mids: audioFrame.mids, treble: audioFrame.treble, energy: audioFrame.loudness, calmness: dna?.calmness ?? .5 }} quality={quality} reducedMotion={reducedMotion || reducedMotionSetting || (visualProfile?.reducedMotion ?? false)} reactiveMotion={reactiveMotion} onClick={() => { setChatOpen(true); varynthEventBus.emit("AGENT.LISTENING", { agentId: "euterpe" }); }} onHide={() => setEuterpeHidden(true)} onBackToMusic={() => setActiveView("now-playing")} onNativeOverlay={nativeOverlaySupported ? () => void toggleNativeOverlay() : undefined} nativeOverlayLabel={!nativeOverlayGranted ? "Ativar · requer permissão do Android" : nativeOverlayEnabled ? "Desativar personagem flutuante" : "Ativar personagem flutuante"} />}
      {(euterpeHidden || focusMode) && activeView !== "now-playing" && <button onClick={() => { setEuterpeHidden(false); setFocusMode(false); }} className="fixed bottom-4 right-4 z-30 rounded-full border border-white/15 bg-[#15131bf0] px-4 py-2 text-xs text-white shadow-xl">Mostrar Euterpe</button>}

      <div hidden={activeView !== "library"} className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#101018]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4"><div><h3 className="font-semibold text-slate-100">Biblioteca</h3><p className="mt-1 text-xs text-slate-500">{visibleTracks.length} faixas{activePlaylist ? ` · ${playlists.find((p) => p.id === activePlaylist)?.name}` : ""}</p></div><ListMusic size={19} className="text-slate-500" /></div>
          <div className="flex gap-2 overflow-x-auto px-4 pt-3"><button onClick={() => setActivePlaylist(null)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${!activePlaylist ? "bg-violet-500/20 text-violet-200" : "bg-white/5 text-slate-400"}`}>Todas</button>{playlists.map((p) => <button key={p.id} onClick={() => setActivePlaylist(p.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs ${activePlaylist === p.id ? "bg-violet-500/20 text-violet-200" : "bg-white/5 text-slate-400"}`}><span className={`h-2 w-2 rounded-full ${playlistDot[p.color] ?? playlistDot.violet}`} />{p.name} · {p.trackIds.length}</button>)}</div>
          {loading ? <p className="p-6 text-sm text-slate-500">Carregando biblioteca…</p> : !visibleTracks.length ? <p className="px-6 py-10 text-center text-sm text-slate-500">{tracks.length ? "Esta playlist ainda não tem faixas." : "Importe músicas para começar."}</p> : <div className="max-h-[350px] overflow-y-auto p-2">{visibleTracks.map((track, index) => <div key={track.id} className={`flex items-center gap-2 rounded-xl px-2 ${selectedId === track.id ? "bg-violet-500/10" : "hover:bg-white/[0.04]"}`}><button onClick={() => selectTrack(track)} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"><span className="w-8 text-center text-xs text-slate-500">{selectedId === track.id && playing ? "♫" : String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm text-slate-200">{track.name}</span><span className="block truncate text-xs text-slate-500">{track.artist}{track.metadataConfidence !== undefined && track.metadataConfidence < 0.7 ? " · revisar metadados" : ""}</span></span><span className="shrink-0 text-xs text-slate-500">{formatMusicTime(track.durationMs)}</span></button><button type="button" onClick={() => void editTrackMetadata(track)} aria-label={`Editar metadados de ${track.name}`} className="rounded-lg px-2 py-1 text-xs text-violet-300 hover:bg-white/10">Editar</button></div>)}</div>}
        </section>
        <section className="rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tocando agora</p><div className="mt-4 min-h-[55px]">{selectedTrack ? <><h3 className="line-clamp-2 font-semibold text-white">{selectedTrack.name}</h3><p className="text-sm text-slate-400">{selectedTrack.artist}</p></> : <p className="text-sm text-slate-500">Escolha uma faixa.</p>}</div>
          <input aria-label="Posição da música" className="mt-4 w-full accent-violet-400" type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)); }} disabled={!audioUrl || duration <= 0} /><div className="flex justify-between text-[11px] text-slate-500"><span>{formatMusicTime(currentTime * 1000)}</span><span>{formatMusicTime(duration * 1000)}</span></div>
          <div className="mt-4 flex items-center justify-center gap-5"><button aria-label="Faixa anterior" onClick={() => stepTrack(-1)} disabled={!visibleTracks.length}><SkipBack size={20} /></button><button aria-label={playing ? "Pausar" : "Reproduzir"} onClick={() => void togglePlayback()} disabled={!audioUrl} className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 text-white disabled:opacity-40">{playing ? <Pause size={20} /> : <Play size={20} />}</button><button aria-label="Próxima faixa" onClick={() => stepTrack(1)} disabled={!visibleTracks.length}><SkipForward size={20} /></button></div><div className="mt-4 flex items-center gap-3"><Volume2 size={16} /><input aria-label="Volume" className="w-full accent-violet-400" type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></div>
          <audio ref={audioRef} src={audioUrl ?? undefined} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onPlay={() => { setPlaying(true); musicEngineRef.current?.confirmPlaying(); }} onPause={() => { setPlaying(false); musicEngineRef.current?.confirmPaused(); }} onEnded={() => { void saveDNA("COMPLETE"); stepTrack(1); }} onError={() => { if (audioUrl) setMessage("Não foi possível decodificar esta faixa neste navegador."); }} />
        </section>
      </div>

      <div hidden={activeView !== "library"} className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><div className="flex items-center justify-between"><h3 className="font-semibold text-white">Music DNA · v2</h3><button onClick={() => void saveDNA()} disabled={!selectedTrack} className="rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs text-violet-200 disabled:opacity-40">Atualizar análise</button></div><p className="text-xs text-slate-500">Amostras locais acumulam durante a reprodução e salvam gradualmente. {dna ? `Estado: ${dna.status.toLowerCase()}.` : "Estado: aguardando reprodução."}</p>{dna ? <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">{[["Energia", dna.meanLoudness], ["Graves", dna.bass], ["Médios", dna.mids], ["Agudos", dna.treble], ["Centro espectral", dna.spectralCentroid], ["Calma estimada", dna.calmness]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white/[0.04] p-2">{label}<strong className="mt-1 block">{Number(value).toFixed(2)}</strong></div>)}</div> : <p className="text-sm text-slate-500">{selectedTrack ? musicSpecialist.memory(selectedTrack) : "Selecione uma faixa."}</p>}{sections.length > 0 && <p className="text-xs text-slate-400">Seções estimadas (confiança baixa a moderada): {sections.map((s) => `${s.label} ${formatMusicTime(s.timeSeconds * 1000)} (${Math.round(s.confidence * 100)}%)`).join(" · ")}</p>}<p className="text-xs text-slate-500">{selectedTrack ? musicSpecialist.suggest(selectedTrack, dna) : "Euterpe responde dentro do Music e consulta Athena para capacidades gerais da plataforma."}</p></section>
        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><h3 className="font-semibold text-white">Playlists locais</h3><div className="flex gap-2"><input aria-label="Nome da playlist" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Nome da playlist" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /><button onClick={() => void createPlaylist()} className="rounded-lg bg-violet-500 px-3 text-sm text-white">Criar</button></div>{playlists.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-slate-300"><button onClick={() => setActivePlaylist(p.id)} className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${playlistDot[p.color] ?? playlistDot.violet}`} />{p.name} · {p.trackIds.length} faixas</button><span className="flex gap-3"><button onClick={() => void renamePlaylist(p)} className="text-xs text-slate-400">Renomear</button><button onClick={() => void addToPlaylist(p)} disabled={!selectedId || p.trackIds.includes(selectedId)} className="text-xs text-violet-300 disabled:text-slate-600">Adicionar</button><button onClick={() => void removeFromPlaylist(p)} disabled={!selectedId || !p.trackIds.includes(selectedId)} className="text-xs text-rose-300 disabled:text-slate-600">Remover faixa</button></span></div>)}</section>
        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5">
          <h3 className="font-semibold text-white">Personalizar visual da faixa</h3>
          <p className="text-xs text-slate-500">A identidade fica salva por faixa. Envie GIF ou WebP animado, crie uma composição local ou peça à Athena imagens originais para a capa e o fundo.</p>
          <label className="flex items-center gap-2 text-xs text-slate-400">Aplicar imagem em<select value={visualAssetScope} onChange={(event) => setVisualAssetScope(event.target.value as VisualAssetScope)} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-slate-200"><option value="TRACK">Somente esta faixa</option><option value="SELECTED">Faixas específicas</option><option value="LIBRARY">Todas as faixas da biblioteca</option></select></label>
          {visualAssetScope === "SELECTED" && <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-2 text-xs text-slate-300">{tracks.map((track) => <label key={track.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-white/5"><input type="checkbox" checked={track.id === selectedTrack?.id || visualTargetIds.includes(track.id)} disabled={track.id === selectedTrack?.id} onChange={() => setVisualTargetIds((ids) => ids.includes(track.id) ? ids.filter((id) => id !== track.id) : [...ids, track.id])} />{track.name}</label>)}</div>}
          <div className="flex flex-wrap gap-2">
            <label aria-disabled={!visualProfileReady || !selectedTrack} className={`rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 ${visualProfileReady && selectedTrack ? "cursor-pointer" : "cursor-wait opacity-50"}`}>Escolher capa ou GIF<input className="sr-only" type="file" accept="image/gif,image/webp,image/png,image/jpeg,image/avif" disabled={!visualProfileReady || !selectedTrack || visualBusy} onChange={(e) => void uploadVisualAsset(e, "cover")} /></label>
            <label aria-disabled={!visualProfileReady || !selectedTrack} className={`rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 ${visualProfileReady && selectedTrack ? "cursor-pointer" : "cursor-wait opacity-50"}`}>Escolher fundo ou GIF<input className="sr-only" type="file" accept="image/gif,image/webp,image/png,image/jpeg,image/avif" disabled={!visualProfileReady || !selectedTrack || visualBusy} onChange={(e) => void uploadVisualAsset(e, "background")} /></label>
            <button onClick={() => void generateVisualPrompt()} disabled={visualBusy || !selectedTrack || !visualProfileReady} className="rounded-lg border border-violet-300/20 px-3 py-2 text-xs text-violet-200 disabled:cursor-wait disabled:opacity-50">{visualBusy ? "Criando…" : "Criar visual local"}</button>
            <button type="button" data-testid="create-athena-music-artwork" onClick={() => void generateImagesWithAthena()} disabled={visualBusy || !selectedTrack || !visualProfileReady} className="rounded-lg bg-violet-500 px-3 py-2 text-xs text-white disabled:cursor-wait disabled:opacity-50">{visualBusy ? "Athena criando…" : "Criar capa e fundo com Athena"}</button>
            <button type="button" onClick={() => void clearVisualAsset("cover")} disabled={!selectedTrack || !visualProfileReady || visualBusy} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:cursor-wait disabled:opacity-50">Remover capa</button>
            <button type="button" onClick={() => void clearVisualAsset("background")} disabled={!selectedTrack || !visualProfileReady || visualBusy} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:cursor-wait disabled:opacity-50">Remover fundo</button>
          </div>
          <MusicVisualProviderSettings />
          <VisualEffectControls ready={visualProfileReady && Boolean(selectedTrack)} profile={selectedVisualProfile ?? createVisualProfile(selectedTrack?.id ?? "empty", dna)} onMotionChange={(mode) => void setVisualMotion(mode)} onEffectChange={(effect) => void setVisualEffect(effect)} />
          <div className="flex gap-2"><input aria-label="Prompt visual" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Intenção visual para Euterpe" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /><button onClick={() => void generateVisualPrompt()} disabled={visualBusy || !selectedTrack || !visualProfileReady} className="rounded-lg bg-violet-500 px-3 text-sm text-white disabled:opacity-50">{visualBusy ? "Criando…" : "Criar briefing"}</button></div>
          {(visualConcept || visualActionStatus || message) && <div aria-live="polite" className="space-y-1 text-sm text-slate-300">{visualConcept && <p role="status">{visualConcept}</p>}{visualActionStatus && <p role="status" data-testid="music-visual-status">{visualActionStatus}</p>}{message && message !== visualActionStatus && <p role="status">{message}</p>}</div>}
        </section>
        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><h3 className="font-semibold text-white">Feedback revisável · {feedbackCount}</h3><p className="text-xs text-slate-500">Dados locais, sem retreino ou ajuste automático.</p><div className="flex gap-3"><select aria-label="Nota da faixa" value={feedbackRating} onChange={(e) => setFeedbackRating(Number(e.target.value))} className="rounded-lg bg-slate-900 p-2 text-sm text-white">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select><input aria-label="Observação da avaliação" value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} placeholder="Observação opcional" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white" /></div><div className="flex gap-2"><button onClick={() => void recordFeedback()} disabled={!selectedTrack} className="rounded-lg bg-violet-500/20 px-3 py-2 text-xs text-violet-200">Registrar avaliação</button><button onClick={() => void exportFeedback()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Exportar JSON para revisão</button></div><div className="max-h-24 space-y-1 overflow-y-auto text-xs text-slate-500">{feedbackRows.slice(0, 6).map((row) => <p key={row.id}>{tracks.find((track) => track.id === row.trackId)?.name ?? row.trackId} · {row.rating}/5{row.note ? ` · ${row.note}` : ""}</p>)}</div></section>
      </div>
      <section hidden={activeView !== "playlists"} className="grid gap-5 lg:grid-cols-2"><div className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><h2 className="font-semibold text-white">Suas playlists</h2><div className="flex gap-2"><input aria-label="Nome da playlist" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Nome da playlist" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /><button onClick={() => void createPlaylist()} className="rounded-lg bg-violet-500 px-3 text-sm text-white">Criar</button></div>{playlists.length ? playlists.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-slate-300"><button onClick={() => { setActivePlaylist(p.id); setActiveView("library"); }} className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${playlistDot[p.color] ?? playlistDot.violet}`} />{p.name} · {p.trackIds.length} faixas</button><span className="flex gap-3"><button onClick={() => void renamePlaylist(p)} className="text-xs text-slate-400">Renomear</button><button onClick={() => void addToPlaylist(p)} disabled={!selectedId || p.trackIds.includes(selectedId)} className="text-xs text-violet-300 disabled:text-slate-600">Adicionar faixa atual</button><button onClick={() => void removeFromPlaylist(p)} disabled={!selectedId || !p.trackIds.includes(selectedId)} className="text-xs text-rose-300 disabled:text-slate-600">Remover faixa atual</button></span></div>) : <p className="text-sm text-slate-500">Crie uma playlist para organizar suas faixas.</p>}</div><section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><h2 className="font-semibold text-white">Feedback revisável · {feedbackCount}</h2><p className="text-xs text-slate-500">Dados locais, sem retreino ou ajuste automático.</p><div className="flex gap-3"><select aria-label="Nota da faixa" value={feedbackRating} onChange={(e) => setFeedbackRating(Number(e.target.value))} className="rounded-lg bg-slate-900 p-2 text-sm text-white">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select><input aria-label="Observação da avaliação" value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} placeholder="Observação opcional" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white" /></div><div className="flex gap-2"><button onClick={() => void recordFeedback()} disabled={!selectedTrack} className="rounded-lg bg-violet-500/20 px-3 py-2 text-xs text-violet-200">Registrar avaliação da faixa atual</button><button onClick={() => void exportFeedback()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Exportar JSON</button></div>{feedbackRows.slice(0, 6).map((row) => <p key={row.id} className="text-xs text-slate-500">{tracks.find((track) => track.id === row.trackId)?.name ?? row.trackId} · {row.rating}/5{row.note ? ` · ${row.note}` : ""}</p>)}</section></section>
      <p className="text-center text-[11px] text-slate-600">{accountStorage ? "Áudios em armazenamento privado por conta; ouvir e guardar faixas consome a franquia do serviço de armazenamento. Faixas antigas deste navegador precisam ser importadas novamente para sincronizar." : "Sem armazenamento de conta conectado, os áudios permanecem apenas neste navegador. Os arquivos só são enviados após entrar e importar uma faixa."} DNA e seções são estimativas dos trechos reproduzidos; preferências e memória do Euterpe ficam locais neste dispositivo.</p>
    </div>
  </PageLayout>;
}
