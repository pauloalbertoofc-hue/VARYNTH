"use client";

import { useEffect, useState, type FormEvent } from "react";

type ProviderStatus = { configured: boolean; source: "account" | "platform" | "none"; canConfigure: boolean; model?: string };

export function MusicVisualProviderSettings() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    try {
      const response = await fetch("/api/athena/music/visual", { cache: "no-store" });
      const body = await response.json() as ProviderStatus & { error?: string };
      if (!response.ok) throw new Error(body.error || "Entre na sua conta para conectar a geração de imagens.");
      setStatus(body);
    } catch (error) {
      setStatus(null);
      setMessage(error instanceof Error ? error.message : "Não foi possível consultar o serviço de imagens.");
    }
  };

  useEffect(() => { void refresh(); }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !apiKey.trim()) return;
    setBusy(true); setMessage("Protegendo a chave na sua conta…");
    try {
      const response = await fetch("/api/athena/music/visual", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey: apiKey.trim() }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível conectar o provedor.");
      setApiKey(""); await refresh(); setMessage("Chave protegida salva nesta conta. O acesso ao modelo será verificado na primeira criação.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível conectar o provedor."); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true); setMessage("Removendo a chave protegida…");
    try {
      const response = await fetch("/api/athena/music/visual", { method: "DELETE" });
      const body = await response.json() as ProviderStatus & { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível remover a chave.");
      await refresh(); setMessage("Chave removida da sua conta.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível remover a chave."); }
    finally { setBusy(false); }
  };

  return <details className="rounded-xl border border-white/10 bg-black/15 p-3 text-xs text-slate-300">
    <summary className="cursor-pointer font-medium text-slate-200">Conectar geração de imagens à Athena</summary>
    <div className="mt-3 space-y-3">
      <p>Usa sua conta de imagens para criar uma capa quadrada e um fundo panorâmico originais. O título, artista e descrição visual da faixa são enviados ao provedor; o áudio não é enviado. O consumo segue a cobrança da sua conta do provedor. A chave fica criptografada e vinculada à sua conta VARYNTH.</p>
      {status?.configured ? <p role="status">Conectado {status.source === "account" ? "à sua conta" : "pela plataforma"} · modelo {status.model || "gpt-image-2"}.</p> : <p role="status">{status?.canConfigure ? "Ainda não conectado." : "A conexão protegida por conta está indisponível neste ambiente."}</p>}
      {status?.canConfigure && status.source !== "platform" && <form onSubmit={(event) => void save(event)} className="flex flex-wrap gap-2">
        <input aria-label="Chave de API de imagens" type="password" autoComplete="off" spellCheck={false} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={status.configured ? "Substituir chave salva" : "Cole sua chave de API"} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100" />
        <button type="submit" disabled={busy || apiKey.trim().length < 20} className="rounded-lg bg-violet-500/80 px-3 py-2 text-white disabled:opacity-50">{busy ? "Salvando…" : "Conectar"}</button>
        {status.configured && <button type="button" disabled={busy} onClick={() => void remove()} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-50">Remover chave</button>}
        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="self-center text-violet-300 underline">Abrir chaves do provedor</a>
      </form>}
      {message && <p role="status" aria-live="polite">{message}</p>}
    </div>
  </details>;
}
