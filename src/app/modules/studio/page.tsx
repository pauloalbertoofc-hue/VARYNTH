"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { AudioExportModal } from "@/components/studio/audio/AudioExportModal";
import { AudioTemplatesModal } from "@/components/studio/audio/AudioTemplatesModal";
import { AudioChangeSetModal } from "@/components/studio/audio/AudioChangeSetModal";
import { audioService } from "@/lib/studio/audio/audio-service";
import { athenaAudioActions } from "@/lib/studio/audio/athena-audio-actions";
import { AudioItem, AudioClip, AudioTrack, AudioPlaybackState } from "@/lib/studio/audio/types";

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

import {
  FileText,
  Globe,
  Image as ImageIcon,
  Music,
  Video,
  Plus,
  BookOpen,
  Sparkles,
  ArrowRight,
  Play,
  RotateCw,
  Film,
  Upload,
} from "lucide-react";

export default function StudioPage() {
  const [activeStudio, setActiveStudio] = useState<"DOCUMENT" | "WEB" | "IMAGE" | "AUDIO" | "VIDEO">("DOCUMENT");

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
  const [audioZoom, setAudioZoom] = useState(40); // 40px per second default
  const [audioSidebarTab, setAudioSidebarTab] = useState<"OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA">("OUTLINE");
  const [audioSaveState, setAudioSaveState] = useState<DocumentSaveState>("SAVED");
  const [isAudioExportOpen, setIsAudioExportOpen] = useState(false);
  const [isAudioTemplateOpen, setIsAudioTemplateOpen] = useState(false);
  const [isAudioChangeSetOpen, setIsAudioChangeSetOpen] = useState(false);

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

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  const loadData = () => {
    setAllDocs(documentService.listDocuments());
    setAllWebsites(webService.listWebsites());
    setAllImages(imageService.listImages());
    setAllAudios(audioService.listAudioProjects());
    setAllVideos(videoService.listVideoProjects());
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

  const handleCreateNewDocument = async (template: DocumentTemplate, title: string) => {
    const res = await documentService.createDocument({
      title,
      templateId: template.id,
      documentType: template.type,
      createdBy: "USER",
    });

    if (res.success && res.document) {
      setActiveDoc(res.document);
      loadData();
    }
  };

  // --- Web Studio Handlers ---
  const handleSelectWebsite = (ws: WebsiteItem) => {
    setActiveWebsite(ws);
    const entry = ws.files.find((f) => f.path === "index.html" || f.isEntry) || ws.files[0];
    setActiveWebFile(entry);
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
    if (img.documentState.layers.length > 0) {
      setSelectedLayerId(img.documentState.layers[0].id);
    } else {
      setSelectedLayerId(undefined);
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
    setActiveAudio(aud);
    if (aud.documentState.tracks.length > 0) {
      setSelectedAudioTrackId(aud.documentState.tracks[0].id);
      if (aud.documentState.tracks[0].clips.length > 0) {
        setSelectedAudioClipIds([aud.documentState.tracks[0].clips[0].id]);
      }
    }
  };

  const handleUpdateAudioDocumentState = (updated: AudioItem["documentState"]) => {
    if (!activeAudio) return;
    audioService.pushUndoState(activeAudio.documentState);
    setActiveAudio({ ...activeAudio, documentState: updated });
    setAudioSaveState("SAVING");

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      const res = await audioService.saveDocumentState(activeAudio.artifact.id, updated, "USER");
      if (res.success) {
        setAudioSaveState("SAVED");
        loadData();
      } else {
        setAudioSaveState("SAVE_FAILED");
      }
    }, 800);
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

  const handlePlayAudio = () => {
    if (!activeAudio) return;
    setAudioPlaybackState("PLAYING");
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);

    playbackTimerRef.current = setInterval(() => {
      setActiveAudio((prev) => {
        if (!prev) return null;
        const newPlayhead = prev.documentState.playheadMs + 100;
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
    setAudioPlaybackState("PAUSED");
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
  };

  const handleStopAudio = () => {
    setAudioPlaybackState("STOPPED");
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    if (activeAudio) {
      setActiveAudio({
        ...activeAudio,
        documentState: { ...activeAudio.documentState, playheadMs: 0 },
      });
    }
  };

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
      setActiveVideo(res.video);
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

  // -------------------------------------------------------------
  // HUB VIEW (When no workspace is active)
  // -------------------------------------------------------------
  if (!activeDoc && !activeWebsite && !activeImage && !activeAudio && !activeVideo) {
    return (
      <PageLayout
        title="VARYNTH Studios"
        subtitle="Suíte criativa integrada sobre o Universal Artifact System"
      >
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
          {/* Studio Selector Tabs */}
          <div className="flex items-center gap-3 border-b border-[#1c1d32] pb-3 flex-wrap">
            <button
              onClick={() => setActiveStudio("DOCUMENT")}
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
              onClick={() => setActiveStudio("WEB")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "WEB"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <Globe size={16} />
              Web Studio (Studio 2)
            </button>

            <button
              onClick={() => setActiveStudio("IMAGE")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "IMAGE"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <ImageIcon size={16} />
              Image Studio (Studio 3)
            </button>

            <button
              onClick={() => setActiveStudio("AUDIO")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "AUDIO"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <Music size={16} />
              Audio Studio (Studio 4)
            </button>

            <button
              onClick={() => setActiveStudio("VIDEO")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition ${
                activeStudio === "VIDEO"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-[#111220] text-slate-400 hover:text-white border border-[#1e2038]"
              }`}
            >
              <Video size={16} />
              Video Studio (Studio 5)
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
                        onClick={() => setActiveDoc(doc)}
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
      </PageLayout>
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
              <div className="p-4 text-xs text-slate-500 italic">Nenhum asset vinculado no momento.</div>
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

    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <StudioShell
          title={activeAudio.artifact.name}
          subtitle={`Audio Studio (${Math.round(activeAudio.documentState.timeline.durationMs / 1000)}s | ${activeAudio.documentState.tracks.length} faixas)`}
          saveState={audioSaveState}
          viewMode="EDIT"
          onViewModeChange={() => {}}
          activeSidebarTab={audioSidebarTab}
          onSidebarTabChange={setAudioSidebarTab}
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
          sidebarContent={
            audioSidebarTab === "OUTLINE" ? (
              <div className="p-4 flex flex-col h-full text-xs text-slate-300 space-y-3">
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
              <div className="p-4 text-xs text-slate-500 italic">Nenhum asset vinculado no momento.</div>
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
                onPlay={handlePlayAudio}
                onPause={handlePauseAudio}
                onStop={handleStopAudio}
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
                onAddTrack={() => {
                  const newTrack = athenaAudioActions.createTrack(
                    `Faixa ${activeAudio.documentState.tracks.length + 1}`,
                    "AUDIO"
                  );
                  handleUpdateAudioDocumentState({
                    ...activeAudio.documentState,
                    tracks: [...activeAudio.documentState.tracks, newTrack],
                  });
                  setSelectedAudioTrackId(newTrack.id);
                }}
                onImportAudio={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "audio/wav,audio/mp3,audio/mpeg,audio/ogg,audio/m4a";
                  input.onchange = async (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const raw = reader.result as string;
                        const res = await audioService.importAudio({
                          name: file.name,
                          mimeType: file.type || "audio/wav",
                          sizeBytes: file.size,
                          data: raw,
                          actor: "USER",
                        });
                        if (res.success && res.audio) {
                          handleSelectAudio(res.audio);
                          loadData();
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                onAskAthena={() => setAudioSidebarTab("ATHENA")}
              />

              {/* Timeline + Properties Grid */}
              <div className="flex-1 flex h-full overflow-hidden">
                <div className="flex-1 h-full overflow-hidden">
                  <AudioTimeline
                    documentState={activeAudio.documentState}
                    zoom={audioZoom}
                    selectedTrackId={selectedAudioTrackId}
                    selectedClipIds={selectedAudioClipIds}
                    onSelectTrack={setSelectedAudioTrackId}
                    onSelectClip={(cId) => setSelectedAudioClipIds([cId])}
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
                  />
                </div>

                {/* Right Properties Column */}
                <div className="w-72 h-full border-l border-[#1c1d32] overflow-hidden">
                  <AudioPropertiesPanel
                    selectedClip={selectedClip}
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
                      const updatedTracks = activeAudio.documentState.tracks.map((t) =>
                        t.id === trackId ? { ...t, ...updates } : t
                      );
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
                </div>
              </div>
            </div>
          }
        />

        <AudioExportModal
          isOpen={isAudioExportOpen}
          artifactId={activeAudio.artifact.id}
          audioTitle={activeAudio.artifact.name}
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
              <div className="p-4 text-xs text-slate-500 italic">Nenhum asset vinculado no momento.</div>
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
              <div className="p-4 text-xs text-slate-500 italic">Nenhum asset ou relação vinculado.</div>
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
            <div className="p-4 text-xs text-slate-500 italic">Nenhum asset vinculado no momento.</div>
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
