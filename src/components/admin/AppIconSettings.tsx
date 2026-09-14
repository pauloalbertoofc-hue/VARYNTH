"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, LoaderCircle, RotateCcw, Upload } from "lucide-react";

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

  return <section className="rounded-2xl border border-violet-500/20 bg-[#11111b] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-sm font-bold text-white"><ImageIcon size={16} className="text-violet-300" /> Ícone global do VARYNTH</h2><p className="mt-1 text-xs text-slate-500">A mesma imagem aparece no navegador, no manifesto do Web App e nas novas instalações.</p></div>
      {status && <span className="rounded-full border border-violet-400/15 bg-violet-400/[0.06] px-2.5 py-1 text-[10px] font-semibold text-violet-200">{status.isDefault ? "ÍCONE PADRÃO" : "PERSONALIZADO"}</span>}
    </div>
    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-2"><img src={imageSrc} alt="Prévia do ícone global do VARYNTH" className="h-full w-full rounded-xl object-cover" /></div>
      <div className="min-w-0 flex-1">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-violet-400/25 px-3 text-xs font-bold text-violet-200 transition hover:bg-violet-500/10">
          <Upload size={14} /> Escolher nova imagem
          <input type="file" accept="image/png,.png" className="sr-only" onChange={chooseFile} />
        </label>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">PNG quadrado, de 192 × 192 a 1024 × 1024 px; máximo de 512 KB. Recomendado: 512 × 512 px.</p>
        {status?.updatedAt && <p className="mt-1 text-[10px] text-slate-600">Atualizado em {new Date(status.updatedAt).toLocaleString("pt-BR")}{status.updatedBy ? ` por ${status.updatedBy}` : ""}.</p>}
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col">
        <button type="button" disabled={!file || busy} onClick={() => void save()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />} Aplicar para todos</button>
        <button type="button" disabled={busy || status?.isDefault} onClick={() => void reset()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={13} /> Restaurar padrão</button>
      </div>
    </div>
    {message && <p role="status" className="mt-3 rounded-lg border border-[#292940] bg-[#09090f] px-3 py-2 text-xs text-slate-300">{message}</p>}
    <div className="mt-4 rounded-lg border border-amber-400/10 bg-amber-400/[0.04] px-3 py-2.5 text-[11px] leading-5 text-amber-100/70">
      <p>O novo ícone já está publicado para todo o VARYNTH e vale imediatamente para quem instalar depois. Atalhos existentes dependem da sincronização do navegador. No Android, o Chrome pode pedir que a pessoa confirme a mudança de identidade do app; a Administração não consegue aprovar essa confirmação no aparelho de cada pessoa.</p>
      <details className="mt-2 text-amber-100/80">
        <summary className="cursor-pointer font-semibold">O atalho no Android ainda mostra o ícone antigo?</summary>
        <ol className="ml-4 mt-2 list-decimal space-y-1">
          <li>Abra o app VARYNTH instalado e confira o menu ⋮. Se aparecer “Revisar atualização do app”, abra e confirme a troca do ícone.</li>
          <li>Se essa opção não aparecer, no Chrome do Android abra <code className="rounded bg-black/30 px-1">about://webapks</code>, toque em “Atualizar” ao lado do VARYNTH e depois abra o app novamente.</li>
        </ol>
      </details>
      <p className="mt-2">No iPhone ou iPad, o sistema pode exigir remover o atalho antigo e adicioná-lo novamente.</p>
    </div>
  </section>;
}
