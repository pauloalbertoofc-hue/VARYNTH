"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const callbackUrl = typeof window === "undefined" ? "/dashboard" : new URLSearchParams(window.location.search).get("callbackUrl") || "/dashboard";
  async function authenticate(provider: "google" | "credentials", options: Record<string, unknown>) { const { signIn } = await import("next-auth/react"); return signIn(provider, options); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(undefined); setNotice(undefined);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Cadastro recusado.");
        setNotice("Cadastro enviado. Aguarde a aprovação do proprietário para entrar na plataforma."); setMode("login"); return;
      }
      const result = await authenticate("credentials", { email: data.email, password: data.password, redirect: false, callbackUrl });
      if (result?.error) throw new Error("E-mail, senha ou autorização de acesso inválidos.");
      window.location.assign(result?.url || callbackUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível entrar."); } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#07070c] px-4 py-10 text-slate-100"><div className="w-full max-w-md"><div className="mb-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10"><LockKeyhole className="text-violet-300" /></div><h1 className="mt-4 text-2xl font-black tracking-[0.24em]">VARYNTH</h1><p className="mt-2 text-sm text-slate-500">Seu ambiente cognitivo protegido</p></div><section className="rounded-2xl border border-[#292940] bg-[#101018] p-6 shadow-2xl"><button onClick={() => void authenticate("google", { callbackUrl })} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#343449] bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"><span className="text-lg font-black text-blue-600">G</span> Continuar com Google</button><div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-600"><span className="h-px flex-1 bg-[#292940]" />ou<span className="h-px flex-1 bg-[#292940]" /></div><div className="mb-4 grid grid-cols-2 rounded-lg bg-[#09090f] p-1 text-xs"><button onClick={() => { setMode("login"); setError(undefined); setNotice(undefined); }} className={`rounded-md py-2 ${mode === "login" ? "bg-violet-600 text-white" : "text-slate-500"}`}>Entrar</button><button onClick={() => { setMode("register"); setError(undefined); setNotice(undefined); }} className={`rounded-md py-2 ${mode === "register" ? "bg-violet-600 text-white" : "text-slate-500"}`}>Criar conta</button></div><form onSubmit={submit} className="space-y-3">{mode === "register" && <input name="name" required minLength={2} placeholder="Seu nome" className="w-full rounded-xl border border-[#303045] bg-[#09090f] px-3 py-2.5 text-sm outline-none focus:border-violet-500" />}<input name="email" required type="email" autoComplete="email" placeholder="seu@email.com" className="w-full rounded-xl border border-[#303045] bg-[#09090f] px-3 py-2.5 text-sm outline-none focus:border-violet-500" /><div className="relative"><input name="password" required minLength={10} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Sua senha" className="w-full rounded-xl border border-[#303045] bg-[#09090f] px-3 py-2.5 pr-10 text-sm outline-none focus:border-violet-500" /><button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 text-slate-500">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{mode === "register" && <p className="text-[10px] text-slate-600">Use ao menos 10 caracteres com letra, número e símbolo.</p>}{error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-xs text-rose-300">{error}</p>}{notice && <p role="status" className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2 text-xs text-cyan-200">{notice}</p>}<button disabled={busy} className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-50">{busy ? "Aguarde…" : mode === "login" ? "Entrar na VARYNTH" : "Solicitar acesso"}</button></form><div className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3 text-[10px] text-emerald-300"><ShieldCheck size={14} className="shrink-0" /><span>Após o cadastro, o proprietário analisa e autoriza cada conta antes da entrada.</span></div></section></div></main>;
}
