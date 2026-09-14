"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Disc3, ListMusic, Music2, Pause, Play, Send, SkipBack, SkipForward, Volume2, X, Mic2 } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { athenaEventBus } from "@/lib/athena/events/event-bus";
import { processAthenaQueryAsync } from "@/lib/athena/engine";
import { AthenaCapabilityPlanPanel } from "@/components/athena/AthenaCapabilityPlanPanel";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { adjacentTrackIndex, createMusicTrack, formatMusicTime, isSupportedMusicFile, musicLibrary } from "@/lib/music/music-library";
import { analyzeSections, LocalVisualGenerationProvider, makeMusicDNA, MUSIC_ANALYSIS_LIMITS, musicSpecialist, musicStudio, spectralFeatures, type MusicDNA, type MusicFeedback, type MusicPlaylist, type VisualQuality } from "@/lib/music/music-studio";
import { musicAgentShouldConsultAthena, runMusicAgentTurn } from "@/lib/music/music-agent-bridge";
import { readMusicMetadata } from "@/lib/music/music-metadata";
import { importMusicBatch } from "@/lib/music/music-import";
import { MusicTrack } from "@/lib/music/types";
import { applyVisualDirective, createVisualProfile, visualFrameStyle, type VisualProfile } from "@/lib/music/visual-profile";
import { authorizeEuterpeProposal, interpretEuterpeRequest, type EuterpeProposal } from "@/lib/music/euterpe";
import { PermissionPolicyEngine } from "@/lib/permissions/permission-policy";
import { EuterpePresence, type EuterpeState } from "@/components/music/EuterpePresence";
import { euterpeVoiceProvider } from "@/lib/music/euterpe-voice";
import { VisualScene } from "@/components/music/VisualScene";
import { musicSeekTimeAtPointer } from "@/lib/music/music-playback";

const visualProvider = new LocalVisualGenerationProvider();
const colors = ["violet", "cyan", "rose", "amber"];
const playlistDot: Record<string, string> = { violet: "bg-violet-400", cyan: "bg-cyan-400", rose: "bg-rose-400", amber: "bg-amber-400" };
const CHAT_STORAGE_KEY = "varynth_music_curator_chat_v1";
const ATHENA_SESSION_KEY = "varynth_music_curator_athena_session_v1";
type CuratorMessage = { id: string; sender: "user" | "curator"; text: string; createdAt: string; consultedAthena?: boolean; athenaPlanId?: string; proposal?: EuterpeProposal };
type MusicView = "home" | "library" | "playlists" | "now-playing";
const WELCOME: CuratorMessage = { id: "euterpe-welcome-v1", sender: "curator", text: "Oi! Eu sou Euterpe, sua sub-IA musical subordinada à Athena. Você conversa comigo aqui no Music. Quando o pedido precisar de capacidades gerais da plataforma, consulto Athena e retorno para esta conversa.", createdAt: "" };

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
  const [waveform, setWaveform] = useState<number[]>(Array(64).fill(128));
  const [dna, setDna] = useState<MusicDNA | undefined>();
  const [visualProfile, setVisualProfile] = useState<VisualProfile | undefined>();
  const [previousSceneBackground, setPreviousSceneBackground] = useState<string | undefined>();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [audioFrame, setAudioFrame] = useState({ bass: 0, mids: 0, treble: 0, loudness: 0 });
  const [sections, setSections] = useState<ReturnType<typeof analyzeSections>>([]);
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [visualConcept, setVisualConcept] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(4);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [feedbackRows, setFeedbackRows] = useState<MusicFeedback[]>([]);
  const [activeView, setActiveView] = useState<MusicView>("now-playing");
  const [chatMessages, setChatMessages] = useState<CuratorMessage[]>([WELCOME]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatStatus, setChatStatus] = useState("");
  const [chatReady, setChatReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [euterpeExpression, setEuterpeExpression] = useState<EuterpeState | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const previousSceneTimerRef = useRef<number | null>(null);
  const athenaSessionIdRef = useRef("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioCloseTimerRef = useRef<number | null>(null);
  const binsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const waveBinsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const dnaAccumRef = useRef({ count: 0, loudness: 0, centroid: 0, bass: 0, mids: 0, treble: 0 });
  const sectionSamplesRef = useRef<number[]>([]);
  const selectedTrack = useMemo(() => tracks.find((track) => track.id === selectedId) ?? null, [tracks, selectedId]);
  const visualProfileRef = useRef<VisualProfile | undefined>(undefined);
  useEffect(() => { visualProfileRef.current = visualProfile; }, [visualProfile]);
  const permissionEngine = useMemo(() => new PermissionPolicyEngine(), []);
  const visibleTracks = useMemo(() => { const p = playlists.find((item) => item.id === activePlaylist); return p ? tracks.filter((track) => p.trackIds.includes(track.id)) : tracks; }, [tracks, playlists, activePlaylist]);
  const euterpeState: EuterpeState = chatBusy ? "THINKING" : playing ? "MUSIC_REACTIVE" : euterpeExpression ?? (chatOpen ? "LISTENING" : tracks.length ? "IDLE" : "SLEEP");
  useEffect(() => {
    if (!euterpeExpression) return;
    const timer = window.setTimeout(() => setEuterpeExpression(null), 1100);
    return () => window.clearTimeout(timer);
  }, [euterpeExpression]);
  useEffect(() => () => { if (previousSceneTimerRef.current !== null) window.clearTimeout(previousSceneTimerRef.current); }, []);

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
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) { const saved: unknown = JSON.parse(raw); if (Array.isArray(saved) && saved.every((item) => item && (item.sender === "user" || item.sender === "curator") && typeof item.text === "string")) setChatMessages(saved); }
      let sessionId = localStorage.getItem(ATHENA_SESSION_KEY);
      if (!sessionId) { sessionId = `music-curator-${crypto.randomUUID()}`; localStorage.setItem(ATHENA_SESSION_KEY, sessionId); }
      athenaSessionIdRef.current = sessionId;
    } catch { /* The chat can still be used for this tab if local storage is blocked. */ }
    setChatReady(true);
  }, []);
  useEffect(() => { if (chatReady) { try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages)); } catch { /* Keep the current conversation in memory. */ } } }, [chatMessages, chatReady]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatBusy]);

  useEffect(() => {
    let cancelled = false; let nextUrl: string | null = null; let temporaryUrl = false;
    const previousBackground = visualProfileRef.current?.backgroundDataUrl;
    if (previousBackground) {
      setPreviousSceneBackground(previousBackground);
      if (previousSceneTimerRef.current !== null) window.clearTimeout(previousSceneTimerRef.current);
      previousSceneTimerRef.current = window.setTimeout(() => setPreviousSceneBackground(undefined), 1900);
    }
    setPlaying(false); setCurrentTime(0); setDuration((selectedTrack?.durationMs ?? 0) / 1000); setAudioUrl(null); setDna(undefined); setSections([]); setVisualProfile(undefined);
    dnaAccumRef.current = { count: 0, loudness: 0, centroid: 0, bass: 0, mids: 0, treble: 0 }; sectionSamplesRef.current = [];
    if (!selectedTrack) return;
    void Promise.all([musicStudio.getDNA(selectedTrack.id)]).then(async ([savedDNA]) => {
      const streamingUrl = musicLibrary.streamingUrl(selectedTrack);
      if (streamingUrl) nextUrl = streamingUrl;
      else {
        const blob = await musicLibrary.getAudio(selectedTrack.id, selectedTrack);
        if (!blob) throw new Error("O arquivo desta faixa não foi encontrado no armazenamento local.");
        nextUrl = URL.createObjectURL(blob); temporaryUrl = true;
      }
      if (cancelled) { if (temporaryUrl) URL.revokeObjectURL(nextUrl); } else {
        setAudioUrl(nextUrl); setDna(savedDNA);
        const stored = await musicStudio.getVisualProfile(selectedTrack.id) as VisualProfile | undefined;
        if (cancelled) return;
        if (stored?.schemaVersion === 1) {
          const art = await visualProvider.generate({ prompt: selectedTrack.name, title: selectedTrack.name, artist: selectedTrack.artist, style: stored.mood, palette: stored.palette, createdAt: new Date().toISOString() });
          const refreshed = { ...stored, coverDataUrl: art.coverDataUrl, backgroundDataUrl: art.backgroundDataUrl };
          await musicStudio.saveVisualProfile(refreshed); if (!cancelled) setVisualProfile(refreshed);
        }
        else {
          const generated = await visualProvider.generate({ prompt: selectedTrack.name, title: selectedTrack.name, artist: selectedTrack.artist, style: "capa abstrata responsiva", createdAt: new Date().toISOString() });
          const profile = { ...createVisualProfile(selectedTrack.id, savedDNA), coverDataUrl: generated.coverDataUrl, backgroundDataUrl: generated.backgroundDataUrl, palette: generated.palette, accentColor: generated.palette[0] };
          await musicStudio.saveVisualProfile(profile); if (!cancelled) setVisualProfile(profile);
        }
      }
    }).catch((error: unknown) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "Não foi possível abrir esta faixa."); });
    return () => { cancelled = true; if (temporaryUrl && nextUrl) URL.revokeObjectURL(nextUrl); };
  }, [selectedTrack]);

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
        waveBinsRef.current = new Uint8Array(analyser.fftSize);
      }
      const draw = () => {
        if (!alive) return;
        const bins = binsRef.current; const active = analyzerRef.current;
        if (bins && active && !audio.paused) {
          active.getByteFrequencyData(bins);
          const waveBins = waveBinsRef.current;
          if (waveBins) active.getByteTimeDomainData(waveBins);
          const step = Math.max(1, Math.floor(bins.length / 32));
          const now = performance.now();
          const f = spectralFeatures(bins);
          if (now - lastPaint >= MUSIC_ANALYSIS_LIMITS.visualUpdateIntervalMs) {
            setSpectrum(Array.from({ length: 32 }, (_, i) => bins[Math.min(bins.length - 1, i * step)] / 255));
            if (waveBins) { const waveStep = Math.max(1, Math.floor(waveBins.length / 64)); setWaveform(Array.from({ length: 64 }, (_, i) => waveBins[Math.min(waveBins.length - 1, i * waveStep)])); }
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
          void context.close(); audioContextRef.current = null; analyzerRef.current = null; binsRef.current = null; waveBinsRef.current = null;
        }
      }, 250);
    };
  }, []);
  useEffect(() => {
    const analyser = analyzerRef.current;
    if (analyser) { analyser.fftSize = MUSIC_ANALYSIS_LIMITS.fftSize[quality]; binsRef.current = new Uint8Array(analyser.frequencyBinCount); waveBinsRef.current = new Uint8Array(analyser.fftSize); }
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
  const togglePlayback = async () => {
    const audio = audioRef.current; if (!audio || !audioUrl) return;
    if (audio.paused) { try { await audioContextRef.current?.resume(); await audio.play(); setPlaying(true); athenaEventBus.emit("MUSIC_PLAY", { trackId: selectedId }); setMessage(""); } catch { setPlaying(false); setMessage("O navegador não conseguiu reproduzir este arquivo de áudio."); } }
    else { audio.pause(); setPlaying(false); athenaEventBus.emit("MUSIC_PAUSE", { trackId: selectedId }); }
  };
  const stepTrack = (direction: -1 | 1) => { const index = adjacentTrackIndex(visibleTracks.findIndex((track) => track.id === selectedId), visibleTracks.length, direction); if (index >= 0) selectTrack(visibleTracks[index]); };

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
  const recordFeedback = async () => { if (!selectedId) return; const item: MusicFeedback = { id: crypto.randomUUID(), trackId: selectedId, rating: feedbackRating, tags: [], note: feedbackNote.trim(), createdAt: new Date().toISOString() }; await musicStudio.saveFeedback(item); const rows = await musicStudio.listFeedback(); setFeedbackRows(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))); setFeedbackCount(rows.length); setFeedbackNote(""); setMessage("Avaliação guardada localmente; não altera automaticamente perfis nem recomendações."); };
  const exportFeedback = async () => { const rows = await musicStudio.listFeedback(); const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), feedback: rows }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "varynth-music-feedback.json"; link.click(); URL.revokeObjectURL(url); };
  const generateVisualPrompt = async () => { if (!prompt.trim()) return; try { const result = await visualProvider.generate({ prompt: prompt.trim(), style: "abstrato responsivo à música", createdAt: new Date().toISOString() }); setVisualConcept(result.description); } catch (error) { setMessage(error instanceof Error ? error.message : "Provider indisponível."); } };
  const sendToCurator = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const messageText = chatInput.trim(); if (!messageText || chatBusy) return;
    const userMessage: CuratorMessage = { id: crypto.randomUUID(), sender: "user", text: messageText, createdAt: new Date().toISOString() };
    setChatMessages((current) => [...current, userMessage]); setChatInput(""); setChatBusy(true);
    setChatStatus(musicAgentShouldConsultAthena(messageText) ? "Euterpe está consultando Athena…" : "Euterpe está pensando…");
    try {
      if (!musicAgentShouldConsultAthena(messageText)) {
        const scopeId = musicLibrary.getIdentityNamespace();
        const [preferences, memories] = await Promise.all([musicStudio.listPreferences(scopeId), musicStudio.listAgentMemory(scopeId)]);
        const result = interpretEuterpeRequest(messageText, { track: selectedTrack ?? undefined, dna, preferences, memories });
        setEuterpeExpression(result.proposal ? "CURIOUS" : "SPEAKING");
        if (!result.proposal) window.setTimeout(() => setEuterpeExpression("HAPPY"), 800);
        setChatMessages((current) => [...current, { id: crypto.randomUUID(), sender: "curator", text: result.response, createdAt: new Date().toISOString(), proposal: result.proposal }]);
        athenaEventBus.emit("MUSIC_AGENT_REPLIED", { agentId: "euterpe", delegated: false });
        return;
      }
      const turn = await runMusicAgentTurn({
        message: messageText,
        track: selectedTrack,
        dna,
        consultAthena: async (userRequest) => {
          athenaEventBus.emit("MUSIC_AGENT_ATHENA_DELEGATED", { agentId: "euterpe", sessionId: athenaSessionIdRef.current });
          const answer = await processAthenaQueryAsync(userRequest, "geral", store, undefined, athenaSessionIdRef.current || "music-curator-session");
          return { text: answer.text, metadata: answer.metadata };
        },
      });
      setEuterpeExpression("SPEAKING"); window.setTimeout(() => setEuterpeExpression("HAPPY"), 800);
      const planId = turn.athenaMetadata?.capabilityPlanId;
      const curatorMessage: CuratorMessage = { id: crypto.randomUUID(), sender: "curator", text: turn.text, createdAt: new Date().toISOString(), consultedAthena: turn.consultedAthena, athenaPlanId: typeof planId === "string" ? planId : undefined };
      setChatMessages((current) => [...current, curatorMessage]);
      athenaEventBus.emit("MUSIC_AGENT_REPLIED", { agentId: turn.agent, delegated: turn.consultedAthena });
    } catch (error) {
      setEuterpeExpression("ALERT");
      setChatMessages((current) => [...current, { id: crypto.randomUUID(), sender: "curator", text: `Não consegui concluir este turno${error instanceof Error ? `: ${error.message}` : ". Vou continuar disponível para tentar novamente."}`, createdAt: new Date().toISOString() }]);
    } finally { setChatBusy(false); setChatStatus(""); }
  };
  const applyProposal = async (proposal: EuterpeProposal) => {
    const decision = authorizeEuterpeProposal(permissionEngine, proposal);
    if (!decision.allowed && decision.policy !== "CONFIRM") { setMessage(decision.reason); return; }
    try {
      if (proposal.kind === "visual-profile") {
        if (!selectedTrack || selectedTrack.id !== proposal.trackId) throw new Error("Selecione novamente a faixa da proposta.");
        const base = visualProfile ?? createVisualProfile(selectedTrack.id, dna);
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
  return <PageLayout title="Music" subtitle="Player, biblioteca e visualização musical">
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <nav aria-label="Navegação Music" className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-[#101018] p-2">{([ ["home", "Início"], ["library", "Biblioteca"], ["playlists", "Playlists"], ["now-playing", "Tocando agora"] ] as const).map(([view, label]) => <button key={view} onClick={() => setActiveView(view)} aria-current={activeView === view ? "page" : undefined} className={`rounded-lg px-4 py-2 text-sm ${activeView === view ? "bg-violet-500/20 text-violet-100" : "text-slate-400 hover:bg-white/[0.05]"}`}>{label}</button>)}<label className={`ml-auto inline-flex cursor-pointer items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white ${busy ? "pointer-events-none opacity-60" : ""}`}>{busy ? "Importando…" : "Importar músicas"}<input className="sr-only" type="file" accept="audio/*,.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac,.opus,.webm" multiple onChange={importFiles} disabled={busy} /></label></nav>
      <section hidden={activeView !== "home"} className="relative overflow-hidden rounded-3xl border border-violet-400/15 bg-gradient-to-br from-[#171329] via-[#10111d] to-[#0c1118] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_340px] lg:items-center">
          <div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300"><Music2 size={15} /> Music · versão 1.3</div><h2 className="text-3xl font-semibold text-white">{selectedTrack?.name ?? "Sua música começa aqui."}</h2><p className="mt-2 text-sm text-slate-400">{accountStorage ? "Seus áudios ficam privados na sua conta e disponíveis em outros dispositivos." : "Esta biblioteca está neste dispositivo; entre na sua conta para sincronizar as faixas."}</p>
            <p className="mt-5 text-sm text-slate-300">{tracks.length} faixa(s) na sua biblioteca · importe uma ou várias de uma vez pelo botão acima.</p>
            {message && <p role="status" className="mt-3 text-xs text-slate-300">{message}</p>}
          </div>
          <div className="relative flex aspect-[1.45] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/15 via-slate-900 to-cyan-500/10 bg-cover bg-center p-4" style={{ backgroundImage: visualProfile?.backgroundDataUrl ? `linear-gradient(#08081199,#08081199),url("${visualProfile.backgroundDataUrl}")` : undefined, ...visualFrameStyle({ ...(visualProfile ?? createVisualProfile(selectedId ?? "empty", dna)), reducedMotion: reducedMotion || (visualProfile?.reducedMotion ?? false) }, { ...audioFrame, playing }) } as CSSProperties} aria-label={`Visualização musical, qualidade ${quality}`}>
            <div className="flex h-full w-full items-end justify-center gap-[3px]" aria-hidden="true">{spectrum.map((value, i) => <span key={i} className="min-h-1 flex-1 rounded-t-full bg-gradient-to-t from-violet-500 to-cyan-300 transition-[height] duration-75" style={{ height: `${Math.max(3, value * 100)}%`, opacity: playing ? 0.35 + value * 0.65 : 0.25 }} />)}</div>
            <svg aria-hidden="true" className="pointer-events-none absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={waveform.map((sample, i) => `${(i / (waveform.length - 1)) * 100},${50 - (sample - 128) * 0.35}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" /></svg>
            <Disc3 size={45} className={`absolute text-white/60 ${playing ? "animate-spin [animation-duration:8s]" : ""}`} strokeWidth={0.8} />
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">Qualidade da visualização:{(["low", "balanced", "high"] as VisualQuality[]).map((q) => <button key={q} onClick={() => setQuality(q)} aria-pressed={quality === q} className={`rounded-full border px-3 py-1 ${quality === q ? "border-violet-400 bg-violet-500/20 text-violet-100" : "border-white/10"}`}>{q === "low" ? "Econômica" : q === "high" ? "Alta" : "Equilibrada"}</button>)}<span className="ml-auto">FFT local · sem upload de áudio</span></div>
      </section>

      <section hidden={activeView !== "now-playing"} className="relative isolate -mx-4 min-h-[calc(100svh-7rem)] overflow-hidden bg-[#080811] sm:-mx-6" aria-label="Tocando agora">
        <VisualScene sceneId={selectedTrack?.id ?? "empty-scene"} background={visualProfile?.backgroundDataUrl} previousBackground={previousSceneBackground} accent={visualProfile?.accentColor} energy={audioFrame} reducedMotion={reducedMotion || (visualProfile?.reducedMotion ?? false)} />
        {!selectedTrack ? <div className="grid min-h-[60vh] place-items-center text-center"><div><Music2 className="mx-auto mb-4 text-slate-500" size={40} /><h2 className="text-xl text-white">Sua biblioteca está pronta</h2><p className="mt-2 text-sm text-slate-400">Escolha uma faixa para abrir o player.</p><button onClick={() => setActiveView("library")} className="mt-5 rounded-lg bg-violet-500 px-4 py-2 text-sm text-white">Abrir biblioteca</button></div></div>
          : <div className="relative mx-auto flex min-h-[calc(100svh-7rem)] max-w-[1500px] flex-col items-center justify-center px-5 py-10 text-center sm:px-12">
            <p className="mb-5 text-[10px] uppercase tracking-[0.38em] text-violet-200/80">VARYNTH · MUSIC · NOW PLAYING</p>
            <div className="group relative mb-8 w-[min(64vw,390px)] sm:w-[min(36vw,460px)]" style={{ transform: `perspective(900px) rotateY(${(audioFrame.mids - .5) * 5}deg) rotateX(${(audioFrame.bass - .5) * -4}deg) translateY(${playing && !reducedMotion ? Math.sin(currentTime * .55) * 7 : 0}px)` }}>
              <div className="absolute -inset-12 rounded-[35%] opacity-50 blur-3xl transition duration-500" style={{ background: visualProfile?.accentColor ?? "#8b5cf6", opacity: .12 + audioFrame.bass * .28 }} />
              {visualProfile?.coverDataUrl ? <img src={visualProfile.coverDataUrl} alt={`Capa visual de ${selectedTrack.name}`} className="relative aspect-square w-full rounded-[2rem] object-cover shadow-[0_35px_120px_rgba(0,0,0,.6)] ring-1 ring-white/20 transition duration-500 group-hover:scale-[1.015]" style={{ boxShadow: `0 35px 120px rgba(0,0,0,.6), 0 0 ${10 + audioFrame.bass * 34}px ${visualProfile.accentColor ?? "#a78bfa"}66` }} /> : <div className="relative grid aspect-square w-full place-items-center rounded-[2rem] bg-white/5 shadow-2xl"><Disc3 size={120} className={playing && !reducedMotion ? "animate-spin [animation-duration:12s]" : ""} /></div>}
            </div>
            <div className="w-full max-w-3xl"><p className="text-xs uppercase tracking-[0.24em] text-violet-200">{playing ? "Em reprodução" : "Pausado"}</p><h2 className="mt-3 break-words text-3xl font-semibold text-white drop-shadow-lg sm:text-5xl">{selectedTrack.name}</h2><p className="mt-2 text-base text-slate-200/85 sm:text-lg">{selectedTrack.artist}{selectedTrack.album ? ` · ${selectedTrack.album}` : ""}</p>
              <div className="mx-auto mt-9 max-w-2xl">
                <div role="slider" aria-label="Forma de onda. Toque ou arraste para mudar a posição" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={Math.min(currentTime, duration || 0)} tabIndex={audioUrl && duration > 0 ? 0 : -1} onKeyDown={(event) => { if (!audioRef.current || !duration) return; const next = Math.max(0, Math.min(duration, currentTime + (event.key === "ArrowLeft" ? -5 : event.key === "ArrowRight" ? 5 : 0))); audioRef.current.currentTime = next; setCurrentTime(next); }} onPointerDown={(event) => { if (!audioRef.current || !duration) return; event.currentTarget.setPointerCapture(event.pointerId); const bounds = event.currentTarget.getBoundingClientRect(); const next = musicSeekTimeAtPointer(event.clientX, bounds.left, bounds.width, duration); audioRef.current.currentTime = next; setCurrentTime(next); }} onPointerMove={(event) => { if (event.buttons === 1 && audioRef.current && duration) { const bounds = event.currentTarget.getBoundingClientRect(); const next = musicSeekTimeAtPointer(event.clientX, bounds.left, bounds.width, duration); audioRef.current.currentTime = next; setCurrentTime(next); } }} className="flex h-14 cursor-pointer items-center gap-[3px] touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300" style={{ opacity: audioUrl ? 1 : .4 }}>
                  {waveform.map((sample, i) => { const amplitude = Math.max(.08, Math.abs(sample - 128) / 128); const progress = i / waveform.length <= (duration ? currentTime / duration : 0); return <span key={i} className={`flex-1 rounded-full transition-colors duration-150 ${progress ? "bg-cyan-100 shadow-[0_0_10px_rgba(165,243,252,.65)]" : "bg-white/35"}`} style={{ height: `${12 + amplitude * 78}%`, transform: `scaleY(${1 + audioFrame.bass * .12})` }} />; })}
                </div><div className="mt-1 flex justify-between text-xs text-white/60"><span>{formatMusicTime(currentTime * 1000)}</span><span>{formatMusicTime(duration * 1000)}</span></div></div>
              <div className="mt-6 flex items-center justify-center gap-7"><button aria-label="Faixa anterior" onClick={() => stepTrack(-1)}><SkipBack /></button><button aria-label={playing ? "Pausar" : "Reproduzir"} onClick={() => void togglePlayback()} disabled={!audioUrl} className="grid h-16 w-16 place-items-center rounded-full bg-white text-black disabled:opacity-40">{playing ? <Pause /> : <Play />}</button><button aria-label="Próxima faixa" onClick={() => stepTrack(1)}><SkipForward /></button></div>
              <div className="mt-6 flex items-center gap-3"><Volume2 size={18} /><input aria-label="Volume" className="w-full accent-violet-400" type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/55"><span>Graves {Math.round(audioFrame.bass * 100)} · Médios {Math.round(audioFrame.mids * 100)} · Agudos {Math.round(audioFrame.treble * 100)}</span><span className="mx-2 h-3 border-l border-white/20" />{(["low", "balanced", "high"] as VisualQuality[]).map((q) => <button key={q} aria-pressed={quality === q} onClick={() => setQuality(q)} className={`rounded-full border px-3 py-1 ${quality === q ? "border-violet-300/60 text-violet-100" : "border-white/10"}`}>{q === "low" ? "Econômica" : q === "high" ? "Alta" : "Equilibrada"}</button>)}<button onClick={() => { if (visualProfile) { const updated = { ...visualProfile, reducedMotion: !visualProfile.reducedMotion, motionSpeed: visualProfile.reducedMotion ? 0.2 : 0 }; setVisualProfile(updated); void musicStudio.saveVisualProfile(updated); } }} className="rounded-full border border-white/10 px-3 py-1">{visualProfile?.reducedMotion || reducedMotion ? "Movimento reduzido" : "Reduzir movimento"}</button></div>
            </div></div>}
      </section>

      <section hidden={activeView !== "home"} className="rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-white">Continue ouvindo</h2><p className="mt-1 text-xs text-slate-500">Adicionadas recentemente</p></div><button onClick={() => setActiveView("library")} className="text-xs text-violet-300">Abrir biblioteca</button></div>{recentTracks.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{recentTracks.map((track) => <button key={track.id} onClick={() => { selectTrack(track); setActiveView("library"); }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left hover:bg-white/[0.07]"><span className="block truncate text-sm text-slate-100">{track.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{track.artist}</span></button>)}</div> : <p className="text-sm text-slate-500">Importe músicas para começar sua biblioteca.</p>}</section>

      {selectedTrack && activeView !== "now-playing" && <button onClick={() => setActiveView("now-playing")} className="fixed bottom-5 left-4 z-30 flex max-w-[calc(100vw-7rem)] items-center gap-3 rounded-full border border-white/10 bg-[#11111beb] px-3 py-2 text-left shadow-xl backdrop-blur-xl sm:bottom-7 sm:left-7"><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-violet-500/20">{visualProfile?.coverDataUrl ? <img src={visualProfile.coverDataUrl} alt="" className="h-full w-full object-cover" /> : playing ? "♫" : <Disc3 size={20} />}</span><span className="min-w-0"><span className="block truncate text-xs font-medium text-white">{selectedTrack.name}</span><span className="block text-[10px] text-white/50">{playing ? "Em reprodução" : "Abrir Now Playing"}</span></span><span className="px-2 text-white">{playing ? <Pause size={15} /> : <Play size={15} />}</span></button>}
      {chatOpen && <>
        <button aria-label="Fechar conversa com Euterpe" onClick={() => setChatOpen(false)} className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none" />
        <section role="dialog" aria-modal="true" aria-label="Conversa com Euterpe" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88svh] flex-col overflow-hidden rounded-t-3xl border border-violet-300/20 bg-[#0c0c15]/95 shadow-[0_-25px_100px_rgba(0,0,0,.65)] backdrop-blur-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[430px] lg:max-h-none lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4"><div><h3 className="font-semibold text-white">Euterpe</h3><p className="mt-1 text-xs text-slate-400">Sua presença musical · em diálogo com Athena</p></div><div className="flex items-center gap-2"><button type="button" disabled={!euterpeVoiceProvider.available} title={euterpeVoiceProvider.available ? "Iniciar conversa por voz" : "Provider de voz ainda não configurado"} aria-label="Conversa por voz indisponível" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-500 disabled:cursor-not-allowed"><Mic2 size={16} /></button><button type="button" onClick={() => setChatOpen(false)} aria-label="Fechar conversa" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-300"><X size={17} /></button></div></div>
        <div className="max-h-[32rem] space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">{chatMessages.map((chat) => <div key={chat.id}><div className={`flex ${chat.sender === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 ${chat.sender === "user" ? "bg-violet-500/20 text-violet-50" : "border border-white/[0.07] bg-white/[0.03] text-slate-200"}`}><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{chat.sender === "user" ? "Você" : `Euterpe${chat.consultedAthena ? " · consultou Athena" : ""}`}</p><p className="whitespace-pre-wrap text-sm leading-6">{chat.text}</p>{chat.proposal && <button onClick={() => void applyProposal(chat.proposal!)} className="mt-3 rounded-lg border border-violet-300/30 bg-violet-400/10 px-3 py-2 text-xs font-medium text-violet-100">Revisar e aplicar proposta</button>}</div></div>{chat.athenaPlanId && <div className="mt-3"><p className="mb-2 text-xs text-amber-200">Athena preparou um plano para revisão. Aprove, confirme ou execute pelos controles abaixo conforme as permissões.</p><AthenaCapabilityPlanPanel store={store} planId={chat.athenaPlanId} /></div>}</div>)}{chatBusy && <p className="text-xs text-violet-300" role="status">{chatStatus}</p>}<div ref={chatEndRef} /></div>
        <form onSubmit={(event) => void sendToCurator(event)} className="flex gap-2 border-t border-white/[0.07] p-3"><input aria-label="Mensagem para Euterpe" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Converse com Euterpe…" disabled={chatBusy} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-600" /><button type="submit" aria-label="Enviar para Euterpe" disabled={chatBusy || !chatInput.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white disabled:opacity-40"><Send size={17} /></button></form>
        <p className="px-4 pb-3 text-[10px] text-slate-600">Você conversa com Euterpe; quando o pedido exige recursos gerais, ela consulta Athena e traz a resposta. Histórico e memória ficam neste navegador.</p>
        </section>
      </>}
      <EuterpePresence state={euterpeState} energy={audioFrame.loudness} onClick={() => setChatOpen((open) => !open)} />

      <div hidden={activeView !== "library"} className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#101018]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4"><div><h3 className="font-semibold text-slate-100">Biblioteca</h3><p className="mt-1 text-xs text-slate-500">{visibleTracks.length} faixas{activePlaylist ? ` · ${playlists.find((p) => p.id === activePlaylist)?.name}` : ""}</p></div><ListMusic size={19} className="text-slate-500" /></div>
          <div className="flex gap-2 overflow-x-auto px-4 pt-3"><button onClick={() => setActivePlaylist(null)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${!activePlaylist ? "bg-violet-500/20 text-violet-200" : "bg-white/5 text-slate-400"}`}>Todas</button>{playlists.map((p) => <button key={p.id} onClick={() => setActivePlaylist(p.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs ${activePlaylist === p.id ? "bg-violet-500/20 text-violet-200" : "bg-white/5 text-slate-400"}`}><span className={`h-2 w-2 rounded-full ${playlistDot[p.color] ?? playlistDot.violet}`} />{p.name} · {p.trackIds.length}</button>)}</div>
          {loading ? <p className="p-6 text-sm text-slate-500">Carregando biblioteca…</p> : !visibleTracks.length ? <p className="px-6 py-10 text-center text-sm text-slate-500">{tracks.length ? "Esta playlist ainda não tem faixas." : "Importe músicas para começar."}</p> : <div className="max-h-[350px] overflow-y-auto p-2">{visibleTracks.map((track, index) => <div key={track.id} className={`flex items-center gap-2 rounded-xl px-2 ${selectedId === track.id ? "bg-violet-500/10" : "hover:bg-white/[0.04]"}`}><button onClick={() => selectTrack(track)} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"><span className="w-8 text-center text-xs text-slate-500">{selectedId === track.id && playing ? "♫" : String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm text-slate-200">{track.name}</span><span className="block truncate text-xs text-slate-500">{track.artist}{track.metadataConfidence !== undefined && track.metadataConfidence < 0.7 ? " · revisar metadados" : ""}</span></span><span className="shrink-0 text-xs text-slate-500">{formatMusicTime(track.durationMs)}</span></button><button type="button" onClick={() => void editTrackMetadata(track)} aria-label={`Editar metadados de ${track.name}`} className="rounded-lg px-2 py-1 text-xs text-violet-300 hover:bg-white/10">Editar</button></div>)}</div>}
        </section>
        <section className="rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tocando agora</p><div className="mt-4 min-h-[55px]">{selectedTrack ? <><h3 className="line-clamp-2 font-semibold text-white">{selectedTrack.name}</h3><p className="text-sm text-slate-400">{selectedTrack.artist}</p></> : <p className="text-sm text-slate-500">Escolha uma faixa.</p>}</div>
          <input aria-label="Posição da música" className="mt-4 w-full accent-violet-400" type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)); }} disabled={!audioUrl || duration <= 0} /><div className="flex justify-between text-[11px] text-slate-500"><span>{formatMusicTime(currentTime * 1000)}</span><span>{formatMusicTime(duration * 1000)}</span></div>
          <div className="mt-4 flex items-center justify-center gap-5"><button aria-label="Faixa anterior" onClick={() => stepTrack(-1)} disabled={!visibleTracks.length}><SkipBack size={20} /></button><button aria-label={playing ? "Pausar" : "Reproduzir"} onClick={() => void togglePlayback()} disabled={!audioUrl} className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 text-white disabled:opacity-40">{playing ? <Pause size={20} /> : <Play size={20} />}</button><button aria-label="Próxima faixa" onClick={() => stepTrack(1)} disabled={!visibleTracks.length}><SkipForward size={20} /></button></div><div className="mt-4 flex items-center gap-3"><Volume2 size={16} /><input aria-label="Volume" className="w-full accent-violet-400" type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></div>
          <audio ref={audioRef} src={audioUrl ?? undefined} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { void saveDNA("COMPLETE"); stepTrack(1); }} onError={() => { if (audioUrl) setMessage("Não foi possível decodificar esta faixa neste navegador."); }} />
        </section>
      </div>

      <div hidden={activeView !== "library"} className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><div className="flex items-center justify-between"><h3 className="font-semibold text-white">Music DNA · v2</h3><button onClick={() => void saveDNA()} disabled={!selectedTrack} className="rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs text-violet-200 disabled:opacity-40">Atualizar análise</button></div><p className="text-xs text-slate-500">Amostras locais acumulam durante a reprodução e salvam gradualmente. {dna ? `Estado: ${dna.status.toLowerCase()}.` : "Estado: aguardando reprodução."}</p>{dna ? <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">{[["Energia", dna.meanLoudness], ["Graves", dna.bass], ["Médios", dna.mids], ["Agudos", dna.treble], ["Centro espectral", dna.spectralCentroid], ["Calma estimada", dna.calmness]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white/[0.04] p-2">{label}<strong className="mt-1 block">{Number(value).toFixed(2)}</strong></div>)}</div> : <p className="text-sm text-slate-500">{selectedTrack ? musicSpecialist.memory(selectedTrack) : "Selecione uma faixa."}</p>}{sections.length > 0 && <p className="text-xs text-slate-400">Seções estimadas (confiança baixa a moderada): {sections.map((s) => `${s.label} ${formatMusicTime(s.timeSeconds * 1000)} (${Math.round(s.confidence * 100)}%)`).join(" · ")}</p>}<p className="text-xs text-slate-500">{selectedTrack ? musicSpecialist.suggest(selectedTrack, dna) : "Euterpe responde dentro do Music e consulta Athena para capacidades gerais da plataforma."}</p></section>
        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><h3 className="font-semibold text-white">Playlists locais</h3><div className="flex gap-2"><input aria-label="Nome da playlist" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Nome da playlist" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /><button onClick={() => void createPlaylist()} className="rounded-lg bg-violet-500 px-3 text-sm text-white">Criar</button></div>{playlists.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-slate-300"><button onClick={() => setActivePlaylist(p.id)} className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${playlistDot[p.color] ?? playlistDot.violet}`} />{p.name} · {p.trackIds.length} faixas</button><span className="flex gap-3"><button onClick={() => void renamePlaylist(p)} className="text-xs text-slate-400">Renomear</button><button onClick={() => void addToPlaylist(p)} disabled={!selectedId || p.trackIds.includes(selectedId)} className="text-xs text-violet-300 disabled:text-slate-600">Adicionar</button><button onClick={() => void removeFromPlaylist(p)} disabled={!selectedId || !p.trackIds.includes(selectedId)} className="text-xs text-rose-300 disabled:text-slate-600">Remover faixa</button></span></div>)}</section>
        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><h3 className="font-semibold text-white">Conceito visual</h3><p className="text-xs text-slate-500">Provider local cria um briefing textual; imagem generativa externa não está configurada.</p><div className="flex gap-2"><input aria-label="Prompt visual" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Descreva uma atmosfera visual" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /><button onClick={() => void generateVisualPrompt()} className="rounded-lg bg-violet-500 px-3 text-sm text-white">Criar ideia</button></div>{visualConcept && <p className="text-sm text-slate-300">{visualConcept}</p>}</section>
        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><h3 className="font-semibold text-white">Feedback revisável · {feedbackCount}</h3><p className="text-xs text-slate-500">Dados locais, sem retreino ou ajuste automático.</p><div className="flex gap-3"><select aria-label="Nota da faixa" value={feedbackRating} onChange={(e) => setFeedbackRating(Number(e.target.value))} className="rounded-lg bg-slate-900 p-2 text-sm text-white">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select><input aria-label="Observação da avaliação" value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} placeholder="Observação opcional" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white" /></div><div className="flex gap-2"><button onClick={() => void recordFeedback()} disabled={!selectedTrack} className="rounded-lg bg-violet-500/20 px-3 py-2 text-xs text-violet-200">Registrar avaliação</button><button onClick={() => void exportFeedback()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Exportar JSON para revisão</button></div><div className="max-h-24 space-y-1 overflow-y-auto text-xs text-slate-500">{feedbackRows.slice(0, 6).map((row) => <p key={row.id}>{tracks.find((track) => track.id === row.trackId)?.name ?? row.trackId} · {row.rating}/5{row.note ? ` · ${row.note}` : ""}</p>)}</div></section>
      </div>
      <section hidden={activeView !== "playlists"} className="grid gap-5 lg:grid-cols-2"><div className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><h2 className="font-semibold text-white">Suas playlists</h2><div className="flex gap-2"><input aria-label="Nome da playlist" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Nome da playlist" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /><button onClick={() => void createPlaylist()} className="rounded-lg bg-violet-500 px-3 text-sm text-white">Criar</button></div>{playlists.length ? playlists.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-slate-300"><button onClick={() => { setActivePlaylist(p.id); setActiveView("library"); }} className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${playlistDot[p.color] ?? playlistDot.violet}`} />{p.name} · {p.trackIds.length} faixas</button><span className="flex gap-3"><button onClick={() => void renamePlaylist(p)} className="text-xs text-slate-400">Renomear</button><button onClick={() => void addToPlaylist(p)} disabled={!selectedId || p.trackIds.includes(selectedId)} className="text-xs text-violet-300 disabled:text-slate-600">Adicionar faixa atual</button><button onClick={() => void removeFromPlaylist(p)} disabled={!selectedId || !p.trackIds.includes(selectedId)} className="text-xs text-rose-300 disabled:text-slate-600">Remover faixa atual</button></span></div>) : <p className="text-sm text-slate-500">Crie uma playlist para organizar suas faixas.</p>}</div><section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#101018] p-5"><h2 className="font-semibold text-white">Feedback revisável · {feedbackCount}</h2><p className="text-xs text-slate-500">Dados locais, sem retreino ou ajuste automático.</p><div className="flex gap-3"><select aria-label="Nota da faixa" value={feedbackRating} onChange={(e) => setFeedbackRating(Number(e.target.value))} className="rounded-lg bg-slate-900 p-2 text-sm text-white">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select><input aria-label="Observação da avaliação" value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} placeholder="Observação opcional" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white" /></div><div className="flex gap-2"><button onClick={() => void recordFeedback()} disabled={!selectedTrack} className="rounded-lg bg-violet-500/20 px-3 py-2 text-xs text-violet-200">Registrar avaliação da faixa atual</button><button onClick={() => void exportFeedback()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Exportar JSON</button></div>{feedbackRows.slice(0, 6).map((row) => <p key={row.id} className="text-xs text-slate-500">{tracks.find((track) => track.id === row.trackId)?.name ?? row.trackId} · {row.rating}/5{row.note ? ` · ${row.note}` : ""}</p>)}</section></section>
      <p className="text-center text-[11px] text-slate-600">{accountStorage ? "Áudios em armazenamento privado por conta; ouvir e guardar faixas consome a franquia do serviço de armazenamento. Faixas antigas deste navegador precisam ser importadas novamente para sincronizar." : "Sem armazenamento de conta conectado, os áudios permanecem apenas neste navegador. Os arquivos só são enviados após entrar e importar uma faixa."} DNA e seções são estimativas dos trechos reproduzidos; preferências e memória do Euterpe ficam locais neste dispositivo.</p>
    </div>
  </PageLayout>;
}
