"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CircleStop, Download, Focus, ShieldCheck, Video } from "lucide-react";
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
} from "@/lib/visual-core";
import { imageService } from "@/lib/studio/image/image-service";
import {
  analyzeCameraFrame,
  type CameraQualityReport,
} from "@/lib/visual-core";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CameraSession | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null);
  const [isSendingToStudio, setIsSendingToStudio] = useState(false);
  const [quality, setQuality] = useState<CameraQualityReport | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<CameraMode>("AUTO");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [activeFacingMode, setActiveFacingMode] = useState<string | null>(null);
  const captureRecordIdRef = useRef<string | null>(null);
  const [captures, setCaptures] = useState<CameraCaptureRecord[]>([]);
  const [storedMediaUrls, setStoredMediaUrls] = useState<
    Record<string, string>
  >({});
  const storedMediaUrlsRef = useRef<Record<string, string>>({});
  const [openingCaptureId, setOpeningCaptureId] = useState<string | null>(null);

  useEffect(() => {
    setCaptures(listCameraCaptures());
  }, []);

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
    },
    [],
  );

  useEffect(
    () => () => {
      if (captureUrl) URL.revokeObjectURL(captureUrl);
    },
    [captureUrl],
  );

  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );

  const start = async () => {
    if (!videoRef.current) return;
    setError(null);
    try {
      const session = new CameraSession();
      const profile = getCameraModeProfile(mode);
      const constraints: MediaStreamConstraints = {
        ...profile.constraints,
        video: typeof profile.constraints.video === "object"
          ? { ...profile.constraints.video, facingMode: { ideal: facingMode } }
          : { facingMode: { ideal: facingMode } },
      };
      const detected = await session.start(videoRef.current, constraints);
      sessionRef.current = session;
      setCapabilities(detected);
      setActiveFacingMode((videoRef.current.srcObject as MediaStream | null)?.getVideoTracks()[0]?.getSettings().facingMode ?? facingMode);
      setActive(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "CAMERA_START_FAILED");
      setActive(false);
    }
  };

  const stop = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setActiveFacingMode(null);
    setActive(false);
  };

  const capture = async () => {
    try {
      const result = await sessionRef.current?.capture();
      if (!result) return;
      if (captureUrl) URL.revokeObjectURL(captureUrl);
      setCaptureUrl(URL.createObjectURL(result.blob));
      setCaptureBlob(result.blob);
      const report = await analyzeCameraFrame(result.blob);
      setQuality(report);
      const recordId = `capture-${Date.now()}`;
      captureRecordIdRef.current = recordId;
      void saveCameraMedia(recordId, result.blob);
      const record = {
        id: recordId,
        mode,
        capturedAt: result.capturedAt,
        source: "DEVICE_CAMERA" as const,
        generated: false as const,
        metadata: { quality: report, capabilities },
      };
      saveCameraCapture(record);
      setCaptures(listCameraCaptures());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "CAMERA_CAPTURE_FAILED",
      );
    }
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
          storedLocally: typeof indexedDB !== "undefined",
        },
      });
      setCaptures(listCameraCaptures());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "CAMERA_VIDEO_RECORDING_FAILED",
      );
    } finally {
      setIsRecording(false);
    }
  };

  const openInImageStudio = async () => {
    if (!captureBlob) return;
    setIsSendingToStudio(true);
    const result = await imageService.importImage({
      name: `camera-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`,
      mimeType: "image/jpeg",
      sizeBytes: captureBlob.size,
      data: captureBlob,
      actor: "USER",
      captureMetadata: {
        source: "DEVICE_CAMERA",
        generated: false,
        capturedAt: new Date().toISOString(),
      },
    });
    setIsSendingToStudio(false);
    if (!result.success || !result.image) {
      setError(result.error ?? "CAMERA_IMPORT_TO_STUDIO_FAILED");
      return;
    }
    saveCameraCapture({
      id: captureRecordIdRef.current ?? `capture-${Date.now()}`,
      originalAssetId: String(
        result.image.artifact.metadata.sourceAssetId ?? "",
      ),
      imageArtifactId: result.image.artifact.id,
      mode,
      capturedAt: new Date().toISOString(),
      source: "DEVICE_CAMERA",
      generated: false,
      metadata: { quality, capabilities },
    });
    setCaptures(listCameraCaptures());
    window.location.href = `/modules/studio?studio=IMAGE&id=${encodeURIComponent(result.image.artifact.id)}`;
  };

  const openStoredCaptureInImageStudio = async (
    capture: CameraCaptureRecord,
  ) => {
    const blob = await getCameraMedia(capture.id);
    if (!blob) {
      setError("CAMERA_ORIGINAL_NOT_AVAILABLE");
      return;
    }
    setOpeningCaptureId(capture.id);
    const result = await imageService.importImage({
      name: `${capture.id}.${capture.metadata.media === "VIDEO" ? "webm" : "jpg"}`,
      mimeType: blob.type || "image/jpeg",
      sizeBytes: blob.size,
      data: blob,
      actor: "USER",
      captureMetadata: {
        source: "DEVICE_CAMERA",
        generated: false,
        capturedAt: capture.capturedAt,
      },
    });
    setOpeningCaptureId(null);
    if (!result.success || !result.image) {
      setError(result.error ?? "CAMERA_IMPORT_TO_STUDIO_FAILED");
      return;
    }
    window.location.href = `/modules/studio?studio=IMAGE&id=${encodeURIComponent(result.image.artifact.id)}`;
  };

  return (
    <PageLayout
      title="Varynth Camera"
      subtitle="Captura real, proveniência preservada e capacidades honestas do dispositivo"
    >
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)]">
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
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
              </>}
            </div>
            {!active && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-[var(--vly-text-secondary)]">
                <Camera size={34} />
                <p className="text-sm">A câmera ainda não foi iniciada.</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--vly-text-muted)]">
            <span>VARYNTH OPTICAL CAPTURE</span>
            <span>{activeFacingMode ? `Track: ${activeFacingMode}` : "Sem track ativo"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--vly-border-subtle)] p-4">
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as CameraMode)}
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
            <label className="sr-only" htmlFor="camera-facing">Câmera</label>
            <select
              id="camera-facing"
              value={facingMode}
              onChange={(event) => setFacingMode(event.target.value as "environment" | "user")}
              disabled={active}
              className="vly-field rounded-lg px-3 py-2 text-xs font-semibold"
            >
              <option value="environment">Traseira</option>
              <option value="user">Frontal</option>
            </select>
            {!active ? (
              <button
                onClick={() => void start()}
                className="vly-interactive rounded-lg bg-[var(--vly-accent)] px-4 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"
              >
                <Video size={14} className="mr-2 inline" />
                Iniciar câmera
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
              onClick={() => void capture()}
              disabled={!active}
              className="vly-interactive rounded-lg bg-[var(--vly-info)] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              <Camera size={14} className="mr-2 inline" />
              Capturar frame
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
          </div>
          <p className="border-t border-[var(--vly-border-subtle)] px-4 py-2 text-[11px] text-[var(--vly-text-muted)]">
            {getCameraModeProfile(mode).description}
            {getCameraModeProfile(mode).requiresHardwareControls
              ? " Controles manuais dependem das capacidades reais do track."
              : ""}
            {activeFacingMode ? ` Câmera aplicada: ${activeFacingMode === "environment" ? "traseira" : activeFacingMode === "user" ? "frontal" : activeFacingMode}.` : ""}
          </p>
          {error && (
            <p
              role="alert"
              className="border-t border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300"
            >
              {error}
            </p>
          )}
        </section>
        <aside className="space-y-4">
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
              <img
                src={captureUrl}
                alt="Último frame capturado"
                className="mb-3 w-full rounded-lg"
              />
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
                        : "Original local"}
                    </p>
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
                          <button
                            onClick={() =>
                              void openStoredCaptureInImageStudio(capture)
                            }
                            disabled={openingCaptureId === capture.id}
                            className="font-bold text-[var(--vly-accent)] disabled:opacity-50"
                          >
                            {openingCaptureId === capture.id
                              ? "Abrindo..."
                              : "Abrir no Image Studio →"}
                          </button>
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
        </aside>
      </div>
    </PageLayout>
  );
}
