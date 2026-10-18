"use client";

import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircleStop, Download, Focus, Flashlight, Maximize2, Minimize2, RefreshCw, Settings2, ShieldCheck, Video } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  CameraSession,
  getCameraMedia,
  getCameraModeProfile,
  listCameraCaptures,
  saveCameraCapture,
  saveCameraMedia,
  type CameraCapabilities,
  type CameraCaptureRecord,
  type CameraMode,
  applyCinematicLightingBuffer,
  suggestCameraCorrection,
  describeCameraError,
} from "@/lib/visual-core";
import { imageService } from "@/lib/studio/image/image-service";
import {
  analyzeCameraFrame,
  type CameraQualityReport,
} from "@/lib/visual-core";

export default function CameraPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CameraSession | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const wakeLockRequestRef = useRef<Promise<void> | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null);
  const [correctedBlob, setCorrectedBlob] = useState<Blob | null>(null);
  const [correctedUrl, setCorrectedUrl] = useState<string | null>(null);
  const [useCorrection, setUseCorrection] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isSendingToStudio, setIsSendingToStudio] = useState(false);
  const [quality, setQuality] = useState<CameraQualityReport | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<CameraMode>("AUTO");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [activeFacingMode, setActiveFacingMode] = useState<string | null>(null);
  const [activeSettings, setActiveSettings] = useState<MediaTrackSettings | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });
  const [focusStatus, setFocusStatus] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchZoomRef = useRef(1);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const captureRecordIdRef = useRef<string | null>(null);
  const [captures, setCaptures] = useState<CameraCaptureRecord[]>([]);
  const [storedMediaUrls, setStoredMediaUrls] = useState<
    Record<string, string>
  >({});
  const storedMediaUrlsRef = useRef<Record<string, string>>({});
  const [openingCaptureId, setOpeningCaptureId] = useState<string | null>(null);
  const [persistedComparison, setPersistedComparison] = useState<{ id: string; originalUrl: string; correctedUrl: string } | null>(null);

  const releaseScreenWakeLock = () => {
    const wakeLock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (wakeLock) void wakeLock.release().catch(() => undefined);
  };

  const requestScreenWakeLock = async () => {
    if (!("wakeLock" in navigator) || wakeLockRef.current || wakeLockRequestRef.current) return;
    const pendingRequest = (async () => {
      try {
        const wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          if (wakeLockRef.current === wakeLock) wakeLockRef.current = null;
        }, { once: true });
        wakeLockRef.current = wakeLock;
      } catch {
        // Wake Lock is optional and may be denied by the browser or power policy.
      }
    })();
    wakeLockRequestRef.current = pendingRequest;
    try {
      await pendingRequest;
    } finally {
      if (wakeLockRequestRef.current === pendingRequest) wakeLockRequestRef.current = null;
    }
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("varynth_camera_preferences_v1") || "null") as { mode?: CameraMode; facingMode?: "environment" | "user"; timerSeconds?: 0 | 3 | 10; selectedDeviceId?: string } | null;
      if (stored?.mode) setMode(stored.mode);
      if (stored?.facingMode) setFacingMode(stored.facingMode);
      if (stored?.timerSeconds !== undefined) setTimerSeconds(stored.timerSeconds);
      if (stored?.selectedDeviceId) setSelectedDeviceId(stored.selectedDeviceId);
    } catch { /* preferences are optional and fail closed */ }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("varynth_camera_preferences_v1", JSON.stringify({ mode, facingMode, timerSeconds, selectedDeviceId }));
  }, [facingMode, mode, selectedDeviceId, timerSeconds]);

  useEffect(() => {
    setCaptures(listCameraCaptures());
  }, []);

  useEffect(() => {
    if (!immersiveMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (reviewOpen) return;
      if (event.key !== "Escape") return;
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      setImmersiveMode(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [immersiveMode, reviewOpen, settingsOpen]);

  useEffect(() => {
    if (!reviewOpen) return;
    const handleReviewKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReviewOpen(false);
    };
    window.addEventListener("keydown", handleReviewKeyDown);
    return () => window.removeEventListener("keydown", handleReviewKeyDown);
  }, [reviewOpen]);

  useEffect(() => {
    let cancelled = false;
    const records = listCameraCaptures().slice(0, 20);
    void Promise.all(
      records.map(
        async (record) => [record.id, await getCameraMedia(record.id)] as const,
      ),
    ).then((items) => {
      const next: Record<string, string> = {};
      for (const [id, blob] of items)
        if (blob) next[id] = URL.createObjectURL(blob);
      if (cancelled) {
        Object.values(next).forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      Object.values(storedMediaUrlsRef.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
      storedMediaUrlsRef.current = next;
      setStoredMediaUrls(next);
    });
    return () => {
      cancelled = true;
    };
  }, [captures]);

  useEffect(
    () => () => {
      Object.values(storedMediaUrlsRef.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
    },
    [],
  );

  useEffect(
    () => () => {
      sessionRef.current?.stop();
      releaseScreenWakeLock();
    },
    [],
  );

  useEffect(() => {
    if (!active) return;
    const reacquire = () => {
      if (document.visibilityState === "visible") void requestScreenWakeLock();
    };
    document.addEventListener("visibilitychange", reacquire);
    void requestScreenWakeLock();
    return () => document.removeEventListener("visibilitychange", reacquire);
  }, [active]);

  useEffect(
    () => () => {
      if (captureUrl) URL.revokeObjectURL(captureUrl);
    },
    [captureUrl],
  );

  useEffect(() => () => {
    if (correctedUrl) URL.revokeObjectURL(correctedUrl);
  }, [correctedUrl]);

  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );

  useEffect(() => () => {
    if (persistedComparison) {
      URL.revokeObjectURL(persistedComparison.originalUrl);
      URL.revokeObjectURL(persistedComparison.correctedUrl);
    }
  }, [persistedComparison]);

  const start = async (requestedFacingMode: "environment" | "user" = facingMode, requestedDeviceId = selectedDeviceId, restarting = false) => {
    if (!videoRef.current || (!restarting && active) || isStarting) return;
    setIsStarting(true);
    setError(null);
    const session = new CameraSession();
    const startWithTimeout = async (constraints: MediaStreamConstraints) => {
      let timeoutId: number | undefined;
      try {
        return await Promise.race([
          session.start(videoRef.current!, constraints),
          new Promise<never>((_, reject) => {
            timeoutId = window.setTimeout(() => reject(new Error("CAMERA_START_TIMEOUT")), 15000);
          }),
        ]);
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      }
    };
    try {
      const profile = getCameraModeProfile(mode);
      const profileVideo = typeof profile.constraints.video === "object" ? profile.constraints.video : {};
      const constraints: MediaStreamConstraints = {
        ...profile.constraints,
        video: { ...profileVideo, ...(requestedDeviceId ? { deviceId: { exact: requestedDeviceId } } : { facingMode: { exact: requestedFacingMode } }) },
      };
      let detected: CameraCapabilities;
      try {
        detected = await startWithTimeout(constraints);
      } catch (cause) {
        const staleDevice = Boolean(requestedDeviceId) && (cause instanceof DOMException ? cause.name === "OverconstrainedError" : String(cause).includes("OverconstrainedError"));
        if (!staleDevice) throw cause;
        const fallbackConstraints: MediaStreamConstraints = {
          ...profile.constraints,
          video: { ...profileVideo, facingMode: { ideal: requestedFacingMode } },
        };
        setSelectedDeviceId("");
        detected = await startWithTimeout(fallbackConstraints);
      }
      sessionRef.current = session;
      setCapabilities(detected);
      const activeTrackSettings = (videoRef.current.srcObject as MediaStream | null)?.getVideoTracks()[0]?.getSettings() ?? null;
      setActiveSettings(activeTrackSettings);
      setActiveFacingMode(activeTrackSettings?.facingMode ?? requestedFacingMode);
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput");
        setVideoDevices(devices);
        const actualDeviceId = (videoRef.current.srcObject as MediaStream | null)?.getVideoTracks()[0]?.getSettings().deviceId;
        if (actualDeviceId) setSelectedDeviceId(actualDeviceId);
      }
      const trackCapabilities = session.getVideoTrack()?.getCapabilities() as MediaTrackCapabilities & { zoom?: { min?: number; max?: number; step?: number }; torch?: boolean } | undefined;
      setZoom(trackCapabilities?.zoom?.min ?? 1);
      setZoomRange({ min: trackCapabilities?.zoom?.min ?? 1, max: trackCapabilities?.zoom?.max ?? 1, step: trackCapabilities?.zoom?.step ?? 0.1 });
      setActive(true);
    } catch (cause) {
      session.stop();
      sessionRef.current = null;
      setActiveFacingMode(null);
      setActiveSettings(null);
      setError(describeCameraError(cause));
      setActive(false);
    } finally {
      setIsStarting(false);
    }
  };

  const refreshActiveTrackSettings = () => {
    const settings = sessionRef.current?.getVideoTrack()?.getSettings() ?? null;
    setActiveSettings(settings);
    if (settings?.facingMode) setActiveFacingMode(settings.facingMode);
  };

  const stop = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    releaseScreenWakeLock();
    setError(null);
    setActiveFacingMode(null);
    setActiveSettings(null);
    setTorchOn(false);
    setZoom(1);
    setZoomRange({ min: 1, max: 1, step: 0.1 });
    setActive(false);
  };

  const switchCamera = async () => {
    const nextFacingMode = facingMode === "environment" ? "user" : "environment";
    setError(null);
    if (active || isStarting) stop();
    setSelectedDeviceId("");
    setFacingMode(nextFacingMode);
    await start(nextFacingMode, "", true);
  };

  const applyTorch = async () => {
    const next = !torchOn;
    try {
      await sessionRef.current?.applyVideoConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
      refreshActiveTrackSettings();
    } catch (cause) {
      setError(describeCameraError(cause));
    }
  };

  const applyZoom = async (value: number) => {
    try {
      await sessionRef.current?.applyVideoConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
      setZoom(value);
      refreshActiveTrackSettings();
    } catch (cause) {
      setError(describeCameraError(cause));
    }
  };

  const touchDistance = (touches: { item: (index: number) => { clientX: number; clientY: number } | null }) => {
    const first = touches.item(0);
    const second = touches.item(1);
    if (!first || !second) return null;
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };

  const handleTouchStart = (event: TouchEvent<HTMLVideoElement>) => {
    if (!active || capabilities?.zoom.state !== "supported" || event.touches.length !== 2) return;
    pinchDistanceRef.current = touchDistance(event.touches);
    pinchZoomRef.current = zoom;
  };

  const handleTouchMove = (event: TouchEvent<HTMLVideoElement>) => {
    if (!pinchDistanceRef.current || event.touches.length !== 2) return;
    const nextDistance = touchDistance(event.touches);
    if (!nextDistance) return;
    event.preventDefault();
    const ratio = nextDistance / pinchDistanceRef.current;
    const rawZoom = pinchZoomRef.current * ratio;
    const value = Math.max(zoomRange.min, Math.min(zoomRange.max, Math.round(rawZoom / zoomRange.step) * zoomRange.step));
    if (Math.abs(value - zoom) >= zoomRange.step) void applyZoom(value);
  };

  const handleTouchEnd = () => {
    pinchDistanceRef.current = null;
  };

  const focusAtPoint = async (event: MouseEvent<HTMLVideoElement>) => {
    if (!active || capabilities?.focus.state !== "supported" || !videoRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    setFocusPoint({ x, y });
    window.setTimeout(() => setFocusPoint(null), 1400);
    try {
      await sessionRef.current?.applyVideoConstraints({ advanced: [{ focusMode: "single-shot", pointsOfInterest: [{ x, y }] } as MediaTrackConstraintSet] });
      refreshActiveTrackSettings();
      setFocusStatus(`Foco solicitado · ${Math.round(x * 100)}%, ${Math.round(y * 100)}%`);
    } catch (cause) {
      setFocusStatus(cause instanceof Error && cause.message === "CAMERA_CONSTRAINT_UNAVAILABLE" ? "O hardware não aceitou o foco solicitado" : "Não foi possível aplicar o foco neste momento");
    }
  };

  const capture = async () => {
    if (isCountingDown || !sessionRef.current) return;
    try {
      if (timerSeconds > 0) {
        setIsCountingDown(true);
        await new Promise((resolve) => window.setTimeout(resolve, timerSeconds * 1000));
      }
      const result = await sessionRef.current?.capture();
      if (!result) return;
      if (captureUrl) URL.revokeObjectURL(captureUrl);
      setCaptureUrl(URL.createObjectURL(result.blob));
      setCaptureBlob(result.blob);
      const report = await analyzeCameraFrame(result.blob);
      setQuality(report);
      let correctionAvailable = false;
      let correctedResultBlob: Blob | null = null;
      try {
        const corrected = await createAutomaticCorrection(result.blob, report);
        if (corrected) {
          correctionAvailable = true;
          correctedResultBlob = corrected;
          if (correctedUrl) URL.revokeObjectURL(correctedUrl);
          setCorrectedBlob(corrected);
          setCorrectedUrl(URL.createObjectURL(corrected));
          setUseCorrection(false);
        } else {
          setCorrectedBlob(null);
          setCorrectedUrl(null);
          setUseCorrection(false);
        }
      } catch {
        setCorrectedBlob(null);
        setCorrectedUrl(null);
        setUseCorrection(false);
        setError("A correção automática não está disponível; o original foi preservado.");
      }
      const recordId = `capture-${Date.now()}`;
      captureRecordIdRef.current = recordId;
      const originalStored = await saveCameraMedia(recordId, result.blob);
      const correctedMediaId = correctedResultBlob ? `${recordId}-corrected` : undefined;
      const correctedStored = correctedResultBlob && correctedMediaId
        ? await saveCameraMedia(correctedMediaId, correctedResultBlob)
        : false;
      const record = {
        id: recordId,
        ...(correctedStored && correctedMediaId ? { correctedMediaId } : {}),
        mode,
        capturedAt: result.capturedAt,
        source: "DEVICE_CAMERA" as const,
        generated: false as const,
        metadata: {
          quality: report,
          capabilities,
          cameraSettings: sessionRef.current?.getVideoTrack()?.getSettings() ?? null,
          captureMethod: result.captureMethod,
          captureWidth: result.width,
          captureHeight: result.height,
          mimeType: result.mimeType,
          correctionAvailable,
          correctionPolicy: "LOCAL_CONSERVATIVE_EXPOSURE_CONTRAST",
          storedLocally: originalStored && (!correctedResultBlob || correctedStored),
        },
      };
      saveCameraCapture(record);
      setCaptures(listCameraCaptures());
      setReviewOpen(true);
    } catch (cause) {
      setError(describeCameraError(cause));
    } finally {
      setIsCountingDown(false);
    }
  };

  const createAutomaticCorrection = async (blob: Blob, report: CameraQualityReport): Promise<Blob | null> => {
    if (typeof createImageBitmap !== "function") return null;
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) { bitmap.close(); return null; }
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const corrected = applyCinematicLightingBuffer(image.data, suggestCameraCorrection(report), canvas.width, canvas.height);
    image.data.set(corrected);
    context.putImageData(image, 0, 0);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  };

  const recordVideo = async () => {
    if (!sessionRef.current || mode !== "VIDEO") return;
    setError(null);
    setIsRecording(true);
    try {
      const result = await sessionRef.current.recordVideo();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(result.blob));
      const recordId = `video-${Date.now()}`;
      void saveCameraMedia(recordId, result.blob);
      saveCameraCapture({
        id: recordId,
        mode,
        capturedAt: result.capturedAt,
        source: "DEVICE_CAMERA",
        generated: false,
        metadata: {
          mimeType: result.mimeType,
          durationMs: result.durationMs,
          media: "VIDEO",
          cameraSettings: sessionRef.current?.getVideoTrack()?.getSettings() ?? null,
          storedLocally: typeof indexedDB !== "undefined",
        },
      });
      setCaptures(listCameraCaptures());
    } catch (cause) {
      setError(describeCameraError(cause));
    } finally {
      setIsRecording(false);
    }
  };

  const openInImageStudio = async () => {
    const blobToOpen = useCorrection && correctedBlob ? correctedBlob : captureBlob;
    if (!blobToOpen) return;
    setIsSendingToStudio(true);
    const result = await imageService.importImage({
      name: `camera-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`,
      mimeType: "image/jpeg",
      sizeBytes: blobToOpen.size,
      data: blobToOpen,
      actor: "USER",
      captureMetadata: {
        source: "DEVICE_CAMERA",
        generated: false,
        capturedAt: new Date().toISOString(),
        cameraSettings: sessionRef.current?.getVideoTrack()?.getSettings() ?? null,
        selectedVersion: useCorrection && correctedBlob ? "CORRECTED" : "ORIGINAL",
        correctionPolicy: useCorrection && correctedBlob ? "LOCAL_CONSERVATIVE_EXPOSURE_CONTRAST" : "NONE",
        userApprovedCorrection: useCorrection && Boolean(correctedBlob),
      },
    });
    setIsSendingToStudio(false);
    if (!result.success || !result.image) {
      setError(result.error ?? "CAMERA_IMPORT_TO_STUDIO_FAILED");
      return;
    }
    const captureId = captureRecordIdRef.current ?? `capture-${Date.now()}`;
    const previousCapture = listCameraCaptures().find((capture) => capture.id === captureId);
    saveCameraCapture({
      ...(previousCapture ?? {}),
      id: captureId,
      originalAssetId: String(
        result.image.artifact.metadata.sourceAssetId ?? "",
      ),
      imageArtifactId: result.image.artifact.id,
      mode,
      capturedAt: new Date().toISOString(),
      source: "DEVICE_CAMERA",
      generated: false,
      metadata: {
        ...(previousCapture?.metadata ?? {}),
        quality,
        capabilities,
        selectedVersion: useCorrection && correctedBlob ? "CORRECTED" : "ORIGINAL",
        correctionPolicy: useCorrection && correctedBlob ? "LOCAL_CONSERVATIVE_EXPOSURE_CONTRAST" : "NONE",
        userApprovedCorrection: useCorrection && Boolean(correctedBlob),
      },
    });
    setCaptures(listCameraCaptures());
    router.push(`/modules/studio?studio=IMAGE&id=${encodeURIComponent(result.image.artifact.id)}`);
  };

  const openStoredCaptureInImageStudio = async (
    capture: CameraCaptureRecord,
    mediaId = capture.id,
    selectedVersion: "ORIGINAL" | "CORRECTED" = "ORIGINAL",
  ) => {
    const blob = await getCameraMedia(mediaId);
    if (!blob) {
      setError("CAMERA_ORIGINAL_NOT_AVAILABLE");
      return;
    }
    setOpeningCaptureId(capture.id);
    const result = await imageService.importImage({
      name: `${capture.id}-${selectedVersion.toLowerCase()}.${capture.metadata.media === "VIDEO" ? "webm" : "jpg"}`,
      mimeType: blob.type || "image/jpeg",
      sizeBytes: blob.size,
      data: blob,
      actor: "USER",
      captureMetadata: {
        source: "DEVICE_CAMERA",
        generated: false,
        capturedAt: capture.capturedAt,
        cameraSettings: (capture.metadata.cameraSettings as MediaTrackSettings | null | undefined) ?? null,
        selectedVersion,
        correctionPolicy: typeof capture.metadata.correctionPolicy === "string" ? capture.metadata.correctionPolicy : "NONE",
        userApprovedCorrection: capture.metadata.userApprovedCorrection === true,
      },
    });
    setOpeningCaptureId(null);
    if (!result.success || !result.image) {
      setError(result.error ?? "CAMERA_IMPORT_TO_STUDIO_FAILED");
      return;
    }
    router.push(`/modules/studio?studio=IMAGE&id=${encodeURIComponent(result.image.artifact.id)}`);
  };

  const compareStoredCapture = async (capture: CameraCaptureRecord) => {
    if (!capture.correctedMediaId) return;
    const [original, corrected] = await Promise.all([getCameraMedia(capture.id), getCameraMedia(capture.correctedMediaId)]);
    if (!original || !corrected) {
      setError("A variante original ou corrigida não está disponível neste dispositivo.");
      return;
    }
    if (persistedComparison) {
      URL.revokeObjectURL(persistedComparison.originalUrl);
      URL.revokeObjectURL(persistedComparison.correctedUrl);
    }
    setPersistedComparison({ id: capture.id, originalUrl: URL.createObjectURL(original), correctedUrl: URL.createObjectURL(corrected) });
  };

  const comparisonCapture = persistedComparison ? captures.find((capture) => capture.id === persistedComparison.id) : null;
  const currentCapture = captureRecordIdRef.current ? captures.find((capture) => capture.id === captureRecordIdRef.current) : null;

  return (
    <PageLayout
      title="Varynth Camera"
      subtitle="Captura real, proveniência preservada e capacidades honestas do dispositivo"
    >
      {reviewOpen && captureUrl && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/90 p-3 backdrop-blur-xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="camera-review-title">
          <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
            <section className="w-full overflow-hidden rounded-3xl border border-white/15 bg-[#0b0f16] shadow-2xl">
              <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Revisão da captura</p>
                  <h2 id="camera-review-title" className="mt-1 text-lg font-bold text-white">Original ou correção sugerida?</h2>
                  <p className="mt-1 text-xs text-slate-400">O original permanece preservado. A correção só será usada após sua escolha.</p>
                </div>
                <button type="button" onClick={() => setReviewOpen(false)} aria-label="Fechar revisão e voltar à câmera" className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white">Voltar</button>
              </header>
              <div className="grid grid-cols-2 gap-2 p-3 sm:gap-4 sm:p-6">
                <button type="button" onClick={() => setUseCorrection(false)} aria-pressed={!useCorrection} className={`min-w-0 overflow-hidden rounded-2xl border text-left transition ${!useCorrection ? "border-cyan-300 ring-2 ring-cyan-300/30" : "border-white/10"}`}>
                  <img src={captureUrl} alt="Foto original preservada" className="h-[42dvh] min-h-52 w-full bg-black object-contain" />
                  <span className="flex items-center justify-between gap-2 bg-white/[0.04] px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-white sm:text-xs"><span>Original preservado</span>{!useCorrection && <span className="rounded-full bg-cyan-300 px-2 py-1 text-[9px] text-slate-950">Selecionado</span>}</span>
                </button>
                {correctedUrl ? (
                  <button type="button" onClick={() => setUseCorrection(true)} aria-pressed={useCorrection} className={`min-w-0 overflow-hidden rounded-2xl border text-left transition ${useCorrection ? "border-cyan-300 ring-2 ring-cyan-300/30" : "border-white/10"}`}>
                    <img src={correctedUrl} alt="Foto com correção automática sugerida" className="h-[42dvh] min-h-52 w-full bg-black object-contain" />
                    <span className="flex items-center justify-between gap-2 bg-white/[0.04] px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-white sm:text-xs"><span>Correção sugerida</span>{useCorrection && <span className="rounded-full bg-cyan-300 px-2 py-1 text-[9px] text-slate-950">Selecionada</span>}</span>
                  </button>
                ) : (
                  <div className="flex min-h-52 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-center text-xs text-slate-400">A correção automática não está disponível neste navegador. O original continua pronto para uso.</div>
                )}
              </div>
              <div className="border-t border-white/10 px-4 py-4 sm:px-6">
                {Boolean(currentCapture?.metadata.captureWidth && currentCapture?.metadata.captureHeight) && <p className="mb-3 text-center text-[10px] uppercase tracking-wider text-slate-500">{String(currentCapture?.metadata.captureWidth)}×{String(currentCapture?.metadata.captureHeight)} · {currentCapture?.metadata.captureMethod === "NATIVE_PHOTO" ? "foto nativa do sensor" : "frame de compatibilidade"}</p>}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button type="button" onClick={() => setReviewOpen(false)} className="rounded-xl border border-white/15 px-4 py-3 text-xs font-bold text-white">Continuar fotografando</button>
                  <a href={captureUrl} download="varynth-camera-original.jpg" className="rounded-xl border border-white/15 px-4 py-3 text-xs font-bold text-white">Baixar original</a>
                  <button type="button" onClick={() => void openInImageStudio()} disabled={isSendingToStudio} className="rounded-xl bg-cyan-300 px-5 py-3 text-xs font-bold text-slate-950 disabled:opacity-50">{isSendingToStudio ? "Abrindo..." : `Usar ${useCorrection && correctedBlob ? "correção" : "original"} no Image Studio`}</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
        <section className={`${immersiveMode ? "fixed inset-0 z-50 flex flex-col rounded-none border-0" : "overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)]"} bg-[var(--vly-surface-panel)]`}>
          <div className={`${immersiveMode ? "min-h-0 flex-1" : "aspect-[3/4] sm:aspect-video"} relative bg-black`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              onClick={(event) => void focusAtPoint(event)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              aria-label={capabilities?.focus.state === "supported" ? "Preview da câmera; toque para focar" : "Preview da câmera"}
              className="h-full w-full touch-none object-contain"
            />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-3 text-[10px] font-semibold tracking-[0.18em] text-white/80">
                <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${active ? "bg-red-400 shadow-[0_0_12px_#fb7185]" : "bg-white/40"}`} />{active ? "LIVE" : "READY"}</span>
                <span>{facingMode === "environment" ? "REAR CAMERA" : "FRONT CAMERA"} · {mode}</span>
              </div>
              {active && <>
                <div className="absolute inset-[14%] rounded-[2rem] border border-white/35" />
                <div className="absolute inset-x-[14%] top-1/2 border-t border-white/15" />
                <div className="absolute inset-y-[14%] left-1/2 border-l border-white/15" />
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[10px] text-white/75 backdrop-blur"><Focus size={12} /> GUIA DE ENQUADRAMENTO</div>
                {focusPoint && <div aria-hidden="true" className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.65)]" style={{ left: `${focusPoint.x * 100}%`, top: `${focusPoint.y * 100}%` }} />}
              </>}
            </div>
            <div className="absolute right-3 top-12 z-10 flex gap-2">
              <button type="button" onClick={() => setSettingsOpen((value) => !value)} aria-label={settingsOpen ? "Ocultar configurações da câmera" : "Abrir configurações da câmera"} aria-pressed={settingsOpen} className="pointer-events-auto rounded-full border border-white/20 bg-black/50 p-3 text-white backdrop-blur"><Settings2 size={18} /></button>
              <button type="button" onClick={() => { const nextImmersiveMode = !immersiveMode; setImmersiveMode(nextImmersiveMode); setSettingsOpen(!nextImmersiveMode); }} aria-label={immersiveMode ? "Sair do modo imersivo" : "Abrir modo imersivo"} aria-pressed={immersiveMode} className="pointer-events-auto rounded-full border border-white/20 bg-black/50 p-3 text-white backdrop-blur">{immersiveMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
            </div>
            {immersiveMode && !settingsOpen && <button type="button" onClick={() => void capture()} disabled={!active || isCountingDown} aria-label="Capturar foto" className="absolute bottom-8 left-1/2 z-20 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white/70 bg-[var(--vly-info)] text-white shadow-2xl disabled:opacity-40"><Camera size={28} /></button>}
            {!active && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-[var(--vly-text-secondary)]">
                <Camera size={34} />
                <p className="text-sm">A câmera ainda não foi iniciada.</p>
              </div>
            )}
          </div>
          <div role="status" aria-live="polite" className="flex items-center justify-between border-t border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--vly-text-muted)]">
            <span>VARYNTH OPTICAL CAPTURE</span>
            <span>{activeSettings ? `${activeSettings.width ?? "—"}×${activeSettings.height ?? "—"} · ${activeSettings.frameRate ? Math.round(activeSettings.frameRate) : "—"} fps` : "Sem track ativo"}</span>
          </div>
          <div className={`${immersiveMode && !settingsOpen ? "hidden" : ""} ${immersiveMode ? "absolute bottom-4 inset-x-4 z-20 rounded-2xl border border-white/20 bg-black/65 p-4 backdrop-blur-xl" : "border-t border-[var(--vly-border-subtle)] p-4"} flex flex-wrap items-center gap-2`}>
            <select
              value={mode}
              onChange={(event) => { setError(null); setMode(event.target.value as CameraMode); }}
              disabled={active}
              className="vly-field rounded-lg px-3 py-2 text-xs font-semibold"
            >
              <option value="AUTO">AUTO</option>
              <option value="SMART">SMART</option>
              <option value="PRO">PRO</option>
              <option value="DOCUMENT">DOCUMENT</option>
              <option value="VIDEO">VIDEO</option>
              <option value="STUDIO">STUDIO</option>
            </select>
            {videoDevices.length > 1 && <><label className="sr-only" htmlFor="camera-device">Dispositivo de câmera</label><select id="camera-device" value={selectedDeviceId} onChange={(event) => { setError(null); setSelectedDeviceId(event.target.value); }} disabled={active} className="vly-field max-w-48 rounded-lg px-3 py-2 text-xs font-semibold"><option value="">Dispositivo padrão</option>{videoDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Câmera ${index + 1}`}</option>)}</select></>}
            <label className="sr-only" htmlFor="camera-timer">Temporizador</label>
            <select id="camera-timer" value={timerSeconds} onChange={(event) => setTimerSeconds(Number(event.target.value) as 0 | 3 | 10)} disabled={active === false || isCountingDown} className="vly-field rounded-lg px-3 py-2 text-xs font-semibold">
              <option value="0">Sem timer</option><option value="3">Timer 3s</option><option value="10">Timer 10s</option>
            </select>
            <label className="sr-only" htmlFor="camera-facing">Câmera</label>
            <select
              id="camera-facing"
              value={facingMode}
              onChange={(event) => { setError(null); setFacingMode(event.target.value as "environment" | "user"); }}
              disabled={active}
              className="vly-field rounded-lg px-3 py-2 text-xs font-semibold"
            >
              <option value="environment">Traseira</option>
              <option value="user">Frontal</option>
            </select>
            {active && <button type="button" onClick={() => void switchCamera()} disabled={isStarting} aria-label={`Alternar para câmera ${facingMode === "environment" ? "frontal" : "traseira"}`} className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)] disabled:opacity-50"><RefreshCw size={14} className="mr-2" />Alternar câmera</button>}
            {!active ? (
              <button
                onClick={() => void start()}
                disabled={isStarting}
                className="vly-interactive rounded-lg bg-[var(--vly-accent)] px-4 py-2 text-xs font-bold text-[var(--vly-accent-contrast)] disabled:cursor-wait disabled:opacity-60"
              >
                <Video size={14} className="mr-2 inline" />
                {isStarting ? "Iniciando..." : "Iniciar câmera"}
              </button>
            ) : (
              <button
                onClick={stop}
                className="vly-interactive rounded-lg border border-[var(--vly-border-strong)] px-4 py-2 text-xs font-bold text-[var(--vly-text-primary)]"
              >
                <CircleStop size={14} className="mr-2 inline" />
                Parar
              </button>
            )}
            <button
              type="button"
              onClick={() => void capture()}
              aria-label={isCountingDown ? "Temporizador ativo" : "Capturar foto"}
              disabled={!active || isCountingDown}
              className="vly-interactive inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--vly-info)] px-0 py-0 text-xs font-bold text-white shadow-[0_0_0_4px_rgba(255,255,255,0.18),0_8px_24px_rgba(0,0,0,0.28)] disabled:opacity-40 sm:h-auto sm:w-auto sm:rounded-lg sm:px-4 sm:py-2 sm:shadow-none"
            >
              <Camera size={14} className="mr-2 inline" />
              <span className="hidden sm:inline">{isCountingDown ? "Temporizador ativo…" : "Capturar frame"}</span>
            </button>
            {mode === "VIDEO" && (
              <button
                onClick={() => void recordVideo()}
                disabled={!active || isRecording}
                className="vly-interactive rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                {isRecording ? "Gravando 5s..." : "Gravar vídeo 5s"}
              </button>
            )}
            {active && capabilities?.torch.state === "supported" && <button type="button" onClick={() => void applyTorch()} className={`vly-interactive rounded-lg border px-3 py-2 text-xs font-bold ${torchOn ? "border-amber-300/60 text-amber-200" : "border-[var(--vly-border-strong)] text-[var(--vly-text-primary)]"}`}><Flashlight size={14} className="mr-2 inline" />{torchOn ? "Torch ligada" : "Torch"}</button>}
          </div>
          {active && capabilities?.zoom.state === "supported" && <label className={`${immersiveMode ? "absolute bottom-28 inset-x-4 z-20 rounded-full bg-black/60 px-4 py-3 backdrop-blur" : "border-t border-[var(--vly-border-subtle)] px-4 py-3"} flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-[var(--vly-text-muted)]`}>Zoom <input aria-label="Zoom da câmera" type="range" min={String(zoomRange.min)} max={String(zoomRange.max)} step={String(zoomRange.step)} value={zoom} onChange={(event) => void applyZoom(Number(event.target.value))} className="flex-1 accent-[var(--vly-accent)]" /><span className="w-10 text-right">{zoom.toFixed(1)}×</span></label>}
          <p role="status" aria-live="polite" className="border-t border-[var(--vly-border-subtle)] px-4 py-2 text-[11px] text-[var(--vly-text-muted)]">
            {getCameraModeProfile(mode).description}
            {getCameraModeProfile(mode).requiresHardwareControls
              ? " Controles manuais dependem das capacidades reais do track."
              : ""}
            {activeFacingMode ? ` Câmera aplicada: ${activeFacingMode === "environment" ? "traseira" : activeFacingMode === "user" ? "frontal" : activeFacingMode}.` : ""}
            {focusStatus ? ` ${focusStatus}.` : ""}
          </p>
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300"
            >
              <span>{error}</span>
              {!active && <button type="button" onClick={() => void start()} disabled={isStarting} className="rounded-md border border-red-300/40 px-3 py-1.5 font-semibold text-red-100 hover:bg-red-300/10 disabled:cursor-wait disabled:opacity-60">{isStarting ? "Iniciando..." : "Tentar novamente"}</button>}
            </div>
          )}
        </section>
        <aside className={`${immersiveMode ? "hidden" : ""} space-y-4`}>
          <details className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
            <summary className="cursor-pointer text-sm font-bold text-[var(--vly-text-primary)]">Testar no celular</summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-[var(--vly-text-secondary)]">
              <li>Abra este endereço em HTTPS e permita o acesso à câmera.</li>
              <li>Confirme <strong>Traseira</strong> e toque em <strong>Iniciar câmera</strong>.</li>
              <li>Toque para focar; use dois dedos para zoom e o botão circular para capturar.</li>
              <li>Revise <strong>Original preservado</strong> e <strong>Correção sugerida</strong> lado a lado.</li>
              <li>Escolha a versão antes de abrir no Image Studio e teste <strong>Alternar câmera</strong>.</li>
            </ol>
          </details>
          <div className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]">
              <ShieldCheck size={16} className="text-[var(--vly-success)]" />
              Capacidades detectadas
            </h2>
            <div className="space-y-2 text-xs">
              {Object.values(capabilities ?? {}).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-[var(--vly-text-secondary)]">
                    {item.label}
                  </span>
                  <span className="font-mono text-[var(--vly-text-muted)]">
                    {item.state}
                  </span>
                </div>
              ))}
            </div>
            {!capabilities && (
              <p className="text-xs text-[var(--vly-text-muted)]">
                Inicie a câmera para consultar o track real.
              </p>
            )}
          </div>
          {captureUrl && (
            <div className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
              <div className="mb-3 grid grid-cols-2 gap-2"><figure className="min-w-0"><img src={captureUrl} alt="Frame original capturado" className="aspect-video w-full rounded-lg bg-black object-contain" /><figcaption className="mt-1 truncate text-[10px] uppercase tracking-wider text-[var(--vly-text-muted)]">Original preservado</figcaption></figure>{correctedUrl && <figure className="min-w-0"><img src={correctedUrl} alt="Frame com correção automática" className="aspect-video w-full rounded-lg bg-black object-contain" /><figcaption className="mt-1 truncate text-[10px] uppercase tracking-wider text-[var(--vly-text-muted)]">Correção sugerida</figcaption></figure>}</div>
              {correctedBlob && <div className="mb-3 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3"><p className="text-xs text-[var(--vly-text-secondary)]">A correção é opcional e não substitui o original. Qual versão deseja enviar ao Visual Studio?</p>{quality && <p className="mt-2 font-mono text-[10px] text-[var(--vly-text-muted)]">Sugestão local: exposição {suggestCameraCorrection(quality).exposure >= 0 ? "+" : ""}{suggestCameraCorrection(quality).exposure.toFixed(2)} · contraste +0.04 · sem cor, vinheta ou reconstrução.</p>}<div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Escolha da versão para enviar"><button type="button" aria-pressed={!useCorrection} onClick={() => setUseCorrection(false)} className={`rounded-lg border px-3 py-2 text-xs ${!useCorrection ? "border-[var(--vly-accent)] text-[var(--vly-accent)]" : "border-white/10 text-slate-300"}`}>Manter original</button><button type="button" aria-pressed={useCorrection} onClick={() => setUseCorrection(true)} className={`rounded-lg border px-3 py-2 text-xs ${useCorrection ? "border-[var(--vly-accent)] text-[var(--vly-accent)]" : "border-white/10 text-slate-300"}`}>Usar correção</button></div></div>}
              <div className="flex flex-wrap gap-2">
                <a
                  href={captureUrl}
                  download="varynth-camera-capture.jpg"
                  className="vly-interactive inline-flex rounded-lg bg-[var(--vly-surface-raised)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)]"
                >
                  <Download size={14} className="mr-2" />
                  Baixar original
                </a>
                <button
                  onClick={() => void openInImageStudio()}
                  disabled={isSendingToStudio}
                  className="vly-interactive rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)] disabled:opacity-50"
                >
                  {isSendingToStudio ? "Abrindo..." : "Abrir no Image Studio"}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-[var(--vly-text-muted)]">
                Origem: DEVICE_CAMERA · generated: false
                {currentCapture?.metadata.captureWidth && currentCapture?.metadata.captureHeight
                  ? ` · ${currentCapture.metadata.captureWidth}×${currentCapture.metadata.captureHeight}`
                  : ""}
                {currentCapture?.metadata.captureMethod === "NATIVE_PHOTO" ? " · foto nativa do sensor" : currentCapture?.metadata.captureMethod === "VIDEO_FRAME" ? " · frame de compatibilidade" : ""}
              </p>
            </div>
          )}
          {videoUrl && (
            <div className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
              <video
                src={videoUrl}
                controls
                playsInline
                className="mb-3 w-full rounded-lg"
              />
              <a
                href={videoUrl}
                download="varynth-camera-capture.webm"
                className="vly-interactive inline-flex rounded-lg bg-[var(--vly-surface-raised)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)]"
              >
                <Download size={14} className="mr-2" />
                Baixar vídeo original
              </a>
              <p className="mt-2 text-[10px] text-[var(--vly-text-muted)]">
                Origem: DEVICE_CAMERA · generated: false · MediaRecorder
              </p>
            </div>
          )}
          {quality && (
            <div className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4 text-xs">
              <h2 className="mb-2 font-bold text-[var(--vly-text-primary)]">
                Quality Gate
              </h2>
              <p className="text-[var(--vly-text-secondary)]">
                Nitidez: {Math.round(quality.sharpness.score * 100)}% ·
                confiança {Math.round(quality.sharpness.confidence * 100)}%
              </p>
              <p className="text-[var(--vly-text-secondary)]">
                Luminância média: {Math.round(quality.exposure.meanLuma * 100)}%
              </p>
              {quality.warnings.length > 0 ? (
                <ul className="mt-2 list-disc pl-4 text-amber-300">
                  {quality.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-emerald-300">Nenhum alerta técnico.</p>
              )}
            </div>
          )}
          <div className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
            <h2 className="mb-2 text-sm font-bold text-[var(--vly-text-primary)]">
              Capturas persistidas ({captures.length})
            </h2>
            {captures.length === 0 ? (
              <p className="text-xs text-[var(--vly-text-muted)]">
                Nenhuma captura registrada neste dispositivo.
              </p>
            ) : (
              <div className="space-y-2">
                {captures.slice(0, 5).map((capture) => (
                  <div
                    key={capture.id}
                    className="rounded-lg border border-[var(--vly-border-subtle)] p-2 text-[11px]"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-mono text-[var(--vly-text-secondary)]">
                        {capture.mode}
                      </span>
                      <span className="text-[var(--vly-text-muted)]">
                        {new Date(capture.capturedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[var(--vly-text-muted)]">
                      {capture.imageArtifactId
                        ? "Vinculada ao Image Studio"
                        : capture.metadata.storedLocally === false
                          ? "Somente sessão atual · armazenamento local indisponível"
                          : "Original local"}
                    </p>
                    {Boolean(capture.metadata.captureWidth && capture.metadata.captureHeight) && (
                      <p className="mt-1 text-[10px] text-[var(--vly-text-muted)]">
                        {String(capture.metadata.captureWidth)}×{String(capture.metadata.captureHeight)} · {capture.metadata.captureMethod === "NATIVE_PHOTO" ? "foto nativa do sensor" : "frame de compatibilidade"}
                      </p>
                    )}
                    {storedMediaUrls[capture.id] ? (
                      <div className="mt-2 flex flex-wrap gap-3">
                        <a
                          href={storedMediaUrls[capture.id]}
                          download={
                            capture.metadata.media === "VIDEO"
                              ? "varynth-capture.webm"
                              : "varynth-capture.jpg"
                          }
                          className="font-bold text-[var(--vly-accent)]"
                        >
                          Baixar original persistido →
                        </a>
                        {capture.metadata.media !== "VIDEO" && (
                          <>
                            <button
                              onClick={() => void openStoredCaptureInImageStudio(capture)}
                              disabled={openingCaptureId === capture.id}
                              className="font-bold text-[var(--vly-accent)] disabled:opacity-50"
                            >
                              {openingCaptureId === capture.id ? "Abrindo..." : "Abrir no Image Studio →"}
                            </button>
                            {capture.correctedMediaId && <button type="button" onClick={() => void compareStoredCapture(capture)} className="font-bold text-[var(--vly-info)]">Comparar original/correção →</button>}
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="mt-2 inline-block text-[10px] text-[var(--vly-text-muted)]">
                        Blob não disponível neste ambiente
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {persistedComparison && (
            <div className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-[var(--vly-text-primary)]">Comparação persistida</h2><button type="button" onClick={() => setPersistedComparison(null)} className="text-xs text-[var(--vly-text-muted)]">Fechar</button></div>
              <div className="grid grid-cols-2 gap-3"><figure className="min-w-0"><img src={persistedComparison.originalUrl} alt="Original persistido" className="aspect-video w-full rounded-lg bg-black object-contain" /><figcaption className="mt-1 truncate text-[10px] uppercase tracking-wider text-[var(--vly-text-muted)]">Original preservado</figcaption></figure><figure className="min-w-0"><img src={persistedComparison.correctedUrl} alt="Correção automática persistida" className="aspect-video w-full rounded-lg bg-black object-contain" /><figcaption className="mt-1 truncate text-[10px] uppercase tracking-wider text-[var(--vly-text-muted)]">Correção automática</figcaption><div className="mt-2 flex flex-wrap gap-3"><a href={persistedComparison.correctedUrl} download={`varynth-${persistedComparison.id}-corrected.jpg`} className="text-[10px] font-bold text-[var(--vly-info)]">Baixar correção persistida →</a>{comparisonCapture?.correctedMediaId && <button type="button" onClick={() => void openStoredCaptureInImageStudio(comparisonCapture, comparisonCapture.correctedMediaId, "CORRECTED")} className="text-[10px] font-bold text-emerald-300">Abrir correção no Image Studio →</button>}</div></figure></div>
              <p className="mt-3 text-[11px] text-[var(--vly-text-muted)]">A comparação é somente para revisão. A versão original permanece intacta.</p>
            </div>
          )}
        </aside>
      </div>
    </PageLayout>
  );
}
