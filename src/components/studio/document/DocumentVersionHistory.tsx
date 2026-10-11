"use client";

import React, { useState } from "react";
import { ArtifactVersion } from "@/lib/artifacts/types";
import { Clock, RotateCcw, User, Sparkles } from "lucide-react";

interface DocumentVersionHistoryProps {
  versions: ArtifactVersion[];
  currentVersionNumber: string;
  onRestoreVersion: (versionNumber: string) => void;
  onCompareVersions?: (v1: string, v2: string) => void;
}

export function DocumentVersionHistory({
  versions,
  currentVersionNumber,
  onRestoreVersion,
}: DocumentVersionHistoryProps) {
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <section aria-label="Histórico de versões" className="flex flex-col gap-3 p-4 text-[var(--vly-text-secondary)]">
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--vly-text-secondary)]">Histórico de Versões</span>
        <span className="rounded bg-[var(--vly-surface-active)] px-1.5 py-0.5 text-[10px] text-[var(--vly-text-muted)]">{versions.length} versões</span>
      </div>

      <div className="flex flex-col gap-2">
        {sortedVersions.map((ver) => {
          const isCurrent = `v${ver.versionNumber}.0` === currentVersionNumber || ver.versionNumber.toString() === currentVersionNumber;
          return (
            <article
              key={ver.versionId}
              className={`p-2.5 rounded-lg border text-xs transition ${
                isCurrent
                  ? "border-[var(--vly-border-accent)] bg-[color-mix(in_srgb,var(--vly-accent)_12%,transparent)] text-[var(--vly-text-primary)]"
                  : "border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] hover:border-[var(--vly-border-strong)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Clock size={12} className={isCurrent ? "text-[var(--vly-accent)]" : "text-[var(--vly-text-muted)]"} />
                  <span>v{ver.versionNumber}.0</span>
                  {isCurrent && (
                      <span className="rounded border border-[var(--vly-border-accent)] bg-[color-mix(in_srgb,var(--vly-accent)_14%,transparent)] px-1 py-0.2 text-[9px] text-[var(--vly-accent)]">
                      Atual
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  {ver.createdBy === "ATHENA" ? (
                    <span className="flex items-center gap-0.5 text-[var(--vly-warning)]">
                      <Sparkles size={10} /> Athena
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <User size={10} /> Usuário
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-1 line-clamp-2 text-[11px] text-[var(--vly-text-muted)]">{ver.changeSummary || "Sem descrição."}</p>

              <div className="mt-2 flex items-center justify-between border-t border-[var(--vly-border-subtle)] pt-2">
                <span className="text-[9px] text-[var(--vly-text-muted)]">
                  {new Date(ver.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>

                <div className="flex items-center gap-1">
                  {!isCurrent && (
                    <button
                      type="button"
                      aria-label={`Restaurar versão ${ver.versionNumber}`}
                      onClick={() => onRestoreVersion(ver.versionNumber.toString())}
                      className="vly-interactive flex items-center gap-1 rounded bg-[var(--vly-surface-active)] px-2 py-0.5 text-[10px] text-[var(--vly-text-secondary)]"
                      title="Restaurar esta versão (cria uma nova versão preservando o histórico via Alex Principle)"
                    >
                      <RotateCcw size={10} /> Restaurar
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

