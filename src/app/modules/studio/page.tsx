"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import JSZip from "jszip";
import { PageLayout } from "@/components/layout/PageLayout";
import { StudioShell } from "@/components/studio/StudioShell";
import { DocumentEditor } from "@/components/studio/document/DocumentEditor";
import { DocumentPreview } from "@/components/studio/document/DocumentPreview";
import { DocumentOutline } from "@/components/studio/document/DocumentOutline";
import { DocumentVersionHistory } from "@/components/studio/document/DocumentVersionHistory";
import { DocumentSuggestionPanel } from "@/components/studio/document/DocumentSuggestionPanel";
import { DocumentExportModal } from "@/components/studio/document/DocumentExportModal";
import { DocumentTemplatesModal } from "@/components/studio/document/DocumentTemplatesModal";
import { documentService } from "@/lib/studio/document/document-service";
import { DocumentItem, DocumentSaveState, DocumentTemplate } from "@/lib/studio/document/types";

// Web Studio Imports
import { WebFileExplorer } from "@/components/studio/web/WebFileExplorer";
import { WebCodeEditor } from "@/components/studio/web/WebCodeEditor";
import { WebPreviewFrame } from "@/components/studio/web/WebPreviewFrame";
import { WebConsolePanel } from "@/components/studio/web/WebConsolePanel";
import { WebMultiFileSuggestionModal } from "@/components/studio/web/WebMultiFileSuggestionModal";
import { WebExportModal } from "@/components/studio/web/WebExportModal";
import { WebTemplatesModal } from "@/components/studio/web/WebTemplatesModal";
import { webService } from "@/lib/studio/web/web-service";
import { webBuildEngine } from "@/lib/studio/web/web-build-engine";
import { WebsiteItem, WebFileItem } from "@/lib/studio/web/types";
import { WebTemplate } from "@/lib/studio/web/web-templates";

// Image Studio Imports
import { ImageCanvas } from "@/components/studio/image/ImageCanvas";
import { ImageLayerPanel } from "@/components/studio/image/ImageLayerPanel";
import { ImagePropertiesPanel } from "@/components/studio/image/ImagePropertiesPanel";
import { ImageToolbar } from "@/components/studio/image/ImageToolbar";
import { ImageExportModal } from "@/components/studio/image/ImageExportModal";
import { ImageTemplatesModal } from "@/components/studio/image/ImageTemplatesModal";
import { ImageChangeSetModal } from "@/components/studio/image/ImageChangeSetModal";
import { imageService } from "@/lib/studio/image/image-service";
import { athenaImageActions } from "@/lib/studio/image/athena-image-actions";
import { ImageItem, ImageLayer } from "@/lib/studio/image/types";

// Audio Studio Imports
import { AudioTimeline } from "@/components/studio/audio/AudioTimeline";
import { AudioTransportControls } from "@/components/studio/audio/AudioTransportControls";
import { AudioPropertiesPanel } from "@/components/studio/audio/AudioPropertiesPanel";
import { GameAudioBrowser } from "@/components/studio/audio/GameAudioBrowser";
import { AmbienceLayersPanel } from "@/components/studio/audio/AmbienceLayersPanel";
import { AudioExportModal } from "@/components/studio/audio/AudioExportModal";
import { AudioTemplatesModal } from "@/components/studio/audio/AudioTemplatesModal";
import { AudioChangeSetModal } from "@/components/studio/audio/AudioChangeSetModal";
import { audioService } from "@/lib/studio/audio/audio-service";
import { athenaAudioActions } from "@/lib/studio/audio/athena-audio-actions";
import { AudioItem, AudioClip, AudioTrack, AudioPlaybackState, ExtendedAudioTrackType } from "@/lib/studio/audio/types";
import { audioEngine } from "@/lib/studio/audio/audio-engine";
import { assetManager } from "@/lib/artifacts/asset-manager";
import { processVoiceWav } from "@/lib/studio/audio/voice-processing";
import { audioGenerationService, GeneratedAudioAsset } from "@/lib/studio/audio/audio-generation";
import { AudioMixer } from "@/components/studio/audio/AudioMixer";
import { AudioAutomationLane } from "@/components/studio/audio/AudioAutomationLane";
import { AudioAssetBrowser } from "@/components/studio/audio/AudioAssetBrowser";
import { PianoRoll } from "@/components/studio/audio/PianoRoll";
import { ScoreView } from "@/components/studio/audio/ScoreView";
import { SoundDesignPanel } from "@/components/studio/audio/SoundDesignPanel";
import { VoicePanel } from "@/components/studio/audio/VoicePanel";
import { AnalysisPanel } from "@/components/studio/audio/AnalysisPanel";
import { MusicLoopControls } from "@/components/studio/audio/MusicLoopControls";
import { MidiDevicePanel } from "@/components/studio/audio/MidiDevicePanel";
import { SpatialAudioPanel } from "@/components/studio/audio/SpatialAudioPanel";
import { DrumSequencerPanel } from "@/components/studio/audio/DrumSequencerPanel";
import { buildGameAudioPackage, validateGameAudioPackage } from "@/lib/studio/audio/game-audio-domain";
import { parseGameAudioPackage } from "@/lib/studio/audio/game-audio-domain";
import { encodeMidiFile, encodeMidiFileByTracks, parseMidiFile, parseMidiFileByTracks } from "@/lib/studio/audio/midi-file";
import { flattenMusicNotes } from "@/lib/studio/audio/music-domain";
import { defaultMusicProject, musicLoopPositionAtMs } from "@/lib/studio/audio/music-domain";
import { syncMusicNotesWithClips } from "@/lib/studio/audio/music-clip-domain";
import { createMusicClip } from "@/lib/studio/audio/music-clip-domain";
import { exportMusicXml } from "@/lib/studio/audio/musicxml-export";
import { exportScorePdf } from "@/lib/studio/audio/score-pdf-export";

// Video Studio Imports
import { VideoPreviewFrame } from "@/components/studio/video/VideoPreviewFrame";
import { VideoTimeline } from "@/components/studio/video/VideoTimeline";
import { VideoScenePanel } from "@/components/studio/video/VideoScenePanel";
import { VideoPropertiesPanel } from "@/components/studio/video/VideoPropertiesPanel";
import { VideoTransportControls } from "@/components/studio/video/VideoTransportControls";
import { VideoExportModal } from "@/components/studio/video/VideoExportModal";
import { VideoTemplatesModal } from "@/components/studio/video/VideoTemplatesModal";
import { VideoChangeSetModal } from "@/components/studio/video/VideoChangeSetModal";
import { videoService } from "@/lib/studio/video/video-service";
import { athenaVideoActions } from "@/lib/studio/video/athena-video-actions";
import { VideoItem, VideoDocumentState, VideoClip as VideoClipType, VideoTrack as VideoTrackType, VideoScene as VideoSceneType, VideoPlaybackState } from "@/lib/studio/video/types";

// Game Studio Imports
import { GameSceneCanvas } from "@/components/studio/game/GameSceneCanvas";
import { GameEntityHierarchy } from "@/components/studio/game/GameEntityHierarchy";
import { GameInspector } from "@/components/studio/game/GameInspector";
import { GameRulesPanel } from "@/components/studio/game/GameRulesPanel";
import { GamePlayModal } from "@/components/studio/game/GamePlayModal";
import { GameBuildModal } from "@/components/studio/game/GameBuildModal";
import { GameTemplatesModal } from "@/components/studio/game/GameTemplatesModal";
import { GameChangeSetModal } from "@/components/studio/game/GameChangeSetModal";
import { gameService } from "@/lib/studio/game/game-service";
import { athenaGameActions } from "@/lib/studio/game/athena-game-actions";
import { GameItem, GameDocumentState, GameEntity, GameComponent, GameScene, GameRule, GameVariable, ComponentType } from "@/lib/studio/game/types";
import { StudioAssetPanel } from "@/components/studio/common/StudioAssetPanel";
import { StudioRelationsPanel } from "@/components/studio/common/StudioRelationsPanel";
import { CreativeOrchestrationModal } from "@/components/studio/common/CreativeOrchestrationModal";
import { STUDIO_DEFINITIONS, StudioType, isValidStudioType, getStudioDefinition } from "@/lib/studio/studio-registry";
import { artifactStore } from "@/lib/artifacts/artifact-store";
import { athenaConversationStore } from "@/lib/athena/conversation/conversation-store";
import { generateStudioDraft } from "@/lib/studio/athena-generation";

import {
  FileText,
  Globe,
  Image as ImageIcon,
  Music,
  Video,
  Gamepad2,
  Plus,
  BookOpen,
  Network,
  Sparkles,
  ArrowRight,
  Play,
  RotateCw,
  Film,
  Upload,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

export default function StudioPage() {
  const [activeStudio, setActiveStudio] = useState<StudioType>("DOCUMENT");
  const [notFoundArtifactId, setNotFoundArtifactId] = useState<string | null>(null);

  // Document Studio State
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [allDocs, setAllDocs] = useState<DocumentItem[]>([]);
  const [docViewMode, setDocViewMode] = useState<"EDIT" | "PREVIEW" | "SPLIT">("SPLIT");
  const [docSidebarTab, setDocSidebarTab] = useState<"OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA">("OUTLINE");
  const [docSaveState, setDocSaveState] = useState<DocumentSaveState>("SAVED");
  const [isDocExportOpen, setIsDocExportOpen] = useState(false);
  const [isDocTemplateOpen, setIsDocTemplateOpen] = useState(false);

  // Web Studio State
  const [activeWebsite, setActiveWebsite] = useState<WebsiteItem | null>(null);
  const [allWebsites, setAllWebsites] = useState<WebsiteItem[]>([]);
  const [activeWebFile, setActiveWebFile] = useState<WebFileItem | undefined>(undefined);
  const [webViewMode, setWebViewMode] = useState<"EDIT" | "PREVIEW" | "SPLIT">("SPLIT");
  const [webSidebarTab, setWebSidebarTab] = useState<"OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA">("OUTLINE");
  const [webSaveState, setWebSaveState] = useState<DocumentSaveState>("SAVED");
  const [isWebExportOpen, setIsWebExportOpen] = useState(false);
  const [isWebTemplateOpen, setIsWebTemplateOpen] = useState(false);
  const [isWebChangeSetOpen, setIsWebChangeSetOpen] = useState(false);
  const [webBuildLogs, setWebBuildLogs] = useState<string[]>([]);
  const [webBuildErrors, setWebBuildErrors] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  // Image Studio State
  const [activeImage, setActiveImage] = useState<ImageItem | null>(null);
  const [allImages, setAllImages] = useState<ImageItem[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | undefined>(undefined);
  const [imageViewMode, setImageViewMode] = useState<"EDIT" | "PREVIEW" | "SPLIT">("EDIT");
  const [imageSidebarTab, setImageSidebarTab] = useState<"OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA">("OUTLINE");
  const [imageSaveState, setImageSaveState] = useState<DocumentSaveState>("SAVED");
  const [isImageExportOpen, setIsImageExportOpen] = useState(false);
  const [isImageTemplateOpen, setIsImageTemplateOpen] = useState(false);
  const [isImageChangeSetOpen, setIsImageChangeSetOpen] = useState(false);

  // Audio Studio State
  const [activeAudio, setActiveAudio] = useState<AudioItem | null>(null);
  const [allAudios, setAllAudios] = useState<AudioItem[]>([]);
  const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<string | undefined>(undefined);
  const [selectedAudioClipIds, setSelectedAudioClipIds] = useState<string[]>([]);
  const [audioPlaybackState, setAudioPlaybackState] = useState<AudioPlaybackState>("STOPPED");
  const [audioViewMode, setAudioViewMode] = useState<"EDIT" | "PREVIEW" | "SPLIT">("EDIT");
  const [audioZoom, setAudioZoom] = useState(40); // 40px per second default
  const [audioSidebarTab, setAudioSidebarTab] = useState<"OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA">("OUTLINE");
  const [audioSaveState, setAudioSaveState] = useState<DocumentSaveState>("SAVED");
  const [audioImportError, setAudioImportError] = useState<string>();
  const [isAudioExportOpen, setIsAudioExportOpen] = useState(false);
  const [isAudioTemplateOpen, setIsAudioTemplateOpen] = useState(false);
  const [isAudioChangeSetOpen, setIsAudioChangeSetOpen] = useState(false);
  const [audioMixerOpen, setAudioMixerOpen] = useState(false);
  const [audioPianoRollOpen, setAudioPianoRollOpen] = useState(false);
  const [audioDrumSequencerOpen, setAudioDrumSequencerOpen] = useState(false);
  const [audioScoreOpen, setAudioScoreOpen] = useState(false);
  const [audioSoundDesignOpen, setAudioSoundDesignOpen] = useState(false);
  const [audioVoiceOpen, setAudioVoiceOpen] = useState(false);
  const [audioAnalysisOpen, setAudioAnalysisOpen] = useState(false);
  const [audioGameAudioOpen, setAudioGameAudioOpen] = useState(false);
  const [audioAmbienceOpen, setAudioAmbienceOpen] = useState(false);
  const [audioMetronome, setAudioMetronome] = useState(false);
  const [audioCountInBars, setAudioCountInBars] = useState(0);
  const [audioRecording, setAudioRecording] = useState(false);
  const [gameAudioExportMessage, setGameAudioExportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [audioClipboard, setAudioClipboard] = useState<AudioClip | null>(null);

  // Video Studio State
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [selectedVideoTrackId, setSelectedVideoTrackId] = useState<string | undefined>(undefined);
  const [selectedVideoClipIds, setSelectedVideoClipIds] = useState<string[]>([]);
  const [selectedVideoSceneId, setSelectedVideoSceneId] = useState<string | undefined>(undefined);
  const [videoPlaybackState, setVideoPlaybackState] = useState<VideoPlaybackState>("STOPPED");
  const [videoZoom, setVideoZoom] = useState(30); // 30px per second default
  const [videoSidebarTab, setVideoSidebarTab] = useState<"OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA">("OUTLINE");
  const [videoSaveState, setVideoSaveState] = useState<DocumentSaveState>("SAVED");
  const [isVideoExportOpen, setIsVideoExportOpen] = useState(false);
  const [isVideoTemplateOpen, setIsVideoTemplateOpen] = useState(false);
  const [isVideoChangeSetOpen, setIsVideoChangeSetOpen] = useState(false);
  const [isStoryboardMode, setIsStoryboardMode] = useState(false);

  // Game Studio State
  const [activeGame, setActiveGame] = useState<GameItem | null>(null);
  const [allGames, setAllGames] = useState<GameItem[]>([]);
  const [selectedGameSceneId, setSelectedGameSceneId] = useState<string | undefined>(undefined);
  const [selectedGameEntityId, setSelectedGameEntityId] = useState<string | undefined>(undefined);
  const [gameSidebarTab, setGameSidebarTab] = useState<"OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA">("OUTLINE");
  const [gameSaveState, setGameSaveState] = useState<DocumentSaveState>("SAVED");
  const [isGamePlayOpen, setIsGamePlayOpen] = useState(false);
  const [isGameBuildOpen, setIsGameBuildOpen] = useState(false);
  const [isGameTemplateOpen, setIsGameTemplateOpen] = useState(false);
  const [isGameChangeSetOpen, setIsGameChangeSetOpen] = useState(false);
  const [gameAudioImportMessage, setGameAudioImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Creative Orchestrator Modal
  const [isOrchestrationModalOpen, setIsOrchestrationModalOpen] = useState(false);
  const [orchestrationPlanId, setOrchestrationPlanId] = useState<string | undefined>(undefined);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioAutosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingAudioSaveRef = useRef<{ artifactId: string; state: AudioItem["documentState"] } | null>(null);
  const pendingAudioFlushRef = useRef<(updateUi?: boolean) => void>(() => undefined);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flushPendingAudioState = useCallback((updateUi = true) => {
    const pending = pendingAudioSaveRef.current;
    if (!pending) return;
    const persisted = audioService.persistPendingStateLocally(pending.state);
    if (!persisted.success) {
      setAudioSaveState("SAVE_FAILED");
      return;
    }
    if (audioAutosaveTimerRef.current) {
      clearTimeout(audioAutosaveTimerRef.current);
      audioAutosaveTimerRef.current = null;
    }
    void audioService.saveDocumentState(pending.artifactId, pending.state, "USER").then((result) => {
      if (pendingAudioSaveRef.current !== pending) return;
      if (result.success) {
        pendingAudioSaveRef.current = null;
        if (updateUi) {
          setAudioSaveState("SAVED");
          setActiveAudio((current) => current?.artifact.id === pending.artifactId ? audioService.getAudio(pending.artifactId) : current);
        }
      } else {
        if (updateUi) setAudioSaveState("SAVE_FAILED");
      }
    }).catch(() => {
      if (updateUi && pendingAudioSaveRef.current === pending) setAudioSaveState("SAVE_FAILED");
    });
  }, []);
  useEffect(() => {
    pendingAudioFlushRef.current = flushPendingAudioState;
  }, [flushPendingAudioState]);

  const loadData = useCallback(() => {
    const docs = documentService.listDocuments();
    const webs = webService.listWebsites();
    const imgs = imageService.listImages();
    const auds = audioService.listAudioProjects();
    const vids = videoService.listVideoProjects();
    const gms = gameService.getAllGames();

    setAllDocs(docs);
    setAllWebsites(webs);
    setAllImages(imgs);
    setAllAudios(auds);
    setAllVideos(vids);
    setAllGames(gms);

    // Reconcile active items only if already selected
    setActiveDoc((prev) => {
      if (!prev) return null;
      const found = docs.find((d) => d.artifact.id === prev.artifact.id);
      return found || null;
    });

    setActiveWebsite((prev) => {
      if (!prev) return null;
      const found = webs.find((w) => w.artifact.id === prev.artifact.id);
      return found || null;
    });

    setActiveImage((prev) => {
      if (!prev) return null;
      const found = imgs.find((i) => i.artifact.id === prev.artifact.id);
      return found || null;
    });

    setActiveAudio((prev) => {
      if (!prev) return null;
      const found = auds.find((a) => a.artifact.id === prev.artifact.id);
      return found || null;
    });

    setActiveVideo((prev) => {
      if (!prev) return null;
      const found = vids.find((v) => v.artifact.id === prev.artifact.id);
      return found || null;
    });

    setActiveGame((prev: GameItem | null) => {
      if (!prev) return null;
      const found = gms.find((g) => g.artifact.id === prev.artifact.id);
      return found || null;
    });
  }, []);
  const syncFromUrl = useCallback(async () => {
    if (typeof window === "undefined") return;
    loadData();
    const params = new URLSearchParams(window.location.search);
    const studioParam = params.get("studio")?.toUpperCase();
    const idParam = params.get("id");
    const conversationId = params.get("conversation");

    if (studioParam && isValidStudioType(studioParam)) {
      setActiveStudio(studioParam);
    }

    if (idParam) {
      const art = artifactStore.getById(idParam);
      if (!art || art.status === "TRASHED") {
        if (conversationId && studioParam && isValidStudioType(studioParam)) {
          const conversation = athenaConversationStore.load().conversations.find(item => item.id === conversationId);
          const remembered = [...(conversation?.messages || [])].reverse().map(message => message.metadata?.studioBrief as { studio?: StudioType; options?: string[]; selected?: number } | undefined).find(value => value?.studio === studioParam && Array.isArray(value.options));
          const selectedBrief = remembered?.selected !== undefined ? remembered.options?.[remembered.selected] : undefined;
          if (selectedBrief) {
            try {
              const generated = await generateStudioDraft(studioParam, selectedBrief, `${conversationId}:${studioParam}:${selectedBrief}`, conversationId);
              window.history.replaceState({}, "", generated.href);
              await syncFromUrl();
              return;
            } catch {
              // The normal not-found panel remains visible with the original reference.
            }
          }
        }
        setNotFoundArtifactId(idParam);
        setActiveDoc(null);
        setActiveWebsite(null);
        setActiveImage(null);
        setActiveAudio(null);
        setActiveVideo(null);
        setActiveGame(null);
        return;
      }

      setNotFoundArtifactId(null);
      // Determine Studio by artifact type (authoritative)
      if (art.type === "DOCUMENT") {
        setActiveStudio("DOCUMENT");
        const doc = documentService.getDocument(art.id);
        setActiveDoc(doc || null);
        setActiveWebsite(null);
        setActiveImage(null);
        setActiveAudio(null);
        setActiveVideo(null);
        setActiveGame(null);
      } else if (art.type === "WEBSITE" || art.type === "CODE") {
        setActiveStudio("WEB");
        const ws = webService.getWebsite(art.id);
        if (ws) {
          setActiveWebsite(ws);
          const entry = ws.files.find((f) => f.path === "index.html" || f.isEntry) || ws.files[0];
          setActiveWebFile(entry);
        }
        setActiveDoc(null);
        setActiveImage(null);
        setActiveAudio(null);
        setActiveVideo(null);
        setActiveGame(null);
      } else if (art.type === "IMAGE") {
        setActiveStudio("IMAGE");
        const img = imageService.getImage(art.id);
        setActiveImage(img || null);
        setActiveDoc(null);
        setActiveWebsite(null);
        setActiveAudio(null);
        setActiveVideo(null);
        setActiveGame(null);
      } else if (art.type === "AUDIO") {
        setActiveStudio("AUDIO");
        const aud = audioService.getAudio(art.id);
        setActiveAudio(aud || null);
        setActiveDoc(null);
        setActiveWebsite(null);
        setActiveImage(null);
        setActiveVideo(null);
        setActiveGame(null);
      } else if (art.type === "VIDEO") {
        setActiveStudio("VIDEO");
        const vid = videoService.getVideo(art.id);
        setActiveVideo(vid || null);
        setActiveDoc(null);
        setActiveWebsite(null);
        setActiveImage(null);
        setActiveAudio(null);
        setActiveGame(null);
      } else if (art.type === "GAME") {
        setActiveStudio("GAME");
        const gm = gameService.getGame(art.id);
        setActiveGame(gm || null);
        setActiveDoc(null);
        setActiveWebsite(null);
        setActiveImage(null);
        setActiveAudio(null);
        setActiveVideo(null);
      }
    } else {
      setNotFoundArtifactId(null);
      // In Hub view without specific id, do not open active workspace
      setActiveDoc(null);
      setActiveWebsite(null);
      setActiveImage(null);
      setActiveAudio(null);
      setActiveVideo(null);
      setActiveGame(null);
    }
  }, [loadData]);

  useEffect(() => {
    void syncFromUrl();

    const handleUpdate = () => loadData();
    const handlePopState = () => { void syncFromUrl(); };
    const handleOpenOrchestration = (e: any) => {
      if (e.detail?.planId) {
        setOrchestrationPlanId(e.detail.planId);
      }
      setIsOrchestrationModalOpen(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") pendingAudioFlushRef.current();
    };
    const handlePageHide = () => pendingAudioFlushRef.current();

    window.addEventListener("varynth_artifacts_updated", handleUpdate);
    window.addEventListener("BACKUP_RESTORE_COMPLETED", handleUpdate);
    window.addEventListener("varynth_store_update", handleUpdate);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("open-creative-orchestration" as any, handleOpenOrchestration);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      pendingAudioFlushRef.current(false);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      audioEngine.dispose();
      window.removeEventListener("varynth_artifacts_updated", handleUpdate);
      window.removeEventListener("BACKUP_RESTORE_COMPLETED", handleUpdate);
      window.removeEventListener("varynth_store_update", handleUpdate);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("open-creative-orchestration" as any, handleOpenOrchestration);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncFromUrl, loadData]);


  const handleBackToHub = (targetStudio?: StudioType) => {
    const nextStudio = targetStudio || activeStudio;
    setActiveDoc(null);
    setActiveWebsite(null);
    setActiveImage(null);
    setActiveAudio(null);
    setActiveVideo(null);
    setActiveGame(null);
    setNotFoundArtifactId(null);
    setActiveStudio(nextStudio);

    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/modules/studio?studio=${nextStudio}`);
    }
  };

  const handleSwitchStudioTab = (studioType: StudioType) => {
    setActiveStudio(studioType);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/modules/studio?studio=${studioType}`);
    }
  };

  // --- Document Studio Handlers ---
  const handleDocContentChange = (newContent: string) => {
    if (!activeDoc) return;
    setActiveDoc((prev) => (prev ? { ...prev, content: newContent } : null));
    setDocSaveState("SAVING");

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await documentService.saveDocumentContent(activeDoc.artifact.id, newContent, {}, "USER");
        if (res.success) {
          setDocSaveState("SAVED");
          loadData();
        } else {
          setDocSaveState("SAVE_FAILED");
        }
      } catch (err) {
        setDocSaveState("SAVE_FAILED");
      }
    }, 800);
  };

  const handleSelectDocument = (doc: DocumentItem) => {
    setActiveDoc(doc);
    setActiveStudio("DOCUMENT");
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/modules/studio?studio=DOCUMENT&id=${doc.artifact.id}`);
    }
  };

  const handleCreateNewDocument = async (template: DocumentTemplate, title: string) => {
    const res = await documentService.createDocument({
      title,
      templateId: template.id,
      documentType: template.type,
      createdBy: "USER",
    });

    if (res.success && res.document) {
      handleSelectDocument(res.document);
      loadData();
    }
  };

  // --- Web Studio Handlers ---
  const handleSelectWebsite = (ws: WebsiteItem) => {
    setActiveWebsite(ws);
    setActiveStudio("WEB");
    const entry = ws.files.find((f) => f.path === "index.html" || f.isEntry) || ws.files[0];
    setActiveWebFile(entry);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/modules/studio?studio=WEB&id=${ws.artifact.id}`);
    }
  };

  const handleWebFileContentChange = (path: string, newContent: string) => {
    if (!activeWebsite) return;
    const updatedFiles = activeWebsite.files.map((f) => (f.path === path ? { ...f, content: newContent } : f));
    setActiveWebsite({ ...activeWebsite, files: updatedFiles });
    if (activeWebFile && activeWebFile.path === path) {
      setActiveWebFile({ ...activeWebFile, content: newContent });
    }

    setWebSaveState("SAVING");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      const res = await webService.saveFiles(activeWebsite.artifact.id, updatedFiles, "USER");
      if (res.success) {
        setWebSaveState("SAVED");
        loadData();
      } else {
        setWebSaveState("SAVE_FAILED");
      }
    }, 800);
  };

  const handleCreateNewWebsite = async (template: WebTemplate, name: string) => {
    const res = await webService.createWebsite({
      name,
      templateId: template.id,
      actor: "USER",
    });

    if (res.success && res.website) {
      handleSelectWebsite(res.website);
      loadData();
    }
  };

  const handleRunBuild = async () => {
    if (!activeWebsite) return;
    setIsBuilding(true);
    setWebBuildLogs(["[WebStudio] Iniciando build através do JobManager e SandboxRuntime..."]);
    setWebBuildErrors([]);

    const res = await webBuildEngine.buildWebsite(
      activeWebsite.artifact.id,
      activeWebsite.files,
      activeWebsite.metadata,
      { actor: "USER" }
    );

    setWebBuildLogs(res.logs);
    setWebBuildErrors(res.errors);
    setIsBuilding(false);
    loadData();
  };

  // --- Image Studio Handlers ---
  const handleSelectImage = (img: ImageItem) => {
    setActiveImage(img);
    setActiveStudio("IMAGE");
    if (img.documentState.layers.length > 0) {
      setSelectedLayerId(img.documentState.layers[0].id);
    } else {
      setSelectedLayerId(undefined);
    }
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/modules/studio?studio=IMAGE&id=${img.artifact.id}`);
    }
  };

  const handleUpdateImageDocumentState = (updated: ImageItem["documentState"]) => {
    if (!activeImage) return;
    imageService.pushUndoState(activeImage.documentState);
    setActiveImage({ ...activeImage, documentState: updated });
    setImageSaveState("SAVING");

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      const res = await imageService.saveDocumentState(activeImage.artifact.id, updated, "USER");
      if (res.success) {
        setImageSaveState("SAVED");
        loadData();
      } else {
        setImageSaveState("SAVE_FAILED");
      }
    }, 800);
  };

  const handleCreateNewImage = async (
    templateId?: string,
    name?: string,
    customCanvas?: { width: number; height: number; background: string }
  ) => {
    const res = await imageService.createImage({
      name: name || "Nova Imagem",
      templateId,
      customCanvas,
      actor: "USER",
    });

    if (res.success && res.image) {
      handleSelectImage(res.image);
      loadData();
    }
  };

  // --- Audio Studio Handlers ---
  const handleSelectAudio = (aud: AudioItem) => {
    if (pendingAudioSaveRef.current && pendingAudioSaveRef.current.artifactId !== aud.artifact.id) flushPendingAudioState();
    setActiveAudio(aud);
    setActiveStudio("AUDIO");
    if (aud.documentState.tracks.length > 0) {
      setSelectedAudioTrackId(aud.documentState.tracks[0].id);
      if (aud.documentState.tracks[0].clips.length > 0) {
        setSelectedAudioClipIds([aud.documentState.tracks[0].clips[0].id]);
      }
    }
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/modules/studio?studio=AUDIO&id=${aud.artifact.id}`);
    }
  };

  const handleUpdateAudioDocumentState = useCallback((updated: AudioItem["documentState"]) => {
    if (!activeAudio) return;
    audioService.pushUndoState(activeAudio.documentState);
    const pendingSave = { artifactId: activeAudio.artifact.id, state: updated };
    pendingAudioSaveRef.current = pendingSave;
    audioService.stageDocumentState(updated);
    setActiveAudio({ ...activeAudio, documentState: updated });
    setAudioSaveState("SAVING");

    if (audioAutosaveTimerRef.current) clearTimeout(audioAutosaveTimerRef.current);
    audioAutosaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await audioService.saveDocumentState(pendingSave.artifactId, pendingSave.state, "USER");
        if (pendingAudioSaveRef.current !== pendingSave) return;
        if (res.success) {
          pendingAudioSaveRef.current = null;
          setAudioSaveState("SAVED");
          loadData();
        } else {
          setAudioSaveState("SAVE_FAILED");
        }
      } catch {
        if (pendingAudioSaveRef.current === pendingSave) setAudioSaveState("SAVE_FAILED");
      }
    }, 800);
  }, [activeAudio, loadData]);

  const handleUpdateMusicState = (music: NonNullable<AudioItem["documentState"]["music"]>) => {
    if (!activeAudio) return;
    const trackId = selectedAudioTrackId || activeAudio.documentState.tracks.find((track) => track.type === "INSTRUMENT" || track.type === "MIDI")?.id;
    handleUpdateAudioDocumentState({ ...activeAudio.documentState, music: trackId ? syncMusicNotesWithClips(music, trackId) : music });
  };

  const handleRecordedMidiNotes = (notes: NonNullable<AudioItem["documentState"]["music"]>["notes"]) => {
    if (!activeAudio || !notes.length) return;
    const current = activeAudio.documentState.music || { ...defaultMusicProject(), tempoMap: [{ beat: 0, bpm: activeAudio.documentState.settings?.bpm || 120 }] };
    handleUpdateMusicState({ ...current, notes: [...current.notes, ...notes] });
  };

  const handleGeneratedAudio = async (generated: GeneratedAudioAsset) => {
    if (!activeAudio) throw new Error("Nenhum projeto de áudio ativo.");
    const asset = assetManager.getAsset(generated.assetId);
    if (!asset) throw new Error(`[GENERATED_AUDIO_ASSET_MISSING] O provider '${generated.provider}' retornou o asset '${generated.assetId}', mas ele não está registrado no Asset Manager.`);
    const linked = await assetManager.linkAssetToArtifact(generated.assetId, activeAudio.artifact.id);
    if (!linked) throw new Error(`[GENERATED_AUDIO_LINK_FAILED] Não foi possível vincular '${generated.assetId}' ao projeto atual.`);
    const trackType = generated.provenance.request.type === "ambience" ? "AMBIENCE" : generated.provenance.request.type === "music" ? "MUSIC" : generated.provenance.request.type === "voice" ? "VOICE" : "SFX";
    const targetTrack = activeAudio.documentState.tracks.find((track) => track.type === trackType) || activeAudio.documentState.tracks.find((track) => track.id === selectedAudioTrackId) || activeAudio.documentState.tracks[0];
    if (!targetTrack) throw new Error("O projeto não possui uma faixa para receber o asset gerado.");
    const inserted = await audioService.insertExistingAsset(activeAudio.artifact.id, generated.assetId, targetTrack.id, activeAudio.documentState.playheadMs, "USER", { durationMs: generated.duration * 1000, provenance: { origin: "GENERATED", provider: generated.provider, license: generated.provenance.license, generationDate: generated.createdAt, generationMetadata: generated.generationMetadata } });
    if (!inserted.success || !("clipId" in inserted)) throw new Error("error" in inserted ? inserted.error || "Não foi possível inserir o asset gerado na timeline." : "Não foi possível inserir o asset gerado na timeline.");
    const generatedClipId = inserted.clipId;
    const refreshed = audioService.getAudio(activeAudio.artifact.id);
    if (!refreshed) throw new Error("O projeto deixou de estar disponível após inserir o asset.");
    const profile = refreshed.documentState.voiceProfiles?.find((item) => item.characterId === "euterpe");
    const updated = generated.provenance.request.type === "voice" && profile ? { ...refreshed.documentState, voiceTakes: [...(refreshed.documentState.voiceTakes || []).map((take) => ({ ...take, selected: false })), { id: `voice-take-${generatedClipId}`, text: generated.provenance.request.prompt, expression: profile.styleProfile.expression, assetId: generated.assetId, profileVersion: profile.version, selected: true, metadata: { status: "GENERATED", provider: generated.provider, generatedAt: generated.createdAt } }] } : refreshed.documentState;
    if (updated !== refreshed.documentState) {
      const saved = await audioService.saveDocumentState(activeAudio.artifact.id, updated, "USER");
      if (!saved.success) throw new Error(saved.error || "Não foi possível salvar o take de voz gerado.");
    }
    setActiveAudio({ ...refreshed, documentState: updated });
    setSelectedAudioTrackId(targetTrack.id);
    setSelectedAudioClipIds([generatedClipId]);
  };

  const handleGenerateVoice = async (text: string, expression: import("@/lib/studio/audio/voice-domain").VoiceExpression) => {
    const profile = activeAudio?.documentState.voiceProfiles?.find((item) => item.characterId === "euterpe");
    if (!profile) throw new Error("Perfil vocal da Euterpe não encontrado neste projeto.");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const generated = await audioGenerationService.generate({ type: "voice", prompt: text, duration: Math.max(1, words / 2.5), channels: 1, sampleRate: 48000, metadata: { expression, language: profile.language, profileVersion: profile.version, providerVoiceId: profile.providerVoiceId || "" } });
    await handleGeneratedAudio(generated);
  };

  const handleProcessVoiceTake = async (take: import("@/lib/studio/audio/voice-domain").VoiceTake) => {
    if (!activeAudio || !take.assetId) throw new Error("Este take não possui asset de áudio.");
    const sourceAssetId = take.assetId;
    const profile = activeAudio.documentState.voiceProfiles?.find((item) => item.characterId === "euterpe");
    if (!profile) throw new Error("Perfil vocal da Euterpe não encontrado neste projeto.");
    const source = await assetManager.getAssetData(sourceAssetId);
    if (!source) throw new Error(`[VOICE_SOURCE_MISSING] O asset '${sourceAssetId}' não está disponível localmente.`);
    const raw = typeof source === "string" ? await (await fetch(source)).arrayBuffer() : source instanceof ArrayBuffer ? source : await source.arrayBuffer();
    const processed = processVoiceWav(raw, { effects: profile.processingChain.filter((item): item is import("@/lib/studio/audio/voice-processing").VoiceProcessingEffect => ["EQ", "De-esser", "Compressor", "Noise Gate", "Gain"].includes(item)), ...profile.processingSettings });
    const derived = await assetManager.registerAsset({ name: `${take.id}-processed.wav`, mimeType: "audio/wav", sizeBytes: processed.data.byteLength, artifactIds: [activeAudio.artifact.id], metadata: { isSource: false, isDerived: true, derivedFromAssetId: sourceAssetId, processingChain: profile.processingChain, durationMs: processed.samples / processed.sampleRate * 1000, sampleRate: processed.sampleRate, channels: processed.channels } }, processed.data);
    const updatedTakes = (activeAudio.documentState.voiceTakes || []).map((item) => item.id === take.id ? { ...item, assetId: derived.id, metadata: { ...(item.metadata || {}), status: "PROCESSED_LOCAL", sourceAssetId, processedAt: new Date().toISOString() } } : item);
    const saved = await audioService.saveDocumentState(activeAudio.artifact.id, { ...activeAudio.documentState, voiceTakes: updatedTakes }, "USER");
    if (!saved.success) throw new Error(saved.error || "Não foi possível salvar o take processado.");
    setActiveAudio({ ...activeAudio, documentState: { ...activeAudio.documentState, voiceTakes: updatedTakes } });
  };

  const handleCreateNewAudio = async (
    templateId?: string,
    name?: string,
    customDurationMs?: number
  ) => {
    const res = await audioService.createAudioProject({
      name: name || "Novo Projeto de Áudio",
      templateId,
      customDurationMs,
      actor: "USER",
    });

    if (res.success && res.audio) {
      handleSelectAudio(res.audio);
      loadData();
    }
  };

  const handleAddAudioTrack = (type: ExtendedAudioTrackType, name?: string) => {
    if (!activeAudio) return;
    const newTrack = athenaAudioActions.createTrack(name || `Faixa ${activeAudio.documentState.tracks.length + 1}`, type);
    handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: [...activeAudio.documentState.tracks, newTrack] });
    setSelectedAudioTrackId(newTrack.id);
  };

  const handlePlayAudio = async () => {
    if (!activeAudio) return;
    audioEngine.seek(activeAudio.documentState.playheadMs);
    try { await audioEngine.play({ ...activeAudio.documentState, settings: { ...activeAudio.documentState.settings!, metronome: { enabled: audioMetronome, volume: 0.7, accentFirstBeat: true, countInBars: audioCountInBars } } }); } catch (error) { console.error("[AudioStudio] Playback failed", error); setAudioPlaybackState("ERROR"); return; }
    setAudioPlaybackState("PLAYING");
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);

    playbackTimerRef.current = setInterval(() => {
      const newPlayhead = audioEngine.positionMs();
      const music = activeAudio.documentState.music;
      const loopStartMs = musicLoopPositionAtMs(newPlayhead, music?.loopRegion, music?.tempoMap || [{ beat: 0, bpm: activeAudio.documentState.settings?.bpm || 120 }]);
      if (loopStartMs !== null) {
        const loopDocument = { ...activeAudio.documentState, playheadMs: loopStartMs, settings: { ...activeAudio.documentState.settings!, metronome: { enabled: audioMetronome, volume: 0.7, accentFirstBeat: true, countInBars: 0 } } };
        audioEngine.seek(loopStartMs);
        void audioEngine.play(loopDocument).catch((error) => { console.error("[AudioStudio] Musical loop restart failed", error); setAudioPlaybackState("ERROR"); });
        setActiveAudio((prev) => prev?.artifact.id === activeAudio.artifact.id ? { ...prev, documentState: { ...prev.documentState, playheadMs: loopStartMs } } : prev);
        return;
      }
      setActiveAudio((prev) => {
        if (!prev) return null;
        if (newPlayhead >= prev.documentState.timeline.durationMs) {
          if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
          setAudioPlaybackState("STOPPED");
          return {
            ...prev,
            documentState: { ...prev.documentState, playheadMs: 0 },
          };
        }
        return {
          ...prev,
          documentState: { ...prev.documentState, playheadMs: newPlayhead },
        };
      });
    }, 100);
  };

  const handlePauseAudio = () => {
    audioEngine.pause();
    setAudioPlaybackState("PAUSED");
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
  };

  const handleStopAudio = () => {
    audioEngine.stop();
    setAudioPlaybackState("STOPPED");
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    if (activeAudio) {
      setActiveAudio({
        ...activeAudio,
        documentState: { ...activeAudio.documentState, playheadMs: 0 },
      });
    }
  };

  const handleRecordAudio = async () => {
    if (!activeAudio) return;
    if (audioRecording) {
      try {
        const blob = await audioEngine.stopRecording();
        const track = activeAudio.documentState.tracks.find((t) => t.recordArm) || activeAudio.documentState.tracks[0];
        if (!track) throw new Error("Nenhuma faixa disponível para gravação.");
        const data = await blob.arrayBuffer();
        const imported = await audioService.importAudio({ name: `recording-${Date.now()}.webm`, mimeType: blob.type || "audio/webm", sizeBytes: blob.size, data, durationMs: Math.max(100, audioEngine.recordingDurationMs()), actor: "USER" });
        if (imported.success && imported.audio) {
          const recordedClip = imported.audio.documentState.tracks[0]?.clips[0];
          if (recordedClip) {
            await import("@/lib/artifacts/asset-manager").then(({ assetManager }) => assetManager.linkAssetToArtifact(recordedClip.assetId, activeAudio.artifact.id));
            const clip = { ...recordedClip, id: `clip-recording-${Date.now()}`, trackId: track.id, timelineStartMs: activeAudio.documentState.playheadMs };
            const next = { ...activeAudio.documentState, tracks: activeAudio.documentState.tracks.map((t) => t.id === track.id ? { ...t, clips: [...t.clips, clip] } : t) };
            handleUpdateAudioDocumentState(next);
          }
        } else setAudioImportError(imported.error || "Não foi possível importar a gravação.");
        setAudioRecording(false); setAudioPlaybackState("STOPPED");
      } catch (error) { console.error("[AudioStudio] Recording failed", error); setAudioPlaybackState("ERROR"); setAudioRecording(false); }
    } else {
      try { const armed = activeAudio.documentState.tracks.find((track) => track.recordArm); await audioEngine.startRecording(armed?.inputDeviceId); setAudioRecording(true); setAudioPlaybackState("BUFFERING"); } catch (error) { console.error("[AudioStudio] Recording unavailable", error); setAudioPlaybackState("ERROR"); }
    }
  };
  const handleImportAudioFiles = async (files: File[]) => {
    if (!activeAudio) return;
    setAudioImportError(undefined);
    for (const file of files) {
      const data = await file.arrayBuffer();
      const result = await audioService.importAssetIntoProject({ artifactId: activeAudio.artifact.id, name: file.name, mimeType: file.type || "audio/wav", sizeBytes: file.size, data, trackId: selectedAudioTrackId, timelineStartMs: activeAudio.documentState.playheadMs, actor: "USER" });
      if (!result.success) { setAudioImportError(result.error || `Não foi possível importar ${file.name}.`); console.error("[AudioStudio] Drop import failed", result.error); }
    }
    const ref = audioService.getAudio(activeAudio.artifact.id); if (ref) setActiveAudio(ref); loadData();
  };
  const handleExportAudioMidi = () => {
    if (!activeAudio) return;
    const music = activeAudio.documentState.music || { version: 1, tuning: { concertPitchHz: 440, temperament: "12-TET" }, tempoMap: [{ beat: 0, bpm: 120 }], timeSignature: { numerator: 4, denominator: 4 }, key: { tonic: "C", accidental: "natural", scale: "major" }, notes: [], rests: [], chords: [] };
    const structuredTracks = music.clips?.reduce<Array<{ trackId: string; notes: typeof music.notes }>>((groups, clip) => {
      const target = groups.find((group) => group.trackId === clip.trackId);
      const notes = clip.notes.map((note) => ({ ...note, startBeat: note.startBeat + clip.startBeat + clip.timelineStartMs / 1000 / (60 / (music.tempoMap[0]?.bpm || 120)) }));
      if (target) target.notes.push(...notes); else groups.push({ trackId: clip.trackId, notes });
      return groups;
    }, []);
    const bytes = structuredTracks?.length ? encodeMidiFileByTracks(structuredTracks, music.tempoMap[0]?.bpm || 120) : encodeMidiFile(flattenMusicNotes(music), music.tempoMap[0]?.bpm || 120);
    const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "audio/midi" })); const link = document.createElement("a"); link.href = url; link.download = `${activeAudio.artifact.name.replace(/[^\w-]+/g, "-")}.mid`; link.click(); URL.revokeObjectURL(url);
  };
  const handleExportAudioMusicXml = () => {
    if (!activeAudio) return;
    const music = activeAudio.documentState.music || defaultMusicProject();
    const xml = exportMusicXml(music, activeAudio.artifact.name);
    const url = URL.createObjectURL(new Blob([xml], { type: "application/vnd.recordare.musicxml+xml" })); const link = document.createElement("a"); link.href = url; link.download = `${activeAudio.artifact.name.replace(/[^\w-]+/g, "-")}.musicxml`; link.click(); URL.revokeObjectURL(url);
  };
  const handleExportAudioScorePdf = () => {
    if (!activeAudio) return;
    const bytes = exportScorePdf(activeAudio.documentState.music || defaultMusicProject(), activeAudio.artifact.name);
    const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" })); const link = document.createElement("a"); link.href = url; link.download = `${activeAudio.artifact.name.replace(/[^\w-]+/g, "-")}.pdf`; link.click(); URL.revokeObjectURL(url);
  };
  const handleImportAudioMidi = () => {
    if (!activeAudio) return;
    const input = document.createElement("input"); input.type = "file"; input.accept = ".mid,.midi,audio/midi,audio/x-midi";
    input.onchange = async () => { const file = input.files?.[0]; if (!file) return; try { const parsed = parseMidiFileByTracks(await file.arrayBuffer()); const current = activeAudio.documentState.music; const baseMusic = current || { version: 1 as const, tuning: { concertPitchHz: 440, temperament: "12-TET" as const }, tempoMap: [{ beat: 0, bpm: 120 }], timeSignature: { numerator: 4, denominator: 4 as const }, key: { tonic: "C" as const, accidental: "natural" as const, scale: "major" as const }, notes: [], rests: [], chords: [] }; const importedTracks = parsed.tracks.map((track, index) => { const newTrack = athenaAudioActions.createTrack(`MIDI ${index + 1}`, "MIDI"); return { track: newTrack, clip: createMusicClip(newTrack.id, track.notes, 0, Math.max(4, ...track.notes.map((note) => note.startBeat + note.durationBeats)), `MIDI ${index + 1}`) }; }); const music = { ...baseMusic, notes: parsed.tracks.flatMap((track) => track.notes), clips: [...(baseMusic.clips || []).filter((clip) => !importedTracks.some((item) => item.track.id === clip.trackId)), ...importedTracks.map((item) => item.clip)], tempoMap: [{ beat: 0, bpm: parsed.sequence.tempoBpm }] }; handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: [...activeAudio.documentState.tracks, ...importedTracks.map((item) => item.track)], music }); if (importedTracks[0]) setSelectedAudioTrackId(importedTracks[0].track.id); } catch (error) { console.error("[AudioStudio] MIDI import failed", error); } };
    input.click();
  };
  const handleExportGameAudioPackage = () => {
    if (!activeAudio) return;
    setGameAudioExportMessage(null);
    try {
      const linkedAssets = assetManager.listAssetsForArtifact(activeAudio.artifact.id);
      const usableAssetIds = new Set(linkedAssets.filter((asset) => asset.status !== "QUARANTINED" && asset.status !== "CORRUPTED").map((asset) => asset.id));
      const pack = buildGameAudioPackage(activeAudio.artifact.name, activeAudio.documentState.tracks, [], linkedAssets);
      const issues = validateGameAudioPackage(pack, usableAssetIds);
      if (issues.length) {
        setGameAudioExportMessage({ type: "error", text: `Exportação bloqueada: ${issues.slice(0, 3).map((issue) => issue.message).join(" ")}${issues.length > 3 ? ` (+${issues.length - 3} problemas)` : ""}` });
        return;
      }
      const url = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `${activeAudio.artifact.name.replace(/[^\w-]+/g, "-")}-game-audio.json`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setGameAudioExportMessage({ type: "success", text: `Pacote validado: ${pack.assets.length} assets, ${pack.events.length} eventos e ${pack.variationGroups.length} grupos de variação.` });
    } catch (error) {
      setGameAudioExportMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível validar/exportar o pacote Game Audio." });
    }
  };
  const handleExportGameAudioBundle = async () => {
    if (!activeAudio) return;
    setGameAudioExportMessage(null);
    try {
      const linkedAssets = assetManager.listAssetsForArtifact(activeAudio.artifact.id);
      const usableAssetIds = new Set(linkedAssets.filter((asset) => asset.status !== "QUARANTINED" && asset.status !== "CORRUPTED").map((asset) => asset.id));
      const pack = buildGameAudioPackage(activeAudio.artifact.name, activeAudio.documentState.tracks, [], linkedAssets);
      const issues = validateGameAudioPackage(pack, usableAssetIds);
      if (issues.length) { setGameAudioExportMessage({ type: "error", text: `Bundle bloqueado: ${issues.slice(0, 3).map((issue) => issue.message).join(" ")}` }); return; }
      const zip = new JSZip();
      const manifest: Array<{ assetId: string; path: string; sha256: string; bytes: number; mimeType?: string }> = [];
      for (const item of pack.assets) {
        const source = linkedAssets.find((asset) => asset.id === item.assetId);
        const data = await assetManager.getAssetData(item.assetId);
        if (!source || !data) throw new Error(`[GAME_AUDIO_BUNDLE_ASSET_MISSING] Não foi possível ler o asset '${item.assetId}'.`);
        const raw = typeof data === "string" ? await (await fetch(data)).arrayBuffer() : data instanceof Blob ? await data.arrayBuffer() : data.slice(0);
        const digest = await crypto.subtle.digest("SHA-256", raw);
        const sha256 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
        const safeName = source.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || item.assetId;
        const path = `assets/${item.assetId}-${safeName}`;
        zip.file(path, raw);
        manifest.push({ assetId: item.assetId, path, sha256, bytes: raw.byteLength, mimeType: source.mimeType });
      }
      zip.file("game-audio.json", JSON.stringify(pack, null, 2));
      zip.file("manifest.json", JSON.stringify({ version: 1, package: "game-audio.json", assets: manifest }, null, 2));
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${activeAudio.artifact.name.replace(/[^\w-]+/g, "-")}-game-audio-bundle.zip`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setGameAudioExportMessage({ type: "success", text: `Bundle portátil validado: ${manifest.length} assets, ${pack.events.length} eventos e hashes SHA-256 registrados.` });
    } catch (error) { setGameAudioExportMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível criar o bundle Game Audio." }); }
  };

  useEffect(() => {
    if (!activeAudio) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const selectedId = selectedAudioClipIds[0];
      const selected = activeAudio.documentState.tracks.flatMap((track) => track.clips).find((clip) => clip.id === selectedId);
      if (event.key === "Delete" && selectedId) { event.preventDefault(); handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: activeAudio.documentState.tracks.map((track) => ({ ...track, clips: track.clips.filter((clip) => !selectedAudioClipIds.includes(clip.id)) })) }); setSelectedAudioClipIds([]); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && selected) { event.preventDefault(); setAudioClipboard(selected); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v" && audioClipboard) { event.preventDefault(); const pasted = { ...audioClipboard, id: `clip-paste-${Date.now()}`, timelineStartMs: activeAudio.documentState.playheadMs, name: `${audioClipboard.name || "Clip"} (Colado)` }; handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: activeAudio.documentState.tracks.map((track) => track.id === pasted.trackId ? { ...track, clips: [...track.clips, pasted] } : track) }); setSelectedAudioClipIds([pasted.id]); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && selectedId) { event.preventDefault(); void audioService.duplicateClip(activeAudio.artifact.id, selectedId).then(() => { const ref = audioService.getAudio(activeAudio.artifact.id); if (ref) setActiveAudio(ref); }); }
      if (event.key.toLowerCase() === "s" && !event.ctrlKey && selected && activeAudio.documentState.playheadMs > selected.timelineStartMs && activeAudio.documentState.playheadMs < selected.timelineStartMs + selected.sourceEndMs - selected.sourceStartMs) { event.preventDefault(); void audioService.splitClip(activeAudio.artifact.id, selected.id, activeAudio.documentState.playheadMs).then(() => { const ref = audioService.getAudio(activeAudio.artifact.id); if (ref) setActiveAudio(ref); }); }
    };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeAudio, selectedAudioClipIds, audioClipboard, handleUpdateAudioDocumentState]);

  // --- Video Studio Handlers ---
  const handleUpdateVideoDocumentState = (newState: VideoDocumentState) => {
    if (!activeVideo) return;
    setActiveVideo((prev) => (prev ? { ...prev, documentState: newState } : null));
    setVideoSaveState("SAVING");

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await videoService.saveDocumentState(activeVideo.artifact.id, newState, "USER");
        if (res.success) {
          setVideoSaveState("SAVED");
          loadData();
        } else {
          setVideoSaveState("SAVE_FAILED");
        }
      } catch (err) {
        setVideoSaveState("SAVE_FAILED");
      }
    }, 800);
  };

  const handleSelectVideo = (vid: VideoItem) => {
    setActiveVideo(vid);
    setActiveStudio("VIDEO");
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/modules/studio?studio=VIDEO&id=${vid.artifact.id}`);
    }
  };

  const handleCreateNewVideo = async (
    templateId?: string,
    title?: string,
    customDimensions?: { width: number; height: number; durationMs?: number }
  ) => {
    const res = await videoService.createVideoProject({
      name: title || "Novo Projeto de Vídeo",
      templateId,
      customDimensions,
      actor: "USER",
    });

    if (res.success && res.video) {
      handleSelectVideo(res.video);
      loadData();
    }
  };

  const handlePlayVideo = () => {
    if (!activeVideo) return;
    setVideoPlaybackState("PLAYING");
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);

    playbackTimerRef.current = setInterval(() => {
      setActiveVideo((prev) => {
        if (!prev) return null;
        const newPlayhead = prev.documentState.playheadMs + 100;
        if (newPlayhead >= prev.documentState.timeline.durationMs) {
          if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
          setVideoPlaybackState("STOPPED");
          return {
            ...prev,
            documentState: { ...prev.documentState, playheadMs: 0 },
          };
        }
        return {
          ...prev,
          documentState: { ...prev.documentState, playheadMs: newPlayhead },
        };
      });
    }, 100);
  };

  const handlePauseVideo = () => {
    setVideoPlaybackState("PAUSED");
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
  };

  const handleStopVideo = () => {
    setVideoPlaybackState("STOPPED");
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    if (activeVideo) {
      setActiveVideo({
        ...activeVideo,
        documentState: { ...activeVideo.documentState, playheadMs: 0 },
      });
    }
  };

  // --- Game Studio Handlers ---
  const handleSelectGame = (game: GameItem) => {
    setActiveGame(game);
    setSelectedGameSceneId(game.documentState.entrySceneId);
    setActiveStudio("GAME");
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/modules/studio?studio=GAME&id=${game.artifact.id}`);
    }
  };

  const handleUpdateGameDocumentState = (newState: GameDocumentState) => {
    if (!activeGame) return;
    gameService.pushUndoState(activeGame.documentState);
    setActiveGame((prev: GameItem | null) => (prev ? { ...prev, documentState: newState } : null));
    setGameSaveState("SAVING");

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await gameService.saveDocumentState(activeGame.artifact.id, newState, "USER");
        if (res.success) {
          setGameSaveState("SAVED");
          loadData();
        } else {
          setGameSaveState("SAVE_FAILED");
        }
      } catch (err) {
        setGameSaveState("SAVE_FAILED");
      }
    }, 800);
  };

  const handleImportGameAudioPackage = () => {
    if (!activeGame) return;
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("O JSON excede o limite de importação de 10 MB.");
        const content: unknown = JSON.parse(await file.text());
        const localAssets = assetManager.getAllAssets().filter((asset) => asset.status !== "QUARANTINED" && asset.status !== "CORRUPTED");
        const parsed = parseGameAudioPackage(content, new Set(localAssets.map((asset) => asset.id)));
        if (!parsed.package) {
          setGameAudioImportMessage({ type: "error", text: `Importação bloqueada: ${parsed.issues.slice(0, 3).map((issue) => issue.message).join(" ")}` });
          return;
        }
        if (activeGame.documentState.gameAudioPackage && !confirm("Substituir o pacote Game Audio atualmente associado a este projeto?")) return;
        for (const asset of parsed.package.assets) await assetManager.linkAssetToArtifact(asset.assetId, activeGame.artifact.id);
        handleUpdateGameDocumentState({ ...activeGame.documentState, gameAudioPackage: parsed.package });
        setGameAudioImportMessage({ type: "success", text: `Pacote ${parsed.package.name} importado: ${parsed.package.assets.length} assets, ${parsed.package.events.length} eventos e ${parsed.package.variationGroups.length} grupos.` });
      } catch (error) {
        setGameAudioImportMessage({ type: "error", text: error instanceof Error ? `JSON inválido: ${error.message}` : "Não foi possível importar o pacote Game Audio." });
      }
    };
    input.click();
  };

  const handleImportGameAudioBundle = () => {
    if (!activeGame) return;
    const input = document.createElement("input"); input.type = "file"; input.accept = ".zip,application/zip";
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      try {
        if (file.size > 200 * 1024 * 1024) throw new Error("O Bundle excede o limite de importação de 200 MB.");
        const zip = await JSZip.loadAsync(file);
        const packageEntry = zip.file("game-audio.json");
        const manifestEntry = zip.file("manifest.json");
        if (!packageEntry || !manifestEntry) throw new Error("O Bundle precisa conter game-audio.json e manifest.json.");
        const packageContent: unknown = JSON.parse(await packageEntry.async("text"));
        const manifestContent: unknown = JSON.parse(await manifestEntry.async("text"));
        if (!manifestContent || typeof manifestContent !== "object" || !Array.isArray((manifestContent as { assets?: unknown }).assets)) throw new Error("Manifesto de Bundle inválido.");
        const manifest = (manifestContent as { version?: unknown; package?: unknown; assets: Array<{ assetId?: unknown; path?: unknown; sha256?: unknown; bytes?: unknown; mimeType?: unknown }> });
        if (manifest.version !== 1 || manifest.package !== "game-audio.json") throw new Error("Versão ou referência do manifesto não suportada.");
        const packageAssets = packageContent && typeof packageContent === "object" && Array.isArray((packageContent as { assets?: unknown }).assets) ? (packageContent as { assets: Array<{ assetId?: unknown; name?: unknown; mimeType?: unknown; sizeBytes?: unknown; durationMs?: unknown; category?: unknown; tags?: unknown[] }> }).assets : [];
        const remap = new Map<string, string>();
        for (const entry of manifest.assets) {
          if (typeof entry.assetId !== "string" || typeof entry.path !== "string" || typeof entry.sha256 !== "string" || !Number.isFinite(entry.bytes)) throw new Error("Manifesto contém uma entrada de asset inválida.");
          const zipped = zip.file(entry.path);
          if (!zipped) throw new Error(`Asset '${entry.assetId}' ausente no Bundle.`);
          const raw = await zipped.async("arraybuffer");
          if (raw.byteLength !== entry.bytes) throw new Error(`Tamanho divergente no asset '${entry.assetId}'.`);
          const digest = await crypto.subtle.digest("SHA-256", raw);
          const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
          if (hash !== entry.sha256) throw new Error(`Hash SHA-256 divergente no asset '${entry.assetId}'.`);
          const descriptor = packageAssets.find((asset) => asset.assetId === entry.assetId);
          const imported = await assetManager.registerAsset({ name: typeof descriptor?.name === "string" ? descriptor.name : entry.path.split("/").pop() || entry.assetId, mimeType: typeof entry.mimeType === "string" ? entry.mimeType : typeof descriptor?.mimeType === "string" ? descriptor.mimeType : "application/octet-stream", sizeBytes: raw.byteLength, artifactIds: [activeGame.artifact.id], metadata: { importedFromBundle: true, originalAssetId: entry.assetId, sha256: entry.sha256, durationMs: descriptor?.durationMs, category: descriptor?.category, tags: descriptor?.tags } }, new Blob([raw], { type: typeof entry.mimeType === "string" ? entry.mimeType : "application/octet-stream" }));
          remap.set(entry.assetId, imported.id);
        }
        const packageCopy = JSON.parse(JSON.stringify(packageContent)) as { assets: Array<Record<string, unknown>>; events: Array<Record<string, unknown>>; variationGroups: Array<{ variations: Array<Record<string, unknown>> }> };
        packageCopy.assets = packageCopy.assets.map((asset) => ({ ...asset, assetId: remap.get(String(asset.assetId)) || asset.assetId }));
        packageCopy.events = packageCopy.events.map((event) => ({ ...event, assetIds: Array.isArray(event.assetIds) ? event.assetIds.map((id) => remap.get(String(id)) || id) : event.assetIds }));
        packageCopy.variationGroups = packageCopy.variationGroups.map((group) => ({ ...group, variations: group.variations.map((variation) => ({ ...variation, assetId: remap.get(String(variation.assetId)) || variation.assetId })) }));
        const localAssets = assetManager.getAllAssets().filter((asset) => asset.status !== "QUARANTINED" && asset.status !== "CORRUPTED");
        const parsed = parseGameAudioPackage(packageCopy, new Set(localAssets.map((asset) => asset.id).concat([...remap.values()])));
        if (!parsed.package) { setGameAudioImportMessage({ type: "error", text: `Bundle bloqueado: ${parsed.issues.slice(0, 3).map((issue) => issue.message).join(" ")}` }); return; }
        if (activeGame.documentState.gameAudioPackage && !confirm("Substituir o pacote Game Audio atualmente associado a este projeto?")) return;
        for (const asset of parsed.package.assets) await assetManager.linkAssetToArtifact(asset.assetId, activeGame.artifact.id);
        handleUpdateGameDocumentState({ ...activeGame.documentState, gameAudioPackage: parsed.package });
        setGameAudioImportMessage({ type: "success", text: `Bundle ${parsed.package.name} importado com integridade verificada: ${parsed.package.assets.length} assets, ${parsed.package.events.length} eventos e ${parsed.package.variationGroups.length} grupos.` });
      } catch (error) {
        setGameAudioImportMessage({ type: "error", text: error instanceof Error ? `Bundle inválido: ${error.message}` : "Não foi possível importar o Bundle Game Audio." });
      }
    };
    input.click();
  };

  const handleCreateNewGame = async (templateId?: string, name?: string) => {
    const res = await gameService.createGameProject({
      name: name || "Novo Projeto de Jogo",
      templateId,
      actor: "USER",
    });

    if (res.success && res.game) {
      handleSelectGame(res.game);
      loadData();
    }
  };

  // -------------------------------------------------------------
  // NOT FOUND STATE (When an invalid ?id= is requested)
  // -------------------------------------------------------------
  if (notFoundArtifactId) {
    return (
      <PageLayout
        title="Artefato Não Encontrado"
        subtitle="O item solicitado não existe ou foi excluído"
      >
        <div className="max-w-xl mx-auto my-16 p-8 bg-[#0d0d16] border border-rose-500/20 rounded-2xl flex flex-col items-center text-center gap-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">Artefato não localizado</h2>
          <p className="text-sm text-slate-400">
            O artefato com identificador <code className="font-mono text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20">{notFoundArtifactId}</code> não foi encontrado no acervo local ou foi movido para a Lixeira.
          </p>
          <div className="pt-2">
            <button
              onClick={() => handleBackToHub()}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-violet-500/20 transition"
            >
              <ArrowLeft size={16} />
              Voltar ao Studio Hub
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // -------------------------------------------------------------
  // HUB VIEW (When no workspace is active)
  // -------------------------------------------------------------
  if (!activeDoc && !activeWebsite && !activeImage && !activeAudio && !activeVideo && !activeGame) {
    return (
      <PageLayout
        title="VARYNTH Studios"
        subtitle="Suíte criativa integrada sobre o Universal Artifact System"
      >
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
          {/* Studio Selector Tabs */}
          <div className="flex items-center gap-3 border-b border-[#1c1d32] pb-3 flex-wrap">
            <button
              onClick={() => handleSwitchStudioTab("DOCUMENT")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "DOCUMENT"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <FileText size={16} />
              Document Studio (Studio 1)
            </button>

            <button
              onClick={() => handleSwitchStudioTab("WEB")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "WEB"
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <Globe size={16} />
              Web Studio (Studio 2)
            </button>

            <button
              onClick={() => handleSwitchStudioTab("IMAGE")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "IMAGE"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <ImageIcon size={16} />
              Image Studio (Studio 3)
            </button>

            <button
              onClick={() => handleSwitchStudioTab("AUDIO")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "AUDIO"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <Music size={16} />
              Audio Studio (Studio 4)
            </button>

            <button
              onClick={() => handleSwitchStudioTab("VIDEO")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "VIDEO"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <Video size={16} />
              Video Studio (Studio 5)
            </button>

            <button
              onClick={() => handleSwitchStudioTab("GAME")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "GAME"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <Gamepad2 size={16} />
              Game Studio (Studio 6)
            </button>

            <button
              onClick={() => setIsOrchestrationModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 bg-gradient-to-r from-indigo-950/60 to-violet-950/60 hover:from-indigo-900/60 hover:to-violet-900/60 text-indigo-300 border border-indigo-500/30 ml-auto transition shadow-md shadow-indigo-500/10"
              title="Visualizar e coordenar planos criativos acíclicos através dos 6 Studios"
            >
              <Network size={15} className="text-indigo-400" />
              Orquestração Multi-Estúdio
            </button>
          </div>

          {/* DOCUMENT STUDIO HUB */}
          {activeStudio === "DOCUMENT" && (
            <>
              <div className="p-6 bg-gradient-to-r from-blue-950/40 via-[#10132a] to-[#0c0d18] border border-blue-500/20 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-blue-400" size={22} />
                    Document Studio
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl">
                    Crie e versione monografias, pareceres, artigos acadêmicos e roteiros de cena com assistência da Athena e exportação em Markdown, HTML e PDF.
                  </p>
                </div>
                <button
                  onClick={() => setIsDocTemplateOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
                >
                  <Plus size={16} />
                  Novo Documento
                </button>
              </div>

              {/* Recent Documents Grid */}
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-base text-white flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-400" />
                  Documentos Recentes ({allDocs.length})
                </h3>

                {allDocs.length === 0 ? (
                  <div className="p-12 text-center bg-[#0d0d16] border border-[#1e1e30] rounded-xl flex flex-col items-center gap-3">
                    <FileText size={36} className="text-slate-600" />
                    <p className="text-sm text-slate-400">Nenhum documento criado ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allDocs.map((doc) => (
                      <div
                        key={doc.artifact.id}
                        onClick={() => handleSelectDocument(doc)}
                        className="p-5 bg-[#0e0e18] hover:bg-[#131322] border border-[#1e1e30] hover:border-blue-500/40 rounded-xl cursor-pointer transition flex flex-col justify-between gap-4 group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              {doc.metadata.documentType || "DOCUMENT"}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              v{doc.artifact.versions?.length || 1}.0
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white mt-3 group-hover:text-blue-300 transition line-clamp-1">
                            {doc.artifact.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {doc.artifact.description || doc.content.slice(0, 100)}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#1a1a2a] flex items-center justify-between text-xs text-slate-500">
                          <span>{doc.metadata.wordCount || 0} palavras</span>
                          <span className="flex items-center gap-1 text-blue-400 group-hover:translate-x-1 transition">
                            Abrir <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* WEB STUDIO HUB */}
          {activeStudio === "WEB" && (
            <>
              <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-[#101e28] to-[#0c0d18] border border-emerald-500/20 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Globe className="text-emerald-400" size={22} />
                    Web Studio
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl">
                    Desenvolva, compile em Sandbox isolado e visualize aplicações web completas com proteção total do Core e assistência de código da Athena.
                  </p>
                </div>
                <button
                  onClick={() => setIsWebTemplateOpen(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  <Plus size={16} />
                  Novo Website
                </button>
              </div>

              {/* Recent Websites Grid */}
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-base text-white flex items-center gap-2">
                  <Globe size={18} className="text-emerald-400" />
                  Websites no Ecossistema ({allWebsites.length})
                </h3>

                {allWebsites.length === 0 ? (
                  <div className="p-12 text-center bg-[#0d0d16] border border-[#1e1e30] rounded-xl flex flex-col items-center gap-3">
                    <Globe size={36} className="text-slate-600" />
                    <p className="text-sm text-slate-400">Nenhum website criado ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allWebsites.map((ws) => (
                      <div
                        key={ws.artifact.id}
                        onClick={() => handleSelectWebsite(ws)}
                        className="p-5 bg-[#0e0e18] hover:bg-[#111622] border border-[#1e1e30] hover:border-emerald-500/40 rounded-xl cursor-pointer transition flex flex-col justify-between gap-4 group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {ws.metadata.framework || "STATIC"}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              v{ws.artifact.versions?.length || 1}.0
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white mt-3 group-hover:text-emerald-300 transition line-clamp-1">
                            {ws.artifact.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {ws.artifact.description || `${ws.files.length} arquivos fonte`}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#1a1a2a] flex items-center justify-between text-xs text-slate-500">
                          <span>{ws.files.length} arquivos</span>
                          <span className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition">
                            Abrir Web Studio <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* IMAGE STUDIO HUB */}
          {activeStudio === "IMAGE" && (
            <>
              <div className="p-6 bg-gradient-to-r from-purple-950/40 via-[#1a1028] to-[#0c0d18] border border-purple-500/20 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ImageIcon className="text-purple-400" size={22} />
                    Image Studio
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl">
                    Componha cards, capas, thumbnails e artes visuais com edição não-destrutiva de camadas, filtros determinísticos e exportação de alta fidelidade.
                  </p>
                </div>
                <button
                  onClick={() => setIsImageTemplateOpen(true)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition"
                >
                  <Plus size={16} />
                  Nova Imagem
                </button>
              </div>

              {/* Recent Images Grid */}
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-base text-white flex items-center gap-2">
                  <ImageIcon size={18} className="text-purple-400" />
                  Composições no Ecossistema ({allImages.length})
                </h3>

                {allImages.length === 0 ? (
                  <div className="p-12 text-center bg-[#0d0d16] border border-[#1e1e30] rounded-xl flex flex-col items-center gap-3">
                    <ImageIcon size={36} className="text-slate-600" />
                    <p className="text-sm text-slate-400">Nenhuma imagem criada ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allImages.map((img) => (
                      <div
                        key={img.artifact.id}
                        onClick={() => handleSelectImage(img)}
                        className="p-5 bg-[#0e0e18] hover:bg-[#151022] border border-[#1e1e30] hover:border-purple-500/40 rounded-xl cursor-pointer transition flex flex-col justify-between gap-4 group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              {img.metadata.documentMode || "COMPOSITE"}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              v{img.artifact.versions?.length || 1}.0
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white mt-3 group-hover:text-purple-300 transition line-clamp-1">
                            {img.artifact.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {img.artifact.description || `${img.documentState.layers.length} camadas`}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#1a1a2a] flex items-center justify-between text-xs text-slate-500">
                          <span className="font-mono">
                            {img.documentState.canvas.width} × {img.documentState.canvas.height}
                          </span>
                          <span className="flex items-center gap-1 text-purple-400 group-hover:translate-x-1 transition">
                            Abrir Image Studio <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* AUDIO STUDIO HUB */}
          {activeStudio === "AUDIO" && (
            <>
              <div className="p-6 bg-gradient-to-r from-amber-950/40 via-[#1e1410] to-[#0c0d18] border border-amber-500/20 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Music className="text-amber-400" size={22} />
                    Audio Studio
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl">
                    Linha do tempo multipistas com waveforms, cortes não-destrutivos, fades, mixagem offline e exportação em WAV PCM 16-bit com soberania Local-First.
                  </p>
                </div>
                <button
                  onClick={() => setIsAudioTemplateOpen(true)}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
                >
                  <Plus size={16} />
                  Novo Projeto de Áudio
                </button>
              </div>

              {/* Recent Audio Projects Grid */}
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-base text-white flex items-center gap-2">
                  <Music size={18} className="text-amber-400" />
                  Projetos de Áudio no Ecossistema ({allAudios.length})
                </h3>

                {allAudios.length === 0 ? (
                  <div className="p-12 text-center bg-[#0d0d16] border border-[#1e1e30] rounded-xl flex flex-col items-center gap-3">
                    <Music size={36} className="text-slate-600" />
                    <p className="text-sm text-slate-400">Nenhum projeto de áudio criado ainda.</p>
                    <button
                      onClick={() => setIsAudioTemplateOpen(true)}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium"
                    >
                      Criar Primeiro Áudio
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allAudios.map((aud) => (
                      <div
                        key={aud.artifact.id}
                        onClick={() => handleSelectAudio(aud)}
                        className="p-5 bg-[#0e0e18] hover:bg-[#1a1410] border border-[#1e1e30] hover:border-amber-500/40 rounded-xl cursor-pointer transition flex flex-col justify-between gap-4 group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {aud.metadata.documentMode || "MULTITRACK"}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              v{aud.artifact.versions?.length || 1}.0
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white mt-3 group-hover:text-amber-300 transition line-clamp-1">
                            {aud.artifact.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {aud.artifact.description || `${aud.documentState.tracks.length} faixas de áudio`}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#1a1a2a] flex items-center justify-between text-xs text-slate-500">
                          <span className="font-mono">
                            {Math.round(aud.documentState.timeline.durationMs / 1000)}s ({aud.documentState.tracks.length} faixas)
                          </span>
                          <span className="flex items-center gap-1 text-amber-400 group-hover:translate-x-1 transition">
                            Abrir Audio Studio <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* VIDEO STUDIO HUB */}
          {activeStudio === "VIDEO" && (
            <>
              <div className="p-6 bg-gradient-to-r from-blue-950/40 via-[#10132a] to-[#0c0d18] border border-blue-500/20 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Video className="text-blue-400" size={22} />
                    Video Studio
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl">
                    Edite e componha vídeos com linha do tempo multipistas, integração de cenas semânticas, legendas, títulos, transições e renderização local determinística.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsVideoTemplateOpen(true)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
                  >
                    <Plus size={16} />
                    Novo Vídeo
                  </button>
                </div>
              </div>

              {/* Recent Videos Grid */}
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-base text-white flex items-center gap-2">
                  <Film size={18} className="text-blue-400" />
                  Projetos de Vídeo ({allVideos.length})
                </h3>

                {allVideos.length === 0 ? (
                  <div className="p-12 border border-dashed border-[#202236] rounded-2xl flex flex-col items-center justify-center text-center bg-[#0d0e1a]">
                    <Video size={40} className="text-slate-600 mb-3" />
                    <h4 className="font-bold text-slate-300">Nenhum projeto de vídeo criado</h4>
                    <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                      Inicie um novo vídeo a partir de templates como Paisagem (16:9), Vertical (9:16) ou Slideshow Narrado.
                    </p>
                    <button
                      onClick={() => setIsVideoTemplateOpen(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20"
                    >
                      <Plus size={14} /> Criar Primeiro Vídeo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allVideos.map((vid) => (
                      <div
                        key={vid.artifact.id}
                        onClick={() => setActiveVideo(vid)}
                        className="p-5 bg-[#0e0e18] hover:bg-[#101426] border border-[#1e1e30] hover:border-blue-500/40 rounded-xl cursor-pointer transition flex flex-col justify-between gap-4 group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              {vid.documentState.timeline.width}×{vid.documentState.timeline.height}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              v{vid.artifact.versions?.length || 1}.0
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white mt-3 group-hover:text-blue-300 transition line-clamp-1">
                            {vid.artifact.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {vid.artifact.description || `${vid.documentState.tracks.length} faixas | ${vid.documentState.scenes.length} cenas`}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#1a1a2a] flex items-center justify-between text-xs text-slate-500">
                          <span className="font-mono">
                            {Math.round(vid.documentState.timeline.durationMs / 1000)}s ({vid.documentState.scenes.length} cenas)
                          </span>
                          <span className="flex items-center gap-1 text-blue-400 group-hover:translate-x-1 transition">
                            Abrir Video Studio <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* GAME STUDIO HUB */}
          {activeStudio === "GAME" && (
            <>
              <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-[#10132a] to-[#0c0d18] border border-emerald-500/20 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Gamepad2 className="text-emerald-400" size={22} />
                    Game Studio
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl">
                    Crie protótipos de jogos 2D, quizzes, histórias interativas e mecânicas declarativas com execução em Sandbox e compilação Web (HTML5).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsGameTemplateOpen(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                  >
                    <Plus size={16} />
                    Novo Jogo
                  </button>
                </div>
              </div>

              {/* Recent Games Grid */}
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-base text-white flex items-center gap-2">
                  <Gamepad2 size={18} className="text-emerald-400" />
                  Projetos de Jogo ({allGames.length})
                </h3>

                {allGames.length === 0 ? (
                  <div className="p-12 border border-dashed border-[#202236] rounded-2xl flex flex-col items-center justify-center text-center bg-[#0d0e1a]">
                    <Gamepad2 size={40} className="text-slate-600 mb-3" />
                    <h4 className="font-bold text-slate-300">Nenhum projeto de jogo criado</h4>
                    <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                      Inicie um novo jogo a partir de templates como Protótipo 2D, Quiz Interativo ou Investigação Criminal.
                    </p>
                    <button
                      onClick={() => setIsGameTemplateOpen(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-emerald-500/20"
                    >
                      <Plus size={14} /> Criar Primeiro Jogo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allGames.map((game) => (
                      <div
                        key={game.artifact.id}
                        onClick={() => {
                          setActiveGame(game);
                          setSelectedGameSceneId(game.documentState.entrySceneId);
                        }}
                        className="p-5 bg-[#0e0e18] hover:bg-[#0e161c] border border-[#1e1e30] hover:border-emerald-500/40 rounded-xl cursor-pointer transition flex flex-col justify-between gap-4 group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {game.metadata.gameType}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              v{game.artifact.versions?.length || 1}.0
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white mt-3 group-hover:text-emerald-300 transition line-clamp-1">
                            {game.artifact.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {game.artifact.description || `${game.documentState.scenes.length} cenas | ${game.documentState.entities.length} entidades`}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#1a1a2a] flex items-center justify-between text-xs text-slate-500">
                          <span className="font-mono">
                            {game.documentState.scenes.length} cenas ({game.documentState.rules.length} regras)
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition">
                            Abrir Game Studio <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DocumentTemplatesModal
          isOpen={isDocTemplateOpen}
          onClose={() => setIsDocTemplateOpen(false)}
          onSelectTemplate={handleCreateNewDocument}
        />

        <WebTemplatesModal
          isOpen={isWebTemplateOpen}
          onClose={() => setIsWebTemplateOpen(false)}
          onSelectTemplate={handleCreateNewWebsite}
        />

        <ImageTemplatesModal
          isOpen={isImageTemplateOpen}
          onClose={() => setIsImageTemplateOpen(false)}
          onSelectTemplate={handleCreateNewImage}
        />

        <AudioTemplatesModal
          isOpen={isAudioTemplateOpen}
          onClose={() => setIsAudioTemplateOpen(false)}
          onSelectTemplate={handleCreateNewAudio}
        />

        <VideoTemplatesModal
          isOpen={isVideoTemplateOpen}
          onClose={() => setIsVideoTemplateOpen(false)}
          onSelectTemplate={handleCreateNewVideo}
        />

        <GameTemplatesModal
          isOpen={isGameTemplateOpen}
          onClose={() => setIsGameTemplateOpen(false)}
          onSelectTemplate={handleCreateNewGame}
        />

        <CreativeOrchestrationModal
          isOpen={isOrchestrationModalOpen}
          planId={orchestrationPlanId}
          onClose={() => setIsOrchestrationModalOpen(false)}
        />
      </PageLayout>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE GAME STUDIO WORKSPACE
  // -------------------------------------------------------------
  if (activeGame) {
    const currentScene = activeGame.documentState.scenes.find((s: GameScene) => s.id === (selectedGameSceneId || activeGame.documentState.entrySceneId)) || activeGame.documentState.scenes[0];
    const selectedEntity = activeGame.documentState.entities.find((e: GameEntity) => e.id === selectedGameEntityId);

    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <StudioShell
          title={activeGame.artifact.name}
          subtitle={`Game Studio (${activeGame.metadata.gameType} - ${activeGame.documentState.scenes.length} cenas, ${activeGame.documentState.entities.length} entidades)`}
          saveState={gameSaveState}
          viewMode="SPLIT"
          onViewModeChange={() => {}}
          activeSidebarTab={gameSidebarTab}
          onSidebarTabChange={setGameSidebarTab}
          onBackToHub={() => handleBackToHub("GAME")}
          onCreateVersion={async () => {
            const label =
              prompt(
                "Descrição da nova versão do jogo:",
                `Versão manual v${(activeGame.artifact.versions?.length || 0) + 1}`
              ) || "Versão manual";
            const res = await gameService.createManualVersion(activeGame.artifact.id, label, "USER");
            if (res.success) {
              const ref = gameService.getGame(activeGame.artifact.id);
              if (ref) setActiveGame(ref);
            }
          }}
          onExport={() => setIsGameBuildOpen(true)}
          onDelete={() => {
            if (confirm("Mover este projeto de jogo para a Lixeira de 10 dias?")) {
              gameService.saveDocumentState(activeGame.artifact.id, activeGame.documentState, "USER");
              setActiveGame(null);
              loadData();
            }
          }}
          sidebarContent={
            gameSidebarTab === "OUTLINE" ? (
              <GameEntityHierarchy
                scenes={activeGame.documentState.scenes}
                entities={activeGame.documentState.entities}
                activeSceneId={currentScene?.id}
                selectedEntityId={selectedGameEntityId}
                onSelectScene={(sceneId) => setSelectedGameSceneId(sceneId)}
                onSelectEntity={(entId) => setSelectedGameEntityId(entId)}
                onAddScene={() => {
                  const newScene = athenaGameActions.createScene(`Cena ${activeGame.documentState.scenes.length + 1}`);
                  handleUpdateGameDocumentState({
                    ...activeGame.documentState,
                    scenes: [...activeGame.documentState.scenes, newScene],
                  });
                }}
                onAddEntity={(sceneId) => {
                  const newEnt = athenaGameActions.createEntity(
                    sceneId,
                    `Entidade ${activeGame.documentState.entities.length + 1}`,
                    [
                      { type: "TRANSFORM", x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 1 },
                      { type: "SPRITE", assetId: "default-sprite", width: 48, height: 48 },
                    ]
                  );
                  handleUpdateGameDocumentState({
                    ...activeGame.documentState,
                    entities: [...activeGame.documentState.entities, newEnt],
                  });
                  setSelectedGameEntityId(newEnt.id);
                }}
                onDeleteEntity={(entId) => {
                  handleUpdateGameDocumentState({
                    ...activeGame.documentState,
                    entities: activeGame.documentState.entities.filter((e: GameEntity) => e.id !== entId),
                  });
                  if (selectedGameEntityId === entId) setSelectedGameEntityId(undefined);
                }}
                onToggleEntityActive={(entId) => {
                  const updated = activeGame.documentState.entities.map((e: GameEntity) =>
                    e.id === entId ? { ...e, active: !e.active } : e
                  );
                  handleUpdateGameDocumentState({ ...activeGame.documentState, entities: updated });
                }}
                onDuplicateEntity={(entId) => {
                  const source = activeGame.documentState.entities.find((entity: GameEntity) => entity.id === entId);
                  if (!source) return;
                  const copy = JSON.parse(JSON.stringify(source)) as GameEntity;
                  copy.id = `entity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                  copy.name = `${source.name} (Cópia)`;
                  copy.parentEntityId = undefined;
                  copy.components = copy.components.map((component: GameComponent) => component.type === "TRANSFORM" ? { ...component, x: component.x + 32, y: component.y + 32 } : component);
                  handleUpdateGameDocumentState({ ...activeGame.documentState, entities: [...activeGame.documentState.entities, copy], selectedEntityIds: [copy.id] });
                  setSelectedGameEntityId(copy.id);
                }}
                entrySceneId={activeGame.documentState.entrySceneId}
                onRenameScene={(sceneId, name) => handleUpdateGameDocumentState({ ...activeGame.documentState, scenes: activeGame.documentState.scenes.map((scene: GameScene) => scene.id === sceneId ? { ...scene, name } : scene) })}
                onDuplicateScene={(sceneId) => {
                  const source = activeGame.documentState.scenes.find((scene: GameScene) => scene.id === sceneId);
                  if (!source) return;
                  const nextSceneId = `scene-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                  const entities = activeGame.documentState.entities.filter((entity: GameEntity) => entity.sceneId === sceneId).map((entity: GameEntity) => ({ ...JSON.parse(JSON.stringify(entity)), id: `entity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sceneId: nextSceneId, parentEntityId: undefined }));
                  const scene = { ...JSON.parse(JSON.stringify(source)), id: nextSceneId, name: `${source.name} (Cópia)`, entityIds: entities.map((entity: GameEntity) => entity.id), ruleIds: [] };
                  handleUpdateGameDocumentState({ ...activeGame.documentState, scenes: [...activeGame.documentState.scenes, scene], entities: [...activeGame.documentState.entities, ...entities] });
                  setSelectedGameSceneId(nextSceneId);
                }}
                onDeleteScene={(sceneId) => {
                  const removedEntityIds = new Set(activeGame.documentState.entities.filter((entity: GameEntity) => entity.sceneId === sceneId).map((entity: GameEntity) => entity.id));
                  handleUpdateGameDocumentState({
                    ...activeGame.documentState,
                    scenes: activeGame.documentState.scenes.filter((scene: GameScene) => scene.id !== sceneId).map((scene: GameScene) => ({ ...scene, nextSceneIds: scene.nextSceneIds?.filter((nextSceneId) => nextSceneId !== sceneId) })),
                    entities: activeGame.documentState.entities.filter((entity: GameEntity) => entity.sceneId !== sceneId),
                    rules: activeGame.documentState.rules.filter((rule: GameRule) => !removedEntityIds.has(rule.trigger.entityId || "") && !removedEntityIds.has(rule.trigger.targetEntityId || "") && !rule.actions.some((action) => removedEntityIds.has(action.entityId || ""))),
                  });
                  setSelectedGameSceneId(activeGame.documentState.entrySceneId);
                  setSelectedGameEntityId(undefined);
                }}
              />
            ) : gameSidebarTab === "VERSIONS" ? (
              <DocumentVersionHistory
                versions={activeGame.artifact.versions || []}
                currentVersionNumber={`v${activeGame.artifact.versions?.length || 1}.0`}
                onRestoreVersion={async (vNum) => {
                  const res = await gameService.restoreVersion(activeGame.artifact.id, parseInt(vNum) || 1, "USER");
                  if (res.success && res.game) {
                    setActiveGame(res.game);
                  }
                }}
              />
            ) : gameSidebarTab === "ASSETS" ? (
              <StudioAssetPanel
                artifact={activeGame.artifact}
                onUpdateArtifact={(updated) => {
                  const ref = gameService.getGame(updated.id);
                  if (ref) setActiveGame(ref);
                  loadData();
                }}
              />
            ) : gameSidebarTab === "RELATIONS" ? (
              <StudioRelationsPanel
                artifact={activeGame.artifact}
                onUpdateArtifact={(updated) => {
                  const ref = gameService.getGame(updated.id);
                  if (ref) setActiveGame(ref);
                  loadData();
                }}
              />
            ) : gameSidebarTab === "ATHENA" ? (
              <div className="p-4 flex flex-col h-full text-xs text-slate-300 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-white pb-2 border-b border-[#1c1d30]">
                  <Sparkles size={14} className="text-amber-400" />
                  Athena Game Assistant
                </div>
                <p className="text-slate-400 text-[11px]">
                  Athena orquestra planos de design de jogos (GDD), geração de cenas, entidades, regras determinísticas e variáveis de estado.
                </p>
                {gameService.getPendingChangeSets(activeGame.artifact.id).length > 0 && (
                  <button
                    onClick={() => setIsGameChangeSetOpen(true)}
                    className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
                  >
                    Ver Proposta de Jogo da Athena
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 text-xs text-slate-500 italic">Nenhum painel selecionado.</div>
            )
          }
          mainContent={
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Game Top Action Bar */}
              <div className="p-2.5 bg-[#0f1020] border-b border-[#1c1d32] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsGamePlayOpen(true)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition"
                  >
                    <Play size={14} className="fill-white" /> Play Mode (Sandbox)
                  </button>
                  <button
                    onClick={() => setIsGameBuildOpen(true)}
                    className="px-3.5 py-1.5 bg-[#1a1b32] hover:bg-[#252748] text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition"
                  >
                    Compilar & Exportar
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleImportGameAudioPackage} className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold">Importar Game Audio</button><button type="button" onClick={handleImportGameAudioBundle} className="px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-semibold">Importar Bundle</button>
                  <button
                    onClick={() => setGameSidebarTab("ATHENA")}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Sparkles size={13} /> Assistência Athena
                  </button>
                </div>
              </div>
              {gameAudioImportMessage && <p role={gameAudioImportMessage.type === "error" ? "alert" : "status"} className={`px-3 py-1 text-[10px] ${gameAudioImportMessage.type === "error" ? "text-rose-300 bg-rose-950/20" : "text-emerald-300 bg-emerald-950/20"}`}>{gameAudioImportMessage.text}</p>}
              {activeGame.documentState.gameAudioPackage && <p className="px-3 py-1 text-[10px] text-cyan-200 bg-cyan-950/20" role="status">Game Audio ativo: {activeGame.documentState.gameAudioPackage.assets.length} assets · {activeGame.documentState.gameAudioPackage.events.length} eventos · {activeGame.documentState.gameAudioPackage.variationGroups.length} grupos</p>}

              {/* Upper Section: Canvas Viewport + Entity Inspector */}
              <div className="flex-1 flex overflow-hidden border-b border-[#1c1d32]">
                <div className="flex-1 h-full overflow-hidden">
                  <GameSceneCanvas
                    documentState={activeGame.documentState}
                    activeScene={currentScene}
                    selectedEntityId={selectedGameEntityId}
                    onSelectEntity={(entId) => setSelectedGameEntityId(entId)}
                    onUpdateEntityTransform={(entId, x, y) => {
                      const updated = activeGame.documentState.entities.map((e: GameEntity) => {
                        if (e.id === entId) {
                          const comps = e.components.map((c: GameComponent) =>
                            c.type === "TRANSFORM" ? { ...c, x, y } : c
                          );
                          return { ...e, components: comps };
                        }
                        return e;
                      });
                      handleUpdateGameDocumentState({ ...activeGame.documentState, entities: updated });
                    }}
                  />
                </div>

                <div className="w-80 h-full border-l border-[#1c1d32] overflow-hidden">
                  <GameInspector
                    selectedEntity={selectedEntity}
                    entities={activeGame.documentState.entities}
                    onUpdateEntity={(entId, updates) => {
                      const updated = activeGame.documentState.entities.map((e: GameEntity) =>
                        e.id === entId ? { ...e, ...updates } : e
                      );
                      handleUpdateGameDocumentState({ ...activeGame.documentState, entities: updated });
                    }}
                    onAddComponent={(entId, component) => {
                      const updated = activeGame.documentState.entities.map((e: GameEntity) =>
                        e.id === entId ? { ...e, components: [...e.components, component] } : e
                      );
                      handleUpdateGameDocumentState({ ...activeGame.documentState, entities: updated });
                    }}
                    onRemoveComponent={(entId, compType) => {
                      const updated = activeGame.documentState.entities.map((e: GameEntity) =>
                        e.id === entId
                          ? { ...e, components: e.components.filter((c: GameComponent) => c.type !== compType) }
                          : e
                      );
                      handleUpdateGameDocumentState({ ...activeGame.documentState, entities: updated });
                    }}
                  />
                </div>
              </div>

              {/* Lower Section: Declarative Rules & Variables Panel */}
              <div className="h-64 flex flex-col overflow-hidden">
                <GameRulesPanel
                  rules={activeGame.documentState.rules}
                  audioEvents={activeGame.documentState.gameAudioPackage?.events || []}
                  variables={activeGame.documentState.variables}
                  inputActions={activeGame.documentState.inputActions}
                  entities={activeGame.documentState.entities}
                  scenes={activeGame.documentState.scenes}
                  canUndo={true}
                  canRedo={true}
                  onUndo={() => {
                    const prev = gameService.undo(activeGame.artifact.id);
                    if (prev) {
                      setActiveGame({ ...activeGame, documentState: prev });
                      loadData();
                    }
                  }}
                  onRedo={() => {
                    const next = gameService.redo(activeGame.artifact.id);
                    if (next) {
                      setActiveGame({ ...activeGame, documentState: next });
                      loadData();
                    }
                  }}
                  onAddRule={() => {
                    const newRule = athenaGameActions.createRule(
                      `Regra ${activeGame.documentState.rules.length + 1}`,
                      { type: "ON_START" },
                      [],
                      [{ type: "SHOW_TEXT", text: "Executando ação inicial." }]
                    );
                    handleUpdateGameDocumentState({
                      ...activeGame.documentState,
                      rules: [...activeGame.documentState.rules, newRule],
                    });
                  }}
                  onToggleRule={(ruleId) => {
                    const updated = activeGame.documentState.rules.map((r: GameRule) =>
                      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
                    );
                    handleUpdateGameDocumentState({ ...activeGame.documentState, rules: updated });
                  }}
                  onDeleteRule={(ruleId) => {
                    handleUpdateGameDocumentState({
                      ...activeGame.documentState,
                      rules: activeGame.documentState.rules.filter((r: GameRule) => r.id !== ruleId),
                    });
                  }}
                  onUpdateRule={(ruleId, updates) => {
                    handleUpdateGameDocumentState({
                      ...activeGame.documentState,
                      rules: activeGame.documentState.rules.map((rule: GameRule) => rule.id === ruleId ? { ...rule, ...updates } : rule),
                    });
                  }}
                  onAddVariable={(name, type, initialValue) => {
                    const newVar = athenaGameActions.createVariable(name, type, initialValue);
                    handleUpdateGameDocumentState({
                      ...activeGame.documentState,
                      variables: [...activeGame.documentState.variables, newVar],
                    });
                  }}
                  onDeleteVariable={(varId) => {
                    handleUpdateGameDocumentState({
                      ...activeGame.documentState,
                      variables: activeGame.documentState.variables.filter((v: GameVariable) => v.id !== varId),
                    });
                  }}
                  onOpenAthena={() => setGameSidebarTab("ATHENA")}
                  onAddInputAction={(action, keys) => handleUpdateGameDocumentState({ ...activeGame.documentState, inputActions: [...activeGame.documentState.inputActions.filter((mapping) => mapping.action !== action), { action, keys }] })}
                  onDeleteInputAction={(action) => handleUpdateGameDocumentState({ ...activeGame.documentState, inputActions: activeGame.documentState.inputActions.filter((mapping) => mapping.action !== action) })}
                />
              </div>
            </div>
          }
        />

        <GamePlayModal
          isOpen={isGamePlayOpen}
          documentState={activeGame.documentState}
          onClose={() => setIsGamePlayOpen(false)}
        />

        <GameBuildModal
          isOpen={isGameBuildOpen}
          documentState={activeGame.documentState}
          gameTitle={activeGame.artifact.name}
          onClose={() => setIsGameBuildOpen(false)}
        />

        <GameChangeSetModal
          isOpen={isGameChangeSetOpen}
          changeSets={gameService.getPendingChangeSets(activeGame.artifact.id)}
          onAccept={async (csId) => {
            await gameService.acceptChangeSet(activeGame.artifact.id, csId);
            setIsGameChangeSetOpen(false);
            const ref = gameService.getGame(activeGame.artifact.id);
            if (ref) setActiveGame(ref);
          }}
          onReject={(csId) => {
            gameService.rejectChangeSet(activeGame.artifact.id, csId);
            setIsGameChangeSetOpen(false);
          }}
          onClose={() => setIsGameChangeSetOpen(false)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE VIDEO STUDIO WORKSPACE
  // -------------------------------------------------------------
  if (activeVideo) {
    const selectedTrack = activeVideo.documentState.tracks.find((t) => t.id === selectedVideoTrackId);
    let selectedClip: VideoClipType | undefined = undefined;
    if (selectedVideoClipIds.length > 0) {
      for (const t of activeVideo.documentState.tracks) {
        const c = t.clips.find((clip) => clip.id === selectedVideoClipIds[0]);
        if (c) {
          selectedClip = c;
          break;
        }
      }
    }
    const selectedScene = activeVideo.documentState.scenes.find((s) => s.id === selectedVideoSceneId);

    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <StudioShell
          title={activeVideo.artifact.name}
          subtitle={`Video Studio (${activeVideo.documentState.timeline.width}x${activeVideo.documentState.timeline.height} @ ${Math.round(activeVideo.documentState.timeline.frameRate.numerator / activeVideo.documentState.timeline.frameRate.denominator)}fps)`}
          saveState={videoSaveState}
          viewMode="SPLIT"
          onViewModeChange={() => {}}
          activeSidebarTab={videoSidebarTab}
          onSidebarTabChange={setVideoSidebarTab}
          onBackToHub={() => handleBackToHub("VIDEO")}
          onCreateVersion={async () => {
            const label =
              prompt(
                "Descrição da nova versão do vídeo:",
                `Versão manual v${(activeVideo.artifact.versions?.length || 0) + 1}`
              ) || "Versão manual";
            const res = await videoService.createManualVersion(activeVideo.artifact.id, label, "USER");
            if (res.success) {
              const ref = videoService.getVideo(activeVideo.artifact.id);
              if (ref) setActiveVideo(ref);
            }
          }}
          onExport={() => setIsVideoExportOpen(true)}
          onDelete={() => {
            if (confirm("Mover este projeto de vídeo para a Lixeira de 10 dias?")) {
              videoService.saveDocumentState(activeVideo.artifact.id, activeVideo.documentState, "USER");
              setActiveVideo(null);
              loadData();
            }
          }}
          sidebarContent={
            videoSidebarTab === "OUTLINE" ? (
              <VideoScenePanel
                scenes={activeVideo.documentState.scenes}
                selectedSceneId={selectedVideoSceneId}
                isStoryboardMode={isStoryboardMode}
                onToggleStoryboard={() => setIsStoryboardMode(!isStoryboardMode)}
                onSelectScene={(sceneId) => {
                  setSelectedVideoSceneId(sceneId);
                  const sc = activeVideo.documentState.scenes.find((s) => s.id === sceneId);
                  if (sc) {
                    setActiveVideo({
                      ...activeVideo,
                      documentState: { ...activeVideo.documentState, playheadMs: sc.startMs },
                    });
                  }
                }}
                onAddScene={() => {
                  const duration = 10000;
                  const lastScene = activeVideo.documentState.scenes[activeVideo.documentState.scenes.length - 1];
                  const startMs = lastScene ? lastScene.endMs : 0;
                  const endMs = startMs + duration;
                  const newScene = athenaVideoActions.createScene(
                    `Cena ${activeVideo.documentState.scenes.length + 1}`,
                    startMs,
                    endMs
                  );
                  handleUpdateVideoDocumentState({
                    ...activeVideo.documentState,
                    scenes: [...activeVideo.documentState.scenes, newScene],
                    timeline: {
                      ...activeVideo.documentState.timeline,
                      durationMs: Math.max(activeVideo.documentState.timeline.durationMs, endMs),
                    },
                  });
                }}
              />
            ) : videoSidebarTab === "VERSIONS" ? (
              <DocumentVersionHistory
                versions={activeVideo.artifact.versions || []}
                currentVersionNumber={`v${activeVideo.artifact.versions?.length || 1}.0`}
                onRestoreVersion={async (vNum) => {
                  const res = await videoService.restoreVersion(activeVideo.artifact.id, parseInt(vNum) || 1, "USER");
                  if (res.success && res.video) {
                    setActiveVideo(res.video);
                  }
                }}
              />
            ) : videoSidebarTab === "ASSETS" ? (
              <StudioAssetPanel
                artifact={activeVideo.artifact}
                onUpdateArtifact={(updated) => {
                  const ref = videoService.getVideo(updated.id);
                  if (ref) setActiveVideo(ref);
                  loadData();
                }}
              />
            ) : videoSidebarTab === "RELATIONS" ? (
              <StudioRelationsPanel
                artifact={activeVideo.artifact}
                onUpdateArtifact={(updated) => {
                  const ref = videoService.getVideo(updated.id);
                  if (ref) setActiveVideo(ref);
                  loadData();
                }}
              />
            ) : videoSidebarTab === "ATHENA" ? (
              <div className="p-4 flex flex-col h-full text-xs text-slate-300 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-white pb-2 border-b border-[#1c1d30]">
                  <Sparkles size={14} className="text-amber-400" />
                  Athena Video Assistant
                </div>
                <p className="text-slate-400 text-[11px]">
                  Athena orquestra planos de montagem audiovisual, cortes temporais de clips e legendas sincronizadas.
                </p>
                {videoService.getPendingChangeSets(activeVideo.artifact.id).length > 0 && (
                  <button
                    onClick={() => setIsVideoChangeSetOpen(true)}
                    className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
                  >
                    Ver Proposta Audiovisual
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 text-xs text-slate-500 italic">Nenhum painel selecionado.</div>
            )
          }
          mainContent={
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Transport Controls */}
              <VideoTransportControls
                playbackState={videoPlaybackState}
                playheadMs={activeVideo.documentState.playheadMs}
                totalDurationMs={activeVideo.documentState.timeline.durationMs}
                frameRate={activeVideo.documentState.timeline.frameRate}
                zoom={videoZoom}
                snapToGrid={activeVideo.documentState.timeline.snapToGrid}
                canUndo={true}
                canRedo={true}
                onUndo={() => {
                  const prev = videoService.undo(activeVideo.artifact.id);
                  if (prev) {
                    setActiveVideo({ ...activeVideo, documentState: prev });
                    loadData();
                  }
                }}
                onRedo={() => {
                  const next = videoService.redo(activeVideo.artifact.id);
                  if (next) {
                    setActiveVideo({ ...activeVideo, documentState: next });
                    loadData();
                  }
                }}
                onPlay={handlePlayVideo}
                onPause={handlePauseVideo}
                onStop={handleStopVideo}
                onJumpToStart={() =>
                  setActiveVideo({
                    ...activeVideo,
                    documentState: { ...activeVideo.documentState, playheadMs: 0 },
                  })
                }
                onJumpToEnd={() =>
                  setActiveVideo({
                    ...activeVideo,
                    documentState: {
                      ...activeVideo.documentState,
                      playheadMs: activeVideo.documentState.timeline.durationMs,
                    },
                  })
                }
                onZoomIn={() => setVideoZoom((prev) => Math.min(150, prev + 10))}
                onZoomOut={() => setVideoZoom((prev) => Math.max(10, prev - 10))}
                onFitTimeline={() => setVideoZoom(30)}
                onToggleSnap={() => {
                  handleUpdateVideoDocumentState({
                    ...activeVideo.documentState,
                    timeline: {
                      ...activeVideo.documentState.timeline,
                      snapToGrid: !activeVideo.documentState.timeline.snapToGrid,
                    },
                  });
                }}
                onAddTrack={() => {
                  const newTrack: VideoTrackType = {
                    id: `track-${Date.now()}`,
                    name: `Faixa ${activeVideo.documentState.tracks.length + 1}`,
                    type: "VIDEO",
                    visible: true,
                    locked: false,
                    order: activeVideo.documentState.tracks.length + 1,
                    clips: [],
                    color: "#3b82f6",
                  };
                  handleUpdateVideoDocumentState({
                    ...activeVideo.documentState,
                    tracks: [...activeVideo.documentState.tracks, newTrack],
                  });
                }}
                onAddScene={() => {
                  const lastScene = activeVideo.documentState.scenes[activeVideo.documentState.scenes.length - 1];
                  const startMs = lastScene ? lastScene.endMs : 0;
                  const endMs = startMs + 10000;
                  const newScene = athenaVideoActions.createScene(
                    `Cena ${activeVideo.documentState.scenes.length + 1}`,
                    startMs,
                    endMs
                  );
                  handleUpdateVideoDocumentState({
                    ...activeVideo.documentState,
                    scenes: [...activeVideo.documentState.scenes, newScene],
                  });
                }}
                onImportVideo={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "video/*,image/*,audio/*";
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const newClip: VideoClipType = {
                        id: `clip-${Date.now()}`,
                        trackId: activeVideo.documentState.tracks[0]?.id || "track-video",
                        name: file.name,
                        type: file.type.startsWith("image/") ? "IMAGE" : file.type.startsWith("audio/") ? "AUDIO" : "VIDEO",
                        timelineStartMs: activeVideo.documentState.playheadMs,
                        sourceStartMs: 0,
                        sourceEndMs: 10000,
                        transform: { x: 0, y: 0, width: 1920, height: 1080, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 },
                        opacity: 1,
                      };
                      const updatedTracks = activeVideo.documentState.tracks.map((t, idx) =>
                        idx === 0 ? { ...t, clips: [...t.clips, newClip] } : t
                      );
                      handleUpdateVideoDocumentState({
                        ...activeVideo.documentState,
                        tracks: updatedTracks,
                      });
                    }
                  };
                  input.click();
                }}
                onAskAthena={() => setVideoSidebarTab("ATHENA")}
              />

              {/* Upper Section: Preview Player + Properties Panel */}
              <div className="flex-1 flex overflow-hidden border-b border-[#1c1d32]">
                <div className="flex-1 h-full overflow-hidden">
                  <VideoPreviewFrame
                    documentState={activeVideo.documentState}
                    playheadMs={activeVideo.documentState.playheadMs}
                  />
                </div>

                <div className="w-72 h-full border-l border-[#1c1d32] overflow-hidden">
                  <VideoPropertiesPanel
                    selectedClip={selectedClip}
                    selectedScene={selectedScene}
                    selectedTrack={selectedTrack}
                    playheadMs={activeVideo.documentState.playheadMs}
                    onUpdateClip={(clipId, up) => {
                      const updatedTracks = activeVideo.documentState.tracks.map((t) => ({
                        ...t,
                        clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...up } : c)),
                      }));
                      handleUpdateVideoDocumentState({ ...activeVideo.documentState, tracks: updatedTracks });
                    }}
                    onUpdateScene={(sceneId, up) => {
                      const updatedScenes = activeVideo.documentState.scenes.map((s) =>
                        s.id === sceneId ? { ...s, ...up } : s
                      );
                      handleUpdateVideoDocumentState({ ...activeVideo.documentState, scenes: updatedScenes });
                    }}
                    onSplitClipAtPlayhead={(clipId) => {
                      videoService.splitClip(activeVideo.artifact.id, clipId, activeVideo.documentState.playheadMs, "USER").then((res) => {
                        if (res.success) {
                          const ref = videoService.getVideo(activeVideo.artifact.id);
                          if (ref) setActiveVideo(ref);
                        } else {
                          alert(`Não foi possível dividir clip: ${res.error}`);
                        }
                      });
                    }}
                    onDeleteClip={(clipId) => {
                      const updatedTracks = activeVideo.documentState.tracks.map((t) => ({
                        ...t,
                        clips: t.clips.filter((c) => c.id !== clipId),
                      }));
                      handleUpdateVideoDocumentState({ ...activeVideo.documentState, tracks: updatedTracks });
                      setSelectedVideoClipIds([]);
                    }}
                  />
                </div>
              </div>

              {/* Lower Section: Multitrack Timeline */}
              <div className="h-64 flex flex-col overflow-hidden">
                <VideoTimeline
                  documentState={activeVideo.documentState}
                  zoom={videoZoom}
                  selectedTrackId={selectedVideoTrackId}
                  selectedClipIds={selectedVideoClipIds}
                  onSelectTrack={setSelectedVideoTrackId}
                  onSelectClip={(cId) => setSelectedVideoClipIds([cId])}
                  onSeek={(ms) =>
                    setActiveVideo({
                      ...activeVideo,
                      documentState: { ...activeVideo.documentState, playheadMs: ms },
                    })
                  }
                  onToggleTrackVisibility={(tId) => {
                    const updatedTracks = activeVideo.documentState.tracks.map((t) =>
                      t.id === tId ? { ...t, visible: !t.visible } : t
                    );
                    handleUpdateVideoDocumentState({ ...activeVideo.documentState, tracks: updatedTracks });
                  }}
                />
              </div>
            </div>
          }
        />

        <VideoExportModal
          isOpen={isVideoExportOpen}
          artifactId={activeVideo.artifact.id}
          videoTitle={activeVideo.artifact.name}
          onClose={() => setIsVideoExportOpen(false)}
        />

        <VideoChangeSetModal
          isOpen={isVideoChangeSetOpen}
          changeSets={videoService.getPendingChangeSets(activeVideo.artifact.id)}
          onAccept={async (csId) => {
            await videoService.acceptChangeSet(activeVideo.artifact.id, csId);
            setIsVideoChangeSetOpen(false);
            const ref = videoService.getVideo(activeVideo.artifact.id);
            if (ref) setActiveVideo(ref);
          }}
          onReject={(csId) => {
            videoService.rejectChangeSet(activeVideo.artifact.id, csId);
            setIsVideoChangeSetOpen(false);
          }}
          onClose={() => setIsVideoChangeSetOpen(false)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE AUDIO STUDIO WORKSPACE
  // -------------------------------------------------------------
  if (activeAudio) {
    const selectedTrack = activeAudio.documentState.tracks.find((t) => t.id === selectedAudioTrackId);
    const selectedAudioClipIdSet = new Set(selectedAudioClipIds);
    const selectedAudioClips = activeAudio.documentState.tracks.flatMap((track) => track.clips.filter((clip) => selectedAudioClipIdSet.has(clip.id)));
    const selectedAudioClipTracks = activeAudio.documentState.tracks.filter((track) => track.clips.some((clip) => selectedAudioClipIdSet.has(clip.id)));
    const gameAudioBrowserAssets = audioGameAudioOpen ? assetManager.listAssetsForArtifact(activeAudio.artifact.id) : [];
    const gameAudioBrowserPackage = audioGameAudioOpen ? buildGameAudioPackage(activeAudio.artifact.name, activeAudio.documentState.tracks, [], gameAudioBrowserAssets) : null;
    const gameAudioBrowserIssues = gameAudioBrowserPackage ? validateGameAudioPackage(gameAudioBrowserPackage, new Set(gameAudioBrowserAssets.filter((asset) => asset.status !== "QUARANTINED" && asset.status !== "CORRUPTED").map((asset) => asset.id))) : [];
    let selectedClip: AudioClip | undefined = undefined;
    if (selectedAudioClipIds.length > 0) {
      for (const t of activeAudio.documentState.tracks) {
        const c = t.clips.find((clip) => clip.id === selectedAudioClipIds[0]);
        if (c) {
          selectedClip = c;
          break;
        }
      }
    }
    const toggleAudioGameAudioBrowser = () => {
      const next = !audioGameAudioOpen;
      setAudioGameAudioOpen(next);
      setAudioAmbienceOpen(false);
      setAudioVoiceOpen(false);
      setAudioAnalysisOpen(false);
      setAudioSoundDesignOpen(false);
      setAudioPianoRollOpen(false);
      setAudioScoreOpen(false);
      setAudioMixerOpen(false);
    };
    const toggleAudioAmbienceLayers = () => {
      const next = !audioAmbienceOpen;
      setAudioAmbienceOpen(next);
      setAudioGameAudioOpen(false);
      setAudioVoiceOpen(false);
      setAudioAnalysisOpen(false);
      setAudioSoundDesignOpen(false);
      setAudioPianoRollOpen(false);
      setAudioScoreOpen(false);
      setAudioMixerOpen(false);
    };

    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <StudioShell
          title={activeAudio.artifact.name}
          subtitle={`Audio Studio (${Math.round(activeAudio.documentState.timeline.durationMs / 1000)}s | ${activeAudio.documentState.tracks.length} faixas)`}
          saveState={audioSaveState}
          viewMode={audioViewMode}
          onViewModeChange={(mode) => {
            setAudioViewMode(mode);
            setAudioMixerOpen(mode === "SPLIT");
          }}
          activeSidebarTab={audioSidebarTab}
          onSidebarTabChange={setAudioSidebarTab}
          onBackToHub={() => handleBackToHub("AUDIO")}
          onCreateVersion={async () => {
            const label =
              prompt(
                "Descrição da nova versão do projeto de áudio:",
                `Versão manual v${(activeAudio.artifact.versions?.length || 0) + 1}`
              ) || "Versão manual";
            const res = await audioService.createManualVersion(activeAudio.artifact.id, label, "USER");
            if (res.success) {
              const ref = audioService.getAudio(activeAudio.artifact.id);
              if (ref) setActiveAudio(ref);
            }
          }}
          onExport={() => setIsAudioExportOpen(true)}
          onDelete={() => {
            if (confirm("Mover este projeto de áudio para a Lixeira de 10 dias?")) {
              audioService.saveDocumentState(activeAudio.artifact.id, activeAudio.documentState, "USER");
              setActiveAudio(null);
              loadData();
            }
          }}
          extraAction={
            <div className="flex flex-col items-start gap-1">
              <div className="flex flex-wrap items-center gap-1">
                <button type="button" onClick={() => { setAudioSoundDesignOpen((open) => !open); setAudioGameAudioOpen(false); setAudioAmbienceOpen(false); }} className="px-2.5 py-1.5 rounded-lg bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs font-semibold">{audioSoundDesignOpen ? "Timeline" : "Sound Design"}</button>
                <button type="button" onClick={() => setAudioMetronome((enabled) => !enabled)} className={`px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold ${audioMetronome ? "bg-emerald-600" : "bg-slate-700"}`}>♩ {audioMetronome ? "Metro On" : "Metro"}</button>
                <button type="button" onClick={() => setAudioCountInBars((bars) => bars >= 2 ? 0 : bars + 1)} className={`px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold ${audioCountInBars ? "bg-cyan-700" : "bg-slate-700"}`} aria-label="Count-in do metrônomo">{audioCountInBars ? `Count-in ${audioCountInBars} comp.` : "Count-in"}</button>
                <button type="button" onClick={handleImportAudioMidi} className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold">Import MIDI</button>
                <button type="button" onClick={handleExportAudioMidi} className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold">Export MIDI</button>
                <button type="button" onClick={handleExportAudioMusicXml} className="px-2.5 py-1.5 rounded-lg bg-cyan-800 hover:bg-cyan-700 text-white text-xs font-semibold">Export MusicXML</button>
                <button type="button" onClick={handleExportAudioScorePdf} className="px-2.5 py-1.5 rounded-lg bg-cyan-900 hover:bg-cyan-800 text-white text-xs font-semibold">Export PDF</button>
                <button type="button" onClick={handleExportGameAudioPackage} className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold">Exportar Game Audio</button><button type="button" onClick={() => void handleExportGameAudioBundle()} className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold">Exportar Bundle</button>
                <button type="button" onClick={() => { setAudioPianoRollOpen((open) => !open); setAudioScoreOpen(false); setAudioMixerOpen(false); setAudioSoundDesignOpen(false); setAudioGameAudioOpen(false); setAudioAmbienceOpen(false); }} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold">{audioPianoRollOpen ? "Timeline" : "Piano Roll"}</button>
                <button type="button" onClick={() => { setAudioDrumSequencerOpen((open) => !open); setAudioPianoRollOpen(false); setAudioScoreOpen(false); setAudioMixerOpen(false); setAudioSoundDesignOpen(false); setAudioGameAudioOpen(false); setAudioAmbienceOpen(false); }} className="px-3 py-1.5 rounded-lg bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs font-semibold">{audioDrumSequencerOpen ? "Timeline" : "Drum Sequencer"}</button>
                <button type="button" onClick={() => { setAudioScoreOpen((open) => !open); setAudioPianoRollOpen(false); setAudioMixerOpen(false); setAudioSoundDesignOpen(false); setAudioGameAudioOpen(false); setAudioAmbienceOpen(false); }} className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold">{audioScoreOpen ? "Timeline" : "Score"}</button>
                <button type="button" onClick={() => { setAudioMixerOpen((open) => !open); setAudioPianoRollOpen(false); setAudioScoreOpen(false); setAudioSoundDesignOpen(false); setAudioGameAudioOpen(false); setAudioAmbienceOpen(false); }} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold">{audioMixerOpen ? "Timeline" : "Mixer"}</button>
              </div>
              {gameAudioExportMessage && <p role={gameAudioExportMessage.type === "error" ? "alert" : "status"} className={`max-w-xl text-[10px] ${gameAudioExportMessage.type === "error" ? "text-rose-300" : "text-emerald-300"}`}>{gameAudioExportMessage.text}</p>}
            </div>
          }
          sidebarContent={
            audioSidebarTab === "OUTLINE" ? (
              <div className="p-4 flex flex-col h-full text-xs text-slate-300 space-y-3">
                <MidiDevicePanel bpm={activeAudio.documentState.settings?.bpm || 120} preset={{ oscillator: "sine", attack: 0.01, decay: 0.12, sustain: 0.65, release: 0.25, gain: 0.25, detune: 0, filterFrequency: 12000, ...(activeAudio.documentState.synthPreset || {}) }} versions={activeAudio.documentState.synthPresetVersions || []} onPresetChange={(synthPreset) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, synthPreset })} onSaveVersion={(name, synthPreset) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, synthPreset, synthPresetVersions: [...(activeAudio.documentState.synthPresetVersions || []), { id: `synth-version-${Date.now()}`, name, createdAt: new Date().toISOString(), preset: synthPreset }] })} onRestoreVersion={(version) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, synthPreset: { ...version.preset } })} onRenameVersion={(versionId, name) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, synthPresetVersions: (activeAudio.documentState.synthPresetVersions || []).map((version) => version.id === versionId ? { ...version, name } : version) })} onDeleteVersion={(versionId) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, synthPresetVersions: (activeAudio.documentState.synthPresetVersions || []).filter((version) => version.id !== versionId) })} onRecorded={handleRecordedMidiNotes} />
                <SpatialAudioPanel clips={activeAudio.documentState.tracks.flatMap((track) => track.clips)} selectedClipIds={selectedAudioClipIds} onChange={(clipId, spatial) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: activeAudio.documentState.tracks.map((track) => ({ ...track, clips: track.clips.map((clip) => clip.id === clipId ? { ...clip, spatial } : clip) })) })} />
                <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5 pb-2 border-b border-[#1c1d30]">
                  <Music size={13} className="text-amber-400" />
                  Estrutura de Faixas ({activeAudio.documentState.tracks.length})
                </span>
                <div className="space-y-1.5 overflow-y-auto flex-1">
                  {activeAudio.documentState.tracks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedAudioTrackId(t.id)}
                      className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between border ${
                        t.id === selectedAudioTrackId
                          ? "bg-amber-500/15 border-amber-500/40 text-white font-medium"
                          : "bg-[#101120] border-transparent text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {t.clips.length} {t.clips.length === 1 ? "clip" : "clips"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : audioSidebarTab === "VERSIONS" ? (
              <DocumentVersionHistory
                versions={activeAudio.artifact.versions || []}
                currentVersionNumber={`v${activeAudio.artifact.versions?.length || 1}.0`}
                onRestoreVersion={async (vNum) => {
                  const res = await audioService.restoreVersion(activeAudio.artifact.id, parseInt(vNum) || 1, "USER");
                  if (res.success && res.audio) {
                    setActiveAudio(res.audio);
                  }
                }}
              />
            ) : audioSidebarTab === "ASSETS" ? (
              <AudioAssetBrowser artifactId={activeAudio.artifact.id} projectMetadata={activeAudio.documentState.assetMetadataOverrides} onProjectMetadataChange={(assetId, metadata) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, assetMetadataOverrides: { ...(activeAudio.documentState.assetMetadataOverrides || {}), [assetId]: metadata } })} onInsert={async (assetId) => {
                // Flush the current editor snapshot first: track creation/settings use a
                // debounced autosave, while this asset operation writes immediately.
                // Without this barrier, the service can target a stale track list and a
                // pending autosave can subsequently overwrite the newly inserted clip.
                if (audioAutosaveTimerRef.current) {
                  clearTimeout(audioAutosaveTimerRef.current);
                  audioAutosaveTimerRef.current = null;
                }
                const flushed = await audioService.saveDocumentState(activeAudio.artifact.id, activeAudio.documentState, "USER");
                if (!flushed.success) throw new Error(flushed.error || "Não foi possível salvar as alterações antes da inserção.");
                setAudioSaveState("SAVED");
                const result = await audioService.insertExistingAsset(activeAudio.artifact.id, assetId, selectedAudioTrackId, activeAudio.documentState.playheadMs);
                if (!result.success) throw new Error(("error" in result && result.error) || "Não foi possível inserir o asset na faixa selecionada.");
                const ref = audioService.getAudio(activeAudio.artifact.id);
                if (!ref) throw new Error("Clip inserido, mas o projeto não pôde ser atualizado na tela. Reabra o projeto para conferir o estado salvo.");
                setActiveAudio(ref);
                setAudioSaveState("SAVED");
              }} />
            ) : audioSidebarTab === "RELATIONS" ? (
              <StudioRelationsPanel
                artifact={activeAudio.artifact}
                onUpdateArtifact={(updated) => {
                  const ref = audioService.getAudio(updated.id);
                  if (ref) setActiveAudio(ref);
                  loadData();
                }}
              />
            ) : audioSidebarTab === "ATHENA" ? (
              <div className="p-4 flex flex-col h-full text-xs text-slate-300 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-white pb-2 border-b border-[#1c1d30]">
                  <Sparkles size={14} className="text-amber-400" />
                  Athena Audio Assistant
                </div>
                <p className="text-slate-400 text-[11px]">
                  Athena analisa a estrutura temporal, cortes de foley, níveis de ganho e sugere otimizações não-destrutivas.
                </p>
                {audioService.getPendingChangeSets(activeAudio.artifact.id).length > 0 && (
                  <button
                    onClick={() => setIsAudioChangeSetOpen(true)}
                    className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
                  >
                    Ver Proposta de Linha do Tempo
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 text-xs text-slate-500 italic">Nenhum painel selecionado.</div>
            )
          }
          mainContent={
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Transport Bar */}
              <AudioTransportControls
                playbackState={audioPlaybackState}
                playheadMs={activeAudio.documentState.playheadMs}
                totalDurationMs={activeAudio.documentState.timeline.durationMs}
                zoom={audioZoom}
                snapToGrid={activeAudio.documentState.timeline.snapToGrid}
                canUndo={audioService.canUndo(activeAudio.artifact.id)}
                canRedo={audioService.canRedo(activeAudio.artifact.id)}
                onUndo={() => {
                  const prev = audioService.undo(activeAudio.artifact.id);
                  if (prev) {
                    setActiveAudio({ ...activeAudio, documentState: prev });
                    loadData();
                  }
                }}
                onRedo={() => {
                  const next = audioService.redo(activeAudio.artifact.id);
                  if (next) {
                    setActiveAudio({ ...activeAudio, documentState: next });
                    loadData();
                  }
                }}
                onPlay={handlePlayAudio}
                onPause={handlePauseAudio}
                onStop={handleStopAudio}
                onRecord={handleRecordAudio}
                onAddMarker={() => { const label = prompt("Nome do marker:", `Marker ${activeAudio.documentState.timeline.markers.length + 1}`); if (!label) return; handleUpdateAudioDocumentState({ ...activeAudio.documentState, timeline: { ...activeAudio.documentState.timeline, markers: [...activeAudio.documentState.timeline.markers, { id: `marker-${Date.now()}`, timeMs: activeAudio.documentState.playheadMs, label, color: "#f59e0b" }] } }); }}
                onJumpToStart={() =>
                  setActiveAudio({
                    ...activeAudio,
                    documentState: { ...activeAudio.documentState, playheadMs: 0 },
                  })
                }
                onJumpToEnd={() =>
                  setActiveAudio({
                    ...activeAudio,
                    documentState: {
                      ...activeAudio.documentState,
                      playheadMs: activeAudio.documentState.timeline.durationMs,
                    },
                  })
                }
                onZoomIn={() => setAudioZoom((prev) => Math.min(200, prev + 15))}
                onZoomOut={() => setAudioZoom((prev) => Math.max(10, prev - 15))}
                onFitTimeline={() => setAudioZoom(30)}
                onToggleSnap={() => {
                  const updated = {
                    ...activeAudio.documentState,
                    timeline: {
                      ...activeAudio.documentState.timeline,
                      snapToGrid: !activeAudio.documentState.timeline.snapToGrid,
                    },
                  };
                  handleUpdateAudioDocumentState(updated);
                }}
                onAddTrack={() => { const type = window.prompt("Tipo de faixa: AUDIO, VOICE, DIALOGUE, MUSIC, INSTRUMENT, MIDI, SFX, FOLEY, AMBIENCE ou REFERENCE", "AUDIO")?.toUpperCase(); if (["AUDIO", "VOICE", "DIALOGUE", "MUSIC", "INSTRUMENT", "MIDI", "SFX", "FOLEY", "AMBIENCE", "REFERENCE"].includes(type || "")) handleAddAudioTrack(type as ExtendedAudioTrackType); }}
                onImportAudio={() => {
                  setAudioImportError(undefined);
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "audio/wav,audio/x-wav,audio/mp3,audio/mpeg,audio/ogg,audio/aac,audio/m4a,audio/webm";
                  input.multiple = true;
                  input.onchange = async (e: any) => {
                    const files = Array.from<File>(e.target.files || []);
                    for (const file of files) {
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const raw = reader.result as ArrayBuffer;
                        const res = await audioService.importAssetIntoProject({
                          artifactId: activeAudio.artifact.id,
                          name: file.name,
                          mimeType: file.type || "audio/wav",
                          sizeBytes: file.size,
                          data: raw,
                          trackId: selectedAudioTrackId,
                          timelineStartMs: activeAudio.documentState.playheadMs,
                          actor: "USER",
                        });
                        if (res.success) {
                          setAudioImportError(undefined);
                          const ref = audioService.getAudio(activeAudio.artifact.id); if (ref) setActiveAudio(ref);
                          loadData();
                        } else {
                          setAudioImportError(res.error || `Não foi possível importar ${file.name}.`);
                        }
                      };
                      reader.readAsArrayBuffer(file);
                    }
                  };
                  input.click();
                }}
                onAskAthena={() => setAudioSidebarTab("ATHENA")}
              />

              {audioImportError && <div role="alert" className="flex items-start justify-between gap-3 border-b border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-100"><span>{audioImportError}</span><button type="button" aria-label="Fechar erro de importação" onClick={() => setAudioImportError(undefined)} className="shrink-0 rounded px-2 text-rose-200 hover:bg-rose-900">Fechar</button></div>}

              {/* Timeline + Properties Grid */}
              <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-2 border-b border-[#1e2038] bg-[#0c0d1a] px-3 py-1">
                <MusicLoopControls music={activeAudio.documentState.music || defaultMusicProject()} onChange={handleUpdateMusicState} />
                <button type="button" onClick={toggleAudioGameAudioBrowser} className={`rounded px-2 py-1 text-[10px] ${audioGameAudioOpen ? "bg-cyan-600 text-white" : "bg-cyan-950/70 text-cyan-100 hover:bg-cyan-800"}`}>{audioGameAudioOpen ? "Fechar Game Audio" : "Game Audio Browser"}</button>
                <button type="button" onClick={toggleAudioAmbienceLayers} className={`rounded px-2 py-1 text-[10px] ${audioAmbienceOpen ? "bg-emerald-600 text-white" : "bg-emerald-950/70 text-emerald-100 hover:bg-emerald-800"}`}>{audioAmbienceOpen ? "Fechar Ambience" : "Ambience Layers"}</button>
                <button type="button" onClick={() => { setAudioVoiceOpen((open) => !open); setAudioAnalysisOpen(false); setAudioSoundDesignOpen(false); setAudioPianoRollOpen(false); setAudioScoreOpen(false); setAudioMixerOpen(false); setAudioGameAudioOpen(false); setAudioAmbienceOpen(false); }} className="rounded bg-fuchsia-900/70 px-2 py-1 text-[10px] text-fuchsia-100">{audioVoiceOpen ? "Fechar Voice" : "Voice"}</button>
                <button type="button" onClick={() => { setAudioAnalysisOpen((open) => !open); setAudioVoiceOpen(false); setAudioSoundDesignOpen(false); setAudioPianoRollOpen(false); setAudioScoreOpen(false); setAudioMixerOpen(false); setAudioGameAudioOpen(false); setAudioAmbienceOpen(false); }} className="rounded bg-sky-900/70 px-2 py-1 text-[10px] text-sky-100">{audioAnalysisOpen ? "Fechar Analysis" : "Analysis"}</button>
              </div>
              <div className="flex-1 flex h-full overflow-hidden">
                {audioGameAudioOpen && gameAudioBrowserPackage ? <GameAudioBrowser packageData={gameAudioBrowserPackage} issues={gameAudioBrowserIssues} onSelectEvent={(event) => { if (event.trackId) setSelectedAudioTrackId(event.trackId); if (event.clipId) setSelectedAudioClipIds([event.clipId]); setAudioGameAudioOpen(false); }} /> : audioAmbienceOpen ? <AmbienceLayersPanel tracks={activeAudio.documentState.tracks} buses={activeAudio.documentState.buses || []} onAddLayer={() => handleAddAudioTrack("AMBIENCE", `Ambience ${activeAudio.documentState.tracks.filter((track) => track.type === "AMBIENCE").length + 1}`)} onUpdateTrack={(trackId, updates) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: activeAudio.documentState.tracks.map((track) => track.id === trackId ? { ...track, ...updates } : track) })} onSelectTrack={(trackId) => { setSelectedAudioTrackId(trackId); setSelectedAudioClipIds([]); }} onOpenAssets={(trackId) => { setSelectedAudioTrackId(trackId); setAudioSidebarTab("ASSETS"); }} onOpenTimeline={(trackId) => { setSelectedAudioTrackId(trackId); setSelectedAudioClipIds([]); setAudioAmbienceOpen(false); }} /> : audioVoiceOpen ? <VoicePanel profile={activeAudio.documentState.voiceProfiles?.find((item) => item.characterId === "euterpe") || { characterId: "euterpe", displayName: "Euterpe", language: "pt-BR", styleProfile: { age: "young-adult", qualities: [], expression: "Neutral" }, processingChain: [], version: "Euterpe Voice v1", pronunciationDictionary: [] }} takes={activeAudio.documentState.voiceTakes || []} onChange={(voiceTakes) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, voiceTakes })} onProfileChange={(profile) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, voiceProfiles: (activeAudio.documentState.voiceProfiles || []).some((item) => item.characterId === profile.characterId) ? (activeAudio.documentState.voiceProfiles || []).map((item) => item.characterId === profile.characterId ? profile : item) : [...(activeAudio.documentState.voiceProfiles || []), profile] })} onGenerate={handleGenerateVoice} onProcessTake={handleProcessVoiceTake} /> : audioAnalysisOpen ? <AnalysisPanel tracks={activeAudio.documentState.tracks} selectedClipIds={selectedAudioClipIds} /> : audioDrumSequencerOpen ? <DrumSequencerPanel patterns={activeAudio.documentState.drumPatterns || []} onPatternsChange={(drumPatterns) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, drumPatterns })} music={activeAudio.documentState.music || defaultMusicProject()} onMusicChange={handleUpdateMusicState} /> : audioSoundDesignOpen ? <SoundDesignPanel onGenerated={handleGeneratedAudio} samplerDefinitions={activeAudio.documentState.samplerDefinitions || []} onSamplerDefinitionsChange={(samplerDefinitions) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, samplerDefinitions })} drumPatterns={activeAudio.documentState.drumPatterns || []} onDrumPatternsChange={(drumPatterns) => handleUpdateAudioDocumentState({ ...activeAudio.documentState, drumPatterns })} music={activeAudio.documentState.music || defaultMusicProject()} onMusicChange={handleUpdateMusicState} /> : audioPianoRollOpen ? <PianoRoll music={activeAudio.documentState.music || { version: 1, tuning: { concertPitchHz: 440, temperament: "12-TET" }, tempoMap: [{ beat: 0, bpm: activeAudio.documentState.settings?.bpm || 120 }], timeSignature: { numerator: 4, denominator: 4 }, key: { tonic: "C", accidental: "natural", scale: "major" }, notes: [], rests: [], chords: [] }} onChange={handleUpdateMusicState} /> : audioScoreOpen ? <ScoreView music={activeAudio.documentState.music || { version: 1, tuning: { concertPitchHz: 440, temperament: "12-TET" }, tempoMap: [{ beat: 0, bpm: activeAudio.documentState.settings?.bpm || 120 }], timeSignature: { numerator: 4, denominator: 4 }, key: { tonic: "C", accidental: "natural", scale: "major" }, notes: [], rests: [], chords: [] }} onChange={handleUpdateMusicState} /> : audioMixerOpen ? <AudioMixer state={activeAudio.documentState} onChange={handleUpdateAudioDocumentState} /> : <div className={`flex-1 h-full overflow-hidden ${audioViewMode === "PREVIEW" ? "pointer-events-none" : ""}`}>
                  <AudioTimeline
                    documentState={activeAudio.documentState}
                    zoom={audioZoom}
                    selectedTrackId={selectedAudioTrackId}
                    selectedClipIds={selectedAudioClipIds}
                    onSelectTrack={setSelectedAudioTrackId}
                    onSelectClip={(cId, additive) => setSelectedAudioClipIds((current) => additive ? (current.includes(cId) ? current.filter((id) => id !== cId) : [...current, cId]) : [cId])}
                    onSeek={(timeMs) =>
                      setActiveAudio({
                        ...activeAudio,
                        documentState: { ...activeAudio.documentState, playheadMs: timeMs },
                      })
                    }
                    onToggleTrackMute={(tId) => {
                      const updated = activeAudio.documentState.tracks.map((t) =>
                        t.id === tId ? { ...t, muted: !t.muted } : t
                      );
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updated });
                    }}
                    onToggleTrackSolo={(tId) => {
                      const updated = activeAudio.documentState.tracks.map((t) =>
                        t.id === tId ? { ...t, solo: !t.solo } : t
                      );
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updated });
                    }}
                    onUpdateTrackVolume={(tId, vol) => {
                      const updated = activeAudio.documentState.tracks.map((t) =>
                        t.id === tId ? { ...t, volume: vol } : t
                      );
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updated });
                    }}
                    onUpdateTrackPan={(tId, pan) => {
                      const updated = activeAudio.documentState.tracks.map((t) =>
                        t.id === tId ? { ...t, pan } : t
                      );
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updated });
                    }}
                    onMoveClip={(clipId, timelineStartMs) => {
                      const updated = activeAudio.documentState.tracks.map((track) => ({ ...track, clips: track.clips.map((clip) => clip.id === clipId ? { ...clip, timelineStartMs } : clip) }));
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updated });
                    }}
                    onTrimClip={(clipId, side, deltaMs) => {
                      const updated = activeAudio.documentState.tracks.map((track) => ({ ...track, clips: track.clips.map((clip) => {
                        if (clip.id !== clipId) return clip;
                        if (side === "start") return { ...clip, sourceStartMs: Math.min(clip.sourceEndMs - 1, clip.sourceStartMs + deltaMs), timelineStartMs: clip.timelineStartMs + deltaMs };
                        return { ...clip, sourceEndMs: Math.max(clip.sourceStartMs + 1, clip.sourceEndMs + deltaMs) };
                      }) }));
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updated });
                    }}
                    onImportFiles={handleImportAudioFiles}
                  />
                </div>}

                {/* Right Properties Column */}
                {audioViewMode !== "PREVIEW" && <div className="w-72 h-full border-l border-[#1c1d32] overflow-hidden">
                  <AudioPropertiesPanel
                    selectedClip={selectedClip}
                    selectedClips={selectedAudioClips}
                    selectedClipTracks={selectedAudioClipTracks}
                    selectedTrack={selectedTrack}
                    playheadMs={activeAudio.documentState.playheadMs}
                    onUpdateClip={(clipId, updates) => {
                      const updatedTracks = activeAudio.documentState.tracks.map((t) => ({
                        ...t,
                        clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
                      }));
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updatedTracks });
                    }}
                    onUpdateTrack={(trackId, updates) => {
                      const targetTrack = activeAudio.documentState.tracks.find((track) => track.id === trackId);
                      const updatedTracks = activeAudio.documentState.tracks.map((track) => {
                        if (track.id === trackId) return { ...track, ...updates };
                        if (updates.variationSeed !== undefined && targetTrack?.variationGroup && track.variationGroup === targetTrack.variationGroup) return { ...track, variationSeed: updates.variationSeed };
                        return track;
                      });
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updatedTracks });
                    }}
                    onBulkUpdateClips={(updates) => {
                      const updatesById = new Map(updates.map(({ clipId, updates: clipUpdates }) => [clipId, clipUpdates]));
                      const updatedTracks = activeAudio.documentState.tracks.map((track) => ({
                        ...track,
                        clips: track.clips.map((clip) => {
                          const clipUpdates = updatesById.get(clip.id);
                          return clipUpdates ? { ...clip, ...clipUpdates } : clip;
                        }),
                      }));
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updatedTracks });
                    }}
                    onBulkUpdateTracks={(trackIds, updates) => {
                      const selectedTrackIdSet = new Set(trackIds);
                      const selectedGroups = new Set(activeAudio.documentState.tracks.filter((track) => selectedTrackIdSet.has(track.id) && track.variationGroup).map((track) => track.variationGroup));
                      const updatedTracks = activeAudio.documentState.tracks.map((track) => {
                        const isSelected = selectedTrackIdSet.has(track.id);
                        const sharesSelectedGroup = updates.variationSeed !== undefined && Boolean(track.variationGroup && selectedGroups.has(track.variationGroup));
                        if (!isSelected && !sharesSelectedGroup) return track;
                        if (isSelected) return { ...track, ...updates };
                        return { ...track, variationSeed: updates.variationSeed };
                      });
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updatedTracks });
                    }}
                    onSplitClipAtPlayhead={(clipId) => {
                      audioService.splitClip(activeAudio.artifact.id, clipId, activeAudio.documentState.playheadMs, "USER").then((res) => {
                        if (res.success) {
                          const ref = audioService.getAudio(activeAudio.artifact.id);
                          if (ref) setActiveAudio(ref);
                        } else {
                          alert(`Não foi possível dividir: ${res.error}`);
                        }
                      });
                    }}
                    onDeleteClip={(clipId) => {
                      const updatedTracks = activeAudio.documentState.tracks.map((t) => ({
                        ...t,
                        clips: t.clips.filter((c) => c.id !== clipId),
                      }));
                      handleUpdateAudioDocumentState({ ...activeAudio.documentState, tracks: updatedTracks });
                      setSelectedAudioClipIds([]);
                    }}
                  />
                </div>}
              </div>
              <AudioAutomationLane
                state={activeAudio.documentState}
                trackId={selectedAudioTrackId}
                onChange={handleUpdateAudioDocumentState}
              />
            </div>
          }
        />

        <AudioExportModal
          isOpen={isAudioExportOpen}
          artifactId={activeAudio.artifact.id}
          audioTitle={activeAudio.artifact.name}
          tracks={activeAudio.documentState.tracks}
          selectedClipId={selectedAudioClipIds[0]}
          onClose={() => setIsAudioExportOpen(false)}
        />

        <AudioChangeSetModal
          isOpen={isAudioChangeSetOpen}
          changeSets={audioService.getPendingChangeSets(activeAudio.artifact.id)}
          onAccept={async (csId) => {
            await audioService.acceptChangeSet(activeAudio.artifact.id, csId);
            setIsAudioChangeSetOpen(false);
            const ref = audioService.getAudio(activeAudio.artifact.id);
            if (ref) setActiveAudio(ref);
          }}
          onReject={(csId) => {
            audioService.rejectChangeSet(activeAudio.artifact.id, csId);
            setIsAudioChangeSetOpen(false);
          }}
          onClose={() => setIsAudioChangeSetOpen(false)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE DOCUMENT STUDIO WORKSPACE
  // -------------------------------------------------------------
  if (activeDoc) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <StudioShell
          title={activeDoc.artifact.name}
          subtitle={activeDoc.metadata.documentType}
          saveState={docSaveState}
          viewMode={docViewMode}
          onViewModeChange={setDocViewMode}
          activeSidebarTab={docSidebarTab}
          onSidebarTabChange={setDocSidebarTab}
          onBackToHub={() => handleBackToHub("DOCUMENT")}
          onCreateVersion={async () => {
            const label = prompt("Descrição da nova versão:", `Versão manual v${(activeDoc.artifact.versions?.length || 0) + 1}`) || "Versão manual";
            const res = await documentService.createManualVersion(activeDoc.artifact.id, label, "USER");
            if (res.success) {
              const ref = documentService.getDocument(activeDoc.artifact.id);
              if (ref) setActiveDoc(ref);
            }
          }}
          onExport={() => setIsDocExportOpen(true)}
          onDelete={() => {
            if (confirm("Mover este documento para a Lixeira de 10 dias?")) {
              documentService.saveDocumentContent(activeDoc.artifact.id, activeDoc.content, {}, "USER");
              setActiveDoc(null);
              loadData();
            }
          }}
          wordCount={activeDoc.metadata.wordCount}
          sidebarContent={
            docSidebarTab === "OUTLINE" ? (
              <DocumentOutline outline={activeDoc.metadata.outline || []} />
            ) : docSidebarTab === "VERSIONS" ? (
              <DocumentVersionHistory
                versions={activeDoc.artifact.versions || []}
                currentVersionNumber={`v${activeDoc.artifact.versions?.length || 1}.0`}
                onRestoreVersion={async (vNum) => {
                  const res = await documentService.restoreVersion(activeDoc.artifact.id, parseInt(vNum) || 1, "USER");
                  if (res.success && res.document) setActiveDoc(res.document);
                }}
              />
            ) : docSidebarTab === "ASSETS" ? (
              <StudioAssetPanel
                artifact={activeDoc.artifact}
                onUpdateArtifact={(updated) => {
                  const ref = documentService.getDocument(updated.id);
                  if (ref) setActiveDoc(ref);
                  loadData();
                }}
              />
            ) : docSidebarTab === "RELATIONS" ? (
              <StudioRelationsPanel
                artifact={activeDoc.artifact}
                onUpdateArtifact={(updated) => {
                  const ref = documentService.getDocument(updated.id);
                  if (ref) setActiveDoc(ref);
                  loadData();
                }}
              />
            ) : docSidebarTab === "ATHENA" ? (
              <DocumentSuggestionPanel
                suggestions={documentService.getSuggestions(activeDoc.artifact.id)}
                onAccept={async (id) => {
                  await documentService.acceptSuggestion(activeDoc.artifact.id, id);
                  const ref = documentService.getDocument(activeDoc.artifact.id);
                  if (ref) setActiveDoc(ref);
                }}
                onReject={(id) => {
                  documentService.rejectSuggestion(activeDoc.artifact.id, id);
                  const ref = documentService.getDocument(activeDoc.artifact.id);
                  if (ref) setActiveDoc(ref);
                }}
              />
            ) : (
              <div className="p-4 text-xs text-slate-500 italic">Nenhum painel selecionado.</div>
            )
          }
          mainContent={
            <>
              {(docViewMode === "EDIT" || docViewMode === "SPLIT") && (
                <div className="flex-1 h-full border-r border-[#1c1c2e]">
                  <DocumentEditor
                    content={activeDoc.content}
                    onChange={handleDocContentChange}
                  />
                </div>
              )}
              {(docViewMode === "PREVIEW" || docViewMode === "SPLIT") && (
                <div className="flex-1 h-full overflow-hidden">
                  <DocumentPreview content={activeDoc.content} />
                </div>
              )}
            </>
          }
        />

        <DocumentExportModal
          isOpen={isDocExportOpen}
          documentTitle={activeDoc.artifact.name}
          onClose={() => setIsDocExportOpen(false)}
          onConfirmExport={(opts) => {
            const exp = documentService.exportDocument(activeDoc.artifact.id, opts);
            const blob = new Blob([exp.content], { type: exp.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = exp.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsDocExportOpen(false);
          }}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE WEB STUDIO WORKSPACE
  // -------------------------------------------------------------
  if (activeWebsite) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <StudioShell
          title={activeWebsite.artifact.name}
          subtitle={`Web Studio (${activeWebsite.metadata.framework})`}
          saveState={webSaveState}
          viewMode={webViewMode}
          onViewModeChange={setWebViewMode}
          activeSidebarTab={webSidebarTab}
          onSidebarTabChange={setWebSidebarTab}
          onBackToHub={() => handleBackToHub("WEB")}
          onCreateVersion={async () => {
            const label = prompt("Descrição da nova versão do website:", `Versão manual v${(activeWebsite.artifact.versions?.length || 0) + 1}`) || "Versão manual";
            const res = await webService.createManualVersion(activeWebsite.artifact.id, label, "USER");
            if (res.success) {
              const ref = webService.getWebsite(activeWebsite.artifact.id);
              if (ref) setActiveWebsite(ref);
            }
          }}
          onExport={() => setIsWebExportOpen(true)}
          onDelete={() => {
            if (confirm("Mover este website para a Lixeira de 10 dias?")) {
              webService.saveFiles(activeWebsite.artifact.id, activeWebsite.files, "USER");
              setActiveWebsite(null);
              loadData();
            }
          }}
          extraAction={
            <button
              onClick={handleRunBuild}
              disabled={isBuilding}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              {isBuilding ? <RotateCw size={13} className="animate-spin" /> : <Play size={13} />}
              {isBuilding ? "Buildando..." : "Executar Build"}
            </button>
          }
          sidebarContent={
            webSidebarTab === "OUTLINE" ? (
              <WebFileExplorer
                files={activeWebsite.files}
                activeFilePath={activeWebFile?.path}
                onSelectFile={setActiveWebFile}
                onCreateFile={async (path) => {
                  const res = await webService.createFile(activeWebsite.artifact.id, path, "", "USER");
                  if (res.success && res.file) {
                    const ref = webService.getWebsite(activeWebsite.artifact.id);
                    if (ref) {
                      setActiveWebsite(ref);
                      setActiveWebFile(res.file);
                    }
                  }
                }}
                onDeleteFile={async (path) => {
                  await webService.deleteFile(activeWebsite.artifact.id, path, "USER");
                  const ref = webService.getWebsite(activeWebsite.artifact.id);
                  if (ref) setActiveWebsite(ref);
                }}
                onRenameFile={async (oldP, newP) => {
                  await webService.renameFile(activeWebsite.artifact.id, oldP, newP, "USER");
                  const ref = webService.getWebsite(activeWebsite.artifact.id);
                  if (ref) setActiveWebsite(ref);
                }}
              />
            ) : webSidebarTab === "VERSIONS" ? (
              <DocumentVersionHistory
                versions={activeWebsite.artifact.versions || []}
                currentVersionNumber={`v${activeWebsite.artifact.versions?.length || 1}.0`}
                onRestoreVersion={async (vNum) => {
                  const res = await webService.restoreVersion(activeWebsite.artifact.id, parseInt(vNum) || 1, "USER");
                  if (res.success && res.website) {
                    setActiveWebsite(res.website);
                  }
                }}
              />
            ) : webSidebarTab === "ASSETS" ? (
              <StudioAssetPanel
                artifact={activeWebsite.artifact}
                onUpdateArtifact={(updated) => {
                  const ref = webService.getWebsite(updated.id);
                  if (ref) setActiveWebsite(ref);
                  loadData();
                }}
              />
            ) : webSidebarTab === "RELATIONS" ? (
              <StudioRelationsPanel
                artifact={activeWebsite.artifact}
                onUpdateArtifact={(updated) => {
                  const ref = webService.getWebsite(updated.id);
                  if (ref) setActiveWebsite(ref);
                  loadData();
                }}
              />
            ) : webSidebarTab === "ATHENA" ? (
              <div className="p-4 flex flex-col h-full text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-white pb-2 border-b border-[#1c1d30] mb-3">
                  <Sparkles size={14} className="text-amber-400" />
                  Athena Web Assistant
                </div>
                <p className="text-slate-400 text-[11px] mb-3">
                  Proponha mudanças em múltiplos arquivos ou analise erros de build.
                </p>
                {webService.getPendingChangeSets(activeWebsite.artifact.id).length > 0 && (
                  <button
                    onClick={() => setIsWebChangeSetOpen(true)}
                    className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold mb-3 transition"
                  >
                    Ver Proposta Multi-Arquivo
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 text-xs text-slate-500 italic">Nenhum painel selecionado.</div>
            )
          }
          mainContent={
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="flex-1 flex h-full overflow-hidden">
                {(webViewMode === "EDIT" || webViewMode === "SPLIT") && (
                  <div className="flex-1 h-full border-r border-[#1c1c2e]">
                    <WebCodeEditor
                      files={activeWebsite.files}
                      activeFile={activeWebFile}
                      onContentChange={handleWebFileContentChange}
                      onAskAthenaAboutSelection={(sel, p) => {
                        setWebSidebarTab("ATHENA");
                      }}
                    />
                  </div>
                )}
                {(webViewMode === "PREVIEW" || webViewMode === "SPLIT") && (
                  <div className="flex-1 h-full overflow-hidden">
                    <WebPreviewFrame
                      websiteId={activeWebsite.artifact.id}
                      files={activeWebsite.files}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Console Panel */}
              <WebConsolePanel
                previewSessionId={`prev-sess-${activeWebsite.artifact.id}`}
                buildLogs={webBuildLogs}
                buildErrors={webBuildErrors}
              />
            </div>
          }
        />

        <WebExportModal
          isOpen={isWebExportOpen}
          websiteId={activeWebsite.artifact.id}
          onClose={() => setIsWebExportOpen(false)}
        />

        <WebMultiFileSuggestionModal
          isOpen={isWebChangeSetOpen}
          changeSets={webService.getPendingChangeSets(activeWebsite.artifact.id)}
          onAccept={async (csId) => {
            await webService.acceptChangeSet(activeWebsite.artifact.id, csId);
            setIsWebChangeSetOpen(false);
            const ref = webService.getWebsite(activeWebsite.artifact.id);
            if (ref) setActiveWebsite(ref);
          }}
          onReject={(csId) => {
            webService.rejectChangeSet(activeWebsite.artifact.id, csId);
            setIsWebChangeSetOpen(false);
          }}
          onClose={() => setIsWebChangeSetOpen(false)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE IMAGE STUDIO WORKSPACE
  // -------------------------------------------------------------
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StudioShell
        title={activeImage!.artifact.name}
        subtitle={`Image Studio (${activeImage!.documentState.canvas.width}x${activeImage!.documentState.canvas.height})`}
        saveState={imageSaveState}
        viewMode={imageViewMode}
        onViewModeChange={setImageViewMode}
        activeSidebarTab={imageSidebarTab}
        onSidebarTabChange={setImageSidebarTab}
        onBackToHub={() => handleBackToHub("IMAGE")}
        onCreateVersion={async () => {
          const label =
            prompt(
              "Descrição da nova versão da imagem:",
              `Versão manual v${(activeImage!.artifact.versions?.length || 0) + 1}`
            ) || "Versão manual";
          const res = await imageService.createManualVersion(activeImage!.artifact.id, label, "USER");
          if (res.success) {
            const ref = imageService.getImage(activeImage!.artifact.id);
            if (ref) setActiveImage(ref);
          }
        }}
        onExport={() => setIsImageExportOpen(true)}
        onDelete={() => {
          if (confirm("Mover esta imagem para a Lixeira de 10 dias?")) {
            imageService.saveDocumentState(activeImage!.artifact.id, activeImage!.documentState, "USER");
            setActiveImage(null);
            loadData();
          }
        }}
        sidebarContent={
          imageSidebarTab === "OUTLINE" ? (
            <ImageLayerPanel
              layers={activeImage!.documentState.layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onToggleVisibility={(layerId) => {
                const updated = activeImage!.documentState.layers.map((l) =>
                  l.id === layerId ? { ...l, visible: !l.visible } : l
                );
                handleUpdateImageDocumentState({ ...activeImage!.documentState, layers: updated });
              }}
              onToggleLock={(layerId) => {
                const updated = activeImage!.documentState.layers.map((l) =>
                  l.id === layerId ? { ...l, locked: !l.locked } : l
                );
                handleUpdateImageDocumentState({ ...activeImage!.documentState, layers: updated });
              }}
              onDeleteLayer={(layerId) => {
                const updated = activeImage!.documentState.layers.filter((l) => l.id !== layerId);
                handleUpdateImageDocumentState({ ...activeImage!.documentState, layers: updated });
                if (selectedLayerId === layerId) setSelectedLayerId(undefined);
              }}
              onDuplicateLayer={(layerId) => {
                const target = activeImage!.documentState.layers.find((l) => l.id === layerId);
                if (target) {
                  const dup: ImageLayer = {
                    ...JSON.parse(JSON.stringify(target)),
                    id: `layer-${Date.now()}`,
                    name: `${target.name} (Cópia)`,
                    transform: {
                      ...target.transform,
                      x: target.transform.x + 30,
                      y: target.transform.y + 30,
                    },
                  };
                  handleUpdateImageDocumentState({
                    ...activeImage!.documentState,
                    layers: [...activeImage!.documentState.layers, dup],
                  });
                  setSelectedLayerId(dup.id);
                }
              }}
              onReorderLayer={(layerId, direction) => {
                const layers = [...activeImage!.documentState.layers];
                const index = layers.findIndex((l) => l.id === layerId);
                if (index < 0) return;
                const newIndex = direction === "UP" ? index + 1 : index - 1;
                if (newIndex >= 0 && newIndex < layers.length) {
                  const temp = layers[index];
                  layers[index] = layers[newIndex];
                  layers[newIndex] = temp;
                  handleUpdateImageDocumentState({ ...activeImage!.documentState, layers });
                }
              }}
              onRenameLayer={(layerId, newName) => {
                const updated = activeImage!.documentState.layers.map((l) =>
                  l.id === layerId ? { ...l, name: newName } : l
                );
                handleUpdateImageDocumentState({ ...activeImage!.documentState, layers: updated });
              }}
            />
          ) : imageSidebarTab === "VERSIONS" ? (
            <DocumentVersionHistory
              versions={activeImage!.artifact.versions || []}
              currentVersionNumber={`v${activeImage!.artifact.versions?.length || 1}.0`}
              onRestoreVersion={async (vNum) => {
                const res = await imageService.restoreVersion(activeImage!.artifact.id, parseInt(vNum) || 1, "USER");
                if (res.success && res.image) {
                  setActiveImage(res.image);
                }
              }}
            />
          ) : imageSidebarTab === "ASSETS" ? (
            <StudioAssetPanel
              artifact={activeImage!.artifact}
              onUpdateArtifact={(updated) => {
                const ref = imageService.getImage(updated.id);
                if (ref) setActiveImage(ref);
                loadData();
              }}
            />
          ) : imageSidebarTab === "RELATIONS" ? (
            <StudioRelationsPanel
              artifact={activeImage!.artifact}
              onUpdateArtifact={(updated) => {
                const ref = imageService.getImage(updated.id);
                if (ref) setActiveImage(ref);
                loadData();
              }}
            />
          ) : imageSidebarTab === "ATHENA" ? (
            <div className="p-4 flex flex-col h-full text-xs text-slate-300 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-white pb-2 border-b border-[#1c1d30]">
                <Sparkles size={14} className="text-amber-400" />
                Athena Visual Assistant
              </div>
              <p className="text-slate-400 text-[11px]">
                Athena analisa a hierarquia de camadas e propõe alinhamentos ou composições automáticas.
              </p>
              {imageService.getPendingChangeSets(activeImage!.artifact.id).length > 0 && (
                <button
                  onClick={() => setIsImageChangeSetOpen(true)}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
                >
                  Ver Proposta Visual
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-500 italic">Nenhum painel selecionado.</div>
          )
        }
        mainContent={
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Toolbar */}
            <ImageToolbar
              canUndo={true}
              canRedo={true}
              onUndo={() => {
                const prev = imageService.undo(activeImage!.artifact.id);
                if (prev) {
                  setActiveImage({ ...activeImage!, documentState: prev });
                  loadData();
                }
              }}
              onRedo={() => {
                const next = imageService.redo(activeImage!.artifact.id);
                if (next) {
                  setActiveImage({ ...activeImage!, documentState: next });
                  loadData();
                }
              }}
              onAddText={() => {
                const textLayer = athenaImageActions.createTextLayer("Novo Texto", 200, 200);
                handleUpdateImageDocumentState({
                  ...activeImage!.documentState,
                  layers: [...activeImage!.documentState.layers, textLayer],
                });
                setSelectedLayerId(textLayer.id);
              }}
              onAddRectangle={() => {
                const rectLayer = athenaImageActions.createShapeLayer("rectangle", 200, 200, 400, 300);
                handleUpdateImageDocumentState({
                  ...activeImage!.documentState,
                  layers: [...activeImage!.documentState.layers, rectLayer],
                });
                setSelectedLayerId(rectLayer.id);
              }}
              onAddEllipse={() => {
                const ellipseLayer = athenaImageActions.createShapeLayer("ellipse", 200, 200, 300, 300);
                handleUpdateImageDocumentState({
                  ...activeImage!.documentState,
                  layers: [...activeImage!.documentState.layers, ellipseLayer],
                });
                setSelectedLayerId(ellipseLayer.id);
              }}
              onImportImageLayer={async (file) => {
                const reader = new FileReader();
                reader.onload = async () => {
                  const raw = reader.result as string;
                  const newLayer: ImageLayer = {
                    id: `layer-${Date.now()}`,
                    type: "IMAGE",
                    name: file.name,
                    visible: true,
                    locked: false,
                    opacity: 1,
                    transform: {
                      x: 100,
                      y: 100,
                      width: 800,
                      height: 600,
                      scaleX: 1,
                      scaleY: 1,
                      rotation: 0,
                    },
                  };
                  handleUpdateImageDocumentState({
                    ...activeImage!.documentState,
                    layers: [...activeImage!.documentState.layers, newLayer],
                  });
                  setSelectedLayerId(newLayer.id);
                };
                reader.readAsDataURL(file);
              }}
              onAskAthena={() => setImageSidebarTab("ATHENA")}
            />

            {/* Central Canvas + Right Properties Panel */}
            <div className="flex-1 flex h-full overflow-hidden">
              <div className="flex-1 h-full overflow-hidden">
                <ImageCanvas
                  documentState={activeImage!.documentState}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                  onUpdateLayerTransform={(lId, t) => {
                    const updated = activeImage!.documentState.layers.map((l) =>
                      l.id === lId ? { ...l, transform: { ...l.transform, ...t } } : l
                    );
                    handleUpdateImageDocumentState({ ...activeImage!.documentState, layers: updated });
                  }}
                />
              </div>

              {/* Right Properties Column */}
              <div className="w-72 h-full border-l border-[#1c1d32] overflow-hidden">
                <ImagePropertiesPanel
                  layer={activeImage!.documentState.layers.find((l) => l.id === selectedLayerId)}
                  onUpdateLayer={(lId, up) => {
                    const updated = activeImage!.documentState.layers.map((l) =>
                      l.id === lId ? { ...l, ...up } : l
                    );
                    handleUpdateImageDocumentState({ ...activeImage!.documentState, layers: updated });
                  }}
                />
              </div>
            </div>
          </div>
        }
      />

      <ImageExportModal
        isOpen={isImageExportOpen}
        artifactId={activeImage!.artifact.id}
        imageTitle={activeImage!.artifact.name}
        onClose={() => setIsImageExportOpen(false)}
      />

      <ImageChangeSetModal
        isOpen={isImageChangeSetOpen}
        changeSets={imageService.getPendingChangeSets(activeImage!.artifact.id)}
        onAccept={async (csId) => {
          await imageService.acceptChangeSet(activeImage!.artifact.id, csId);
          setIsImageChangeSetOpen(false);
          const ref = imageService.getImage(activeImage!.artifact.id);
          if (ref) setActiveImage(ref);
        }}
        onReject={(csId) => {
          imageService.rejectChangeSet(activeImage!.artifact.id, csId);
          setIsImageChangeSetOpen(false);
        }}
        onClose={() => setIsImageChangeSetOpen(false)}
      />
    </div>
  );
}
