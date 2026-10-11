"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

interface IconStatus { updatedAt: string | null; updatedBy: string | null; isDefault: boolean }

function refreshBrowserIcons(version: string) {
  const iconUrl = new URL("/api/app-icon", window.location.origin);
  iconUrl.searchParams.set("v", version);
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((link) => {
    link.href = iconUrl.toString();
  });
}

export function AppIconSettings() {
  const [status, setStatus] = useState<IconStatus | null>(null);
  const [version, setVersion] = useState("default");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshStatus() {
    const response = await fetch("/api/admin/app-icon", { cache: "no-store" });
    const result = await response.json() as IconStatus & { error?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar o ícone atual.");
    setStatus(result);
    setVersion(result.updatedAt || "default");
  }

  useEffect(() => {
    void refreshStatus().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Não foi possível carregar o ícone atual."));
  }, []);

  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.currentTarget.files?.[0] || null;
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(nextFile ? URL.createObjectURL(nextFile) : "");
    setMessage("");
  }

  async function save() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("icon", file);
      const response = await fetch("/api/admin/app-icon", { method: "PUT", body: form });
      const result = await response.json() as IconStatus & { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar o ícone.");
      setFile(null);
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview("");
      await refreshStatus();
      refreshBrowserIcons(result.updatedAt || "default");
      setMessage("Ícone publicado na identidade global. As instalações existentes recebem a alteração quando o navegador sincroniza; ele pode pedir confirmação no aparelho.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o ícone.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/app-icon", { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível restaurar o ícone padrão.");
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview("");
      setFile(null);
      await refreshStatus();
      refreshBrowserIcons("default");
      setMessage("Ícone padrão publicado. As instalações existentes recebem a alteração quando o navegador sincroniza; ele pode pedir confirmação no aparelho.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível restaurar o ícone padrão.");
    } finally {
      setBusy(false);
    }
  }

  const imageSrc = preview || `/api/app-icon?v=${encodeURIComponent(version)}`;

  return <Surface tone="panel" role="region" aria-labelledby="app-icon-settings-title" className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="app-icon-settings-title" className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"><ImageIcon size={16} className="text-[var(--vly-accent)]" /> Ícone global do VARYNTH</h2><p className="mt-1 text-xs text-[var(--vly-text-muted)]">A mesma imagem aparece no navegador, no manifesto do Web App e nas novas instalações.</p></div>
      {status && <span role="status" className="rounded-full border border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/10 px-2.5 py-1 text-[10px] font-semibold text-[var(--vly-accent)]">{status.isDefault ? "ÍCONE PADRÃO" : "PERSONALIZADO"}</span>}
    </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--vly-border-default)] bg-[var(--vly-world)] p-2"><Image src={imageSrc} alt="Prévia do ícone global do VARYNTH" fill sizes="96px" unoptimized className="rounded-xl object-cover p-2" /></div>
      <div className="min-w-0 flex-1">
        <label className="vly-interactive inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--vly-border-accent)] px-3 text-xs font-bold text-[var(--vly-accent)] transition hover:bg-[var(--vly-accent)]/10">
          <Upload size={14} /> Escolher nova imagem
          <input type="file" accept="image/png,.png" className="sr-only" onChange={chooseFile} />
        </label>
        <p className="mt-2 text-[11px] leading-5 text-[var(--vly-text-muted)]">PNG quadrado, de 192 × 192 a 1024 × 1024 px; máximo de 512 KB. Recomendado: 512 × 512 px.</p>
        {status?.updatedAt && <p className="mt-1 text-[10px] text-[var(--vly-text-muted)]">Atualizado em {new Date(status.updatedAt).toLocaleString("pt-BR")}{status.updatedBy ? ` por ${status.updatedBy}` : ""}.</p>}
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col">
        <button type="button" disabled={!file || busy} aria-busy={busy} aria-label="Aplicar novo ícone para todos" onClick={() => void save()} className="vly-interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--vly-accent)] px-3 text-xs font-bold text-[var(--vly-accent-contrast)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />} Aplicar para todos</button>
        <button type="button" disabled={busy || status?.isDefault} aria-label="Restaurar ícone padrão" onClick={() => void reset()} className="vly-interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--vly-border-default)] px-3 text-xs font-semibold text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={13} /> Restaurar padrão</button>
      </div>
    </div>
    {message && <p role="status" className="vly-motion-success mt-3 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-3 py-2 text-xs text-[var(--vly-text-secondary)]">{message}</p>}
    <div className="mt-4 rounded-lg border border-[var(--vly-border-warning)] bg-[var(--vly-surface-warning)] px-3 py-2.5 text-[11px] leading-5 text-[var(--vly-warning)]">
      <p>O novo ícone já está publicado para todo o VARYNTH e vale imediatamente para quem instalar depois. Atalhos existentes dependem da sincronização do navegador. No Android, o Chrome pode pedir que a pessoa confirme a mudança de identidade do app; a Administração não consegue aprovar essa confirmação no aparelho de cada pessoa.</p>
      <details className="mt-2 text-[var(--vly-warning)]">
        <summary className="cursor-pointer font-semibold">O atalho no Android ainda mostra o ícone antigo?</summary>
        <ol className="ml-4 mt-2 list-decimal space-y-1">
          <li>Abra o app VARYNTH instalado e confira o menu ⋮. Se aparecer “Revisar atualização do app”, abra e confirme a troca do ícone.</li>
          <li>Se essa opção não aparecer, no Chrome do Android abra <code className="rounded bg-[var(--vly-surface-active)] px-1 text-[var(--vly-text-secondary)]">about://webapks</code>, toque em “Atualizar” ao lado do VARYNTH e depois abra o app novamente.</li>
        </ol>
      </details>
      <p className="mt-2">No iPhone ou iPad, o sistema pode exigir remover o atalho antigo e adicioná-lo novamente.</p>
    </div>
  </Surface>;
}
