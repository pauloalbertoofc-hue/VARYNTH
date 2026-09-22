"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CircleHelp,
  Laptop2,
  LockKeyhole,
  MonitorSmartphone,
  Smartphone,
  Sparkles,
  Wifi,
} from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function AppDownloadPage() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080810] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_-18%,rgba(124,58,237,0.24),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 lg:pt-8">
        <header className="flex items-center justify-between">
          <Link href="/download" className="flex items-center gap-3" aria-label="VARYNTH início">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/10 text-violet-200"><Sparkles size={19} /></span>
            <span className="text-sm font-black tracking-[0.24em]">VARYNTH</span>
          </Link>
          <Link href="/login" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-violet-300/40 hover:text-white">Entrar</Link>
        </header>

        <section className="mx-auto max-w-4xl pb-14 pt-16 text-center sm:pt-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.07] px-3.5 py-2 text-xs font-medium text-violet-200"><MonitorSmartphone size={15} /> Um só espaço, em todas as telas</div>
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl">Seu VARYNTH.<br /><span className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">Onde você estiver.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Abra no navegador do celular ou computador e instale o Web App na sua tela inicial. Sem procurar arquivos ou escolher uma versão complicada.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-bold shadow-lg shadow-violet-950/40 transition hover:bg-violet-500">Abrir o VARYNTH <ArrowRight size={17} /></Link>
            {installPrompt && !installed && <button onClick={() => void installApp()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300/30 bg-violet-300/10 px-6 py-3.5 text-sm font-bold text-violet-100 transition hover:bg-violet-300/15"><ArrowDownToLine size={17} /> Instalar neste dispositivo</button>}
            {installed && <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] px-6 py-3.5 text-sm font-semibold text-emerald-200"><Check size={17} /> VARYNTH instalado</span>}
          </div>
        </section>

        <section id="baixar" className="scroll-mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Acesso e instalação</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Escolha seu dispositivo</h2></div><p className="text-sm text-slate-500">A mesma conta e experiência em todos eles.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            <DeviceCard icon={<Smartphone size={20} />} title="Celular Android" badge="APK de teste" description="Instale o APK de teste ou use o Web App pelo Chrome. A versão nativa abre o VARYNTH com conexão à internet." />
            <DeviceCard icon={<Smartphone size={20} />} title="iPhone e iPad" badge="Tela inicial" description="Abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. O VARYNTH abre em uma janela própria." />
            <DeviceCard icon={<Laptop2 size={20} />} title="Computador Windows" badge="Instalador de teste" description="Instale a versão Windows de teste ou use o Web App pelo Chrome e Edge." />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a href="/downloads/varynth-android-0.1.0-debug.apk" download className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold transition hover:bg-violet-500"><ArrowDownToLine size={17} /> Baixar APK Android de teste</a>
            <a href="/downloads/varynth-desktop-0.1.0-x64-setup.exe" download className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300/30 bg-violet-300/10 px-5 py-3 text-sm font-bold text-violet-100 transition hover:bg-violet-300/15"><ArrowDownToLine size={17} /> Baixar instalador Windows de teste</a>
          </div>
        </section>

        <section className="mt-7 grid gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:grid-cols-3 sm:p-6">
          <Feature icon={<MonitorSmartphone size={17} />} title="Web App responsivo" description="Interface adaptada para celular, tablet e computador." />
          <Feature icon={<LockKeyhole size={17} />} title="Sua conta VARYNTH" description="Entre com sua conta para acessar seus espaços e projetos." />
          <Feature icon={<Wifi size={17} />} title="Conexão necessária" description="O app precisa de internet para abrir e sincronizar seus dados." />
        </section>

        <section className="mt-7 flex flex-col gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-3"><CircleHelp className="mt-0.5 shrink-0 text-cyan-200" size={19} /><div><h2 className="text-sm font-bold text-slate-100">Versões de teste</h2><p className="mt-1 text-sm leading-6 text-slate-400">Android e Windows estão disponíveis para instalação de teste. Atualizações automáticas e recursos nativos avançados serão ativados em uma versão de distribuição assinada.</p></div></div>
          <Link href="/login" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-cyan-100">Continuar para o app <ArrowRight size={15} /></Link>
        </section>

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] pt-5 text-xs text-slate-600 sm:flex-row"><span>VARYNTH · Seu espaço de trabalho, em qualquer tela.</span><a href="#baixar" className="hover:text-slate-300">Ver opções de instalação</a></footer>
      </div>
    </main>
  );
}

function DeviceCard({ icon, title, badge, description }: { icon: React.ReactNode; title: string; badge: string; description: string }) {
  return <article className="rounded-2xl border border-white/[0.09] bg-[#10101a]/90 p-5 transition hover:border-violet-300/25"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-300/[0.08] text-violet-200">{icon}</span><span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] font-semibold text-slate-400">{badge}</span></div><h3 className="mt-5 text-base font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></article>;
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 text-violet-200">{icon}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div>;
}
