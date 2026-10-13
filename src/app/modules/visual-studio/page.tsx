"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  FlaskConical,
  Lightbulb,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  getCameraMedia,
  listCameraCaptures,
  visualCapabilities,
  visualWorkflows,
  type CameraCaptureRecord,
  type VisualCapabilityStatus,
} from "@/lib/visual-core";
import {
  appendPictorConsultation,
  parsePictorHistory,
  type PictorConsultation,
} from "@/lib/visual-core/pictor-history";

const statusLabel: Record<VisualCapabilityStatus, string> = {
  READY: "Operacional",
  PARTIAL: "Parcial",
  PLANNED: "Planejado",
};
const statusClass: Record<VisualCapabilityStatus, string> = {
  READY: "text-emerald-300",
  PARTIAL: "text-amber-300",
  PLANNED: "text-[var(--vly-text-muted)]",
};
const PICTOR_HISTORY_KEY = "varynth_pictor_consultations_v1";

export default function VisualStudioPage() {
  const [captures, setCaptures] = useState<CameraCaptureRecord[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [pictorPrompt, setPictorPrompt] = useState(
    "Analise este contexto visual e indique o próximo cuidado técnico.",
  );
  const [pictorResponse, setPictorResponse] = useState<string | null>(null);
  const [pictorError, setPictorError] = useState<string | null>(null);
  const [pictorLoading, setPictorLoading] = useState(false);
  const [pictorCaptureId, setPictorCaptureId] = useState("");
  const [pictorHistory, setPictorHistory] = useState<PictorConsultation[]>([]);
  const consultPictor = async () => {
    if (!pictorPrompt.trim() || pictorLoading) return;
    setPictorLoading(true);
    setPictorError(null);
    const selected =
      captures.find((capture) => capture.id === pictorCaptureId) ?? captures[0];
    const quality = selected?.metadata.quality as
      | {
          sharpness?: { score?: number };
          exposure?: { meanLuma?: number };
          warnings?: string[];
        }
      | undefined;
    try {
      const response = await fetch("/api/visual/pictor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: pictorPrompt.trim(),
          visualQuality: quality
            ? {
                sharpness: quality.sharpness?.score,
                exposure: quality.exposure?.meanLuma,
                warnings: quality.warnings,
              }
            : undefined,
        }),
      });
      const result = (await response.json()) as {
        content?: string;
        recommendations?: string[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível consultar o Pictor.");
      const text =
        `${result.content ?? ""} ${result.recommendations?.join(" ") ?? ""}`.trim() ||
        "Pictor não retornou uma orientação.";
      setPictorResponse(text);
      const entry: PictorConsultation = {
        id: `pictor-${Date.now()}`,
        prompt: pictorPrompt.trim(),
        response: text,
        captureId: selected?.id,
        createdAt: new Date().toISOString(),
      };
      setPictorHistory((current) => {
        const next = appendPictorConsultation(current, entry);
        try {
          window.localStorage.setItem(PICTOR_HISTORY_KEY, JSON.stringify(next));
        } catch {
          /* armazenamento local é opcional */
        }
        return next;
      });
    } catch (error) {
      setPictorError(
        error instanceof Error
          ? error.message
          : "Não foi possível consultar o Pictor.",
      );
    } finally {
      setPictorLoading(false);
    }
  };
  useEffect(() => {
    const saved = parsePictorHistory(
      window.localStorage.getItem(PICTOR_HISTORY_KEY),
    );
    if (saved[0]) {
      setPictorHistory(saved);
      setPictorResponse(saved[0].response);
    }
    let cancelled = false;
    const records = listCameraCaptures().slice(0, 12);
    setCaptures(records);
    void Promise.all(
      records.map(
        async (record) => [record.id, await getCameraMedia(record.id)] as const,
      ),
    ).then((items) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [id, blob] of items)
        if (blob) next[id] = URL.createObjectURL(blob);
      setPreviews(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(
    () => () =>
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url)),
    [previews],
  );
  return (
    <PageLayout
      title="Varynth Visual Studio"
      subtitle="Orquestração visual por contratos, proveniência e capacidades reais"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--vly-accent)]">
                Visual Core
              </p>
              <h2 className="mt-2 text-xl font-bold text-[var(--vly-text-primary)]">
                Um fluxo, seis responsabilidades explícitas
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--vly-text-secondary)]">
                A captura não é geração, a melhoria não destrói o original e a
                produção mantém o documento visual versionado. Este painel
                apresenta o que já está conectado e o que ainda requer um motor
                próprio.
              </p>
            </div>
            <Link
              href="/modules/technical-archive"
              className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)]"
            >
              Abrir documentação <ArrowRight size={14} className="ml-2" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {visualWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3"
              >
                <p className="text-xs font-bold text-[var(--vly-text-primary)]">
                  {workflow.name}
                </p>
                <p className="mt-1 text-[11px] text-[var(--vly-text-muted)]">
                  {workflow.description}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visualCapabilities.map((capability) => (
            <article
              key={capability.id}
              className="flex min-h-44 flex-col rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--vly-text-muted)]">
                    {capability.workflow}
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-[var(--vly-text-primary)]">
                    {capability.name}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold ${statusClass[capability.status]}`}
                >
                  {capability.status === "READY" ? (
                    <CheckCircle2 size={13} />
                  ) : capability.status === "PARTIAL" ? (
                    <FlaskConical size={13} />
                  ) : (
                    <CircleDashed size={13} />
                  )}
                  {statusLabel[capability.status]}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--vly-text-secondary)]">
                {capability.description}
              </p>
              <p className="mt-auto pt-4 text-[10px] text-[var(--vly-text-muted)]">
                Evidência: {capability.evidence}
              </p>
              {capability.href && (
                <Link
                  href={capability.href}
                  className="vly-interactive mt-3 inline-flex w-fit items-center rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"
                >
                  Abrir capacidade <ArrowRight size={13} className="ml-2" />
                </Link>
              )}
            </article>
          ))}
        </section>
        <section className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--vly-text-primary)]">
                Asset Browser local
              </h2>
              <p className="mt-1 text-xs text-[var(--vly-text-muted)]">
                Capturas persistidas neste dispositivo, sem upload externo.
              </p>
            </div>
            <Link
              href="/modules/camera"
              className="text-xs font-bold text-[var(--vly-accent)]"
            >
              Abrir Camera →
            </Link>
          </div>
          {captures.length === 0 ? (
            <p className="mt-4 text-xs text-[var(--vly-text-muted)]">
              Nenhuma captura local disponível.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {captures.slice(0, 8).map((capture) => (
                <div
                  key={capture.id}
                  className="overflow-hidden rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)]"
                >
                  {previews[capture.id] &&
                  capture.metadata.media === "VIDEO" ? (
                    <video
                      src={previews[capture.id]}
                      muted
                      className="aspect-video w-full object-cover"
                    />
                  ) : previews[capture.id] ? (
                    <img
                      src={previews[capture.id]}
                      alt={`Captura ${capture.id}`}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-[10px] text-[var(--vly-text-muted)]">
                      Blob indisponível
                    </div>
                  )}
                  <div className="p-2">
                    <p className="truncate text-[11px] font-bold text-[var(--vly-text-primary)]">
                      {capture.id}
                    </p>
                    <p className="text-[10px] text-[var(--vly-text-muted)]">
                      {capture.mode} · DEVICE_CAMERA
                    </p>
                    <Link
                      href="/modules/camera"
                      className="mt-2 inline-block text-[10px] font-bold text-[var(--vly-accent)]"
                    >
                      Gerenciar captura →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--vly-text-primary)]">
                Pictor · consulta local
              </h2>
              <p className="mt-1 text-xs text-[var(--vly-text-muted)]">
                A análise usa texto e métricas locais do Quality Gate; Pictor
                não recebe blobs, não acessa arquivos e não executa ferramentas.
              </p>
            </div>
            {pictorHistory.length > 0 && (
              <button
                onClick={() => {
                  setPictorHistory([]);
                  setPictorResponse(null);
                  setPictorError(null);
                  window.localStorage.removeItem(PICTOR_HISTORY_KEY);
                }}
                className="vly-interactive rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-[10px] font-bold text-[var(--vly-text-secondary)]"
              >
                Limpar histórico
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Contexto para o Pictor"
              maxLength={4000}
              value={pictorPrompt}
              onChange={(event) => setPictorPrompt(event.target.value)}
              className="vly-field min-w-0 flex-1 rounded-lg px-3 py-2 text-xs"
            />
            <select
              aria-label="Captura para contexto do Pictor"
              value={pictorCaptureId}
              onChange={(event) => setPictorCaptureId(event.target.value)}
              className="vly-field rounded-lg px-3 py-2 text-xs"
            >
              <option value="">Última captura</option>
              {captures.map((capture) => (
                <option key={capture.id} value={capture.id}>
                  {capture.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => void consultPictor()}
              disabled={pictorLoading || !pictorPrompt.trim()}
              className="vly-interactive rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)] disabled:opacity-50"
            >
              {pictorLoading ? "Consultando..." : "Consultar Pictor"}
            </button>
          </div>
          {pictorError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-200"
            >
              {pictorError}
            </p>
          )}
          {pictorResponse && (
            <p className="mt-3 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3 text-xs leading-5 text-[var(--vly-text-secondary)]">
              {pictorResponse}
            </p>
          )}
          {pictorHistory.length > 0 && (
            <div className="mt-3 space-y-2">
              {pictorHistory.slice(0, 3).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setPictorPrompt(entry.prompt);
                    setPictorResponse(entry.response);
                    setPictorError(null);
                    setPictorCaptureId(entry.captureId ?? "");
                  }}
                  className="block w-full rounded-lg border border-[var(--vly-border-subtle)] p-2 text-left text-[10px] text-[var(--vly-text-muted)]"
                >
                  <span className="font-bold text-[var(--vly-text-secondary)]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>{" "}
                  · {entry.prompt}
                </button>
              ))}
            </div>
          )}
        </section>
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-200">
          <Lightbulb size={16} /> Capacidades planejadas permanecem sem ação
          executável até existir um backend real, sandbox ou motor validado.
        </div>
      </div>
    </PageLayout>
  );
}
