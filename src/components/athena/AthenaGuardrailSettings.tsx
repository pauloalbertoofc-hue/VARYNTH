"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import { athenaGuardrailPolicy, AthenaGuardrailSettings, REQUIRED_GUARDRAILS } from "@/lib/athena/runtime/guardrail-policy";

const ADJUSTABLE: Array<{ key: keyof AthenaGuardrailSettings; title: string; description: string }> = [
  { key: "serializePlanOperations", title: "Uma operação por plano", description: "Evita executar ou desfazer o mesmo plano ao mesmo tempo." },
  { key: "rejectDuplicateConfirmations", title: "Bloquear confirmação repetida", description: "Impede gerar uma segunda confirmação para a mesma etapa." },
];

export function AthenaGuardrailSettingsPanel() {
  const [settings, setSettings] = useState<AthenaGuardrailSettings>({ serializePlanOperations: true, rejectDuplicateConfirmations: true });
  useEffect(() => {
    const refresh = () => setSettings(athenaGuardrailPolicy.get());
    refresh();
    window.addEventListener("varynth_athena_guardrails_updated", refresh);
    return () => window.removeEventListener("varynth_athena_guardrails_updated", refresh);
  }, []);

  return (
    <section className="rounded-2xl border border-[#1e1e30] bg-[#0f0f1a] p-4" aria-labelledby="athena-guardrails-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="athena-guardrails-title" className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck size={15} className="text-emerald-400" /> Travas de segurança</h2><p className="mt-1 text-[10px] text-slate-500">Configuração local deste navegador. Alterações ficam registradas no diagnóstico.</p></div>
        <button onClick={() => setSettings(athenaGuardrailPolicy.reset())} className="min-h-11 rounded-lg border border-slate-700 px-3 text-[11px] text-slate-300"><RotateCcw size={12} className="mr-1 inline" /> Restaurar padrões</button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"><p className="flex items-center gap-2 text-[11px] font-bold text-emerald-300"><LockKeyhole size={13} /> Proteções obrigatórias</p><ul className="mt-2 space-y-1 text-[10px] text-slate-400">{REQUIRED_GUARDRAILS.map((item) => <li key={item}>✓ {item}</li>)}</ul></div>
        <div className="space-y-2">{ADJUSTABLE.map((item) => <label key={item.key} className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#25253a] bg-[#11111b] p-3"><span><strong className="block text-[11px] text-slate-200">{item.title}</strong><span className="mt-0.5 block text-[9px] text-slate-500">{item.description}</span></span><input type="checkbox" checked={settings[item.key]} onChange={(event) => setSettings(athenaGuardrailPolicy.set(item.key, event.target.checked))} className="h-5 w-5 accent-violet-500" /></label>)}</div>
      </div>
      {Object.values(settings).some((enabled) => !enabled) && <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-amber-200"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> Há uma trava ajustável desligada. As proteções obrigatórias continuam ativas.</p>}
    </section>
  );
}
