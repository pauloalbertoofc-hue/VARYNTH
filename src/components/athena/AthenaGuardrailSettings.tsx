"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import { athenaGuardrailPolicy, AthenaGuardrailSettings, REQUIRED_GUARDRAILS } from "@/lib/athena/runtime/guardrail-policy";
import { Surface } from "@/components/ui/Surface";

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
    <Surface tone="panel" className="p-4" aria-labelledby="athena-guardrails-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="athena-guardrails-title" className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"><ShieldCheck size={15} className="text-[var(--vly-success)]" /> Travas de segurança</h2><p className="mt-1 text-[10px] text-[var(--vly-text-muted)]">Configuração local deste navegador. Alterações ficam registradas no diagnóstico.</p></div>
        <button onClick={() => setSettings(athenaGuardrailPolicy.reset())} className="vly-interactive min-h-11 rounded-lg border border-[var(--vly-border-default)] px-3 text-[11px] text-[var(--vly-text-secondary)]"><RotateCcw size={12} className="mr-1 inline" /> Restaurar padrões</button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--vly-border-success)] bg-[color-mix(in_srgb,var(--vly-success)_8%,var(--vly-surface))] p-3"><p className="flex items-center gap-2 text-[11px] font-bold text-[var(--vly-success)]"><LockKeyhole size={13} /> Proteções obrigatórias</p><ul className="mt-2 space-y-1 text-[10px] text-[var(--vly-text-secondary)]">{REQUIRED_GUARDRAILS.map((item) => <li key={item}>✓ {item}</li>)}</ul></div>
        <div className="space-y-2">{ADJUSTABLE.map((item) => <label key={item.key} className="vly-interactive flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3"><span><strong className="block text-[11px] text-[var(--vly-text-secondary)]">{item.title}</strong><span className="mt-0.5 block text-[9px] text-[var(--vly-text-muted)]">{item.description}</span></span><input type="checkbox" aria-label={item.title} checked={settings[item.key]} onChange={(event) => setSettings(athenaGuardrailPolicy.set(item.key, event.target.checked))} className="h-5 w-5 accent-[var(--vly-accent)]" /></label>)}</div>
      </div>
      {Object.values(settings).some((enabled) => !enabled) && <p role="status" className="vly-motion-error mt-3 flex items-start gap-2 rounded-lg border border-[var(--vly-border-warning)] bg-[var(--vly-surface-warning)] p-2 text-[10px] text-[var(--vly-warning)]"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> Há uma trava ajustável desligada. As proteções obrigatórias continuam ativas.</p>}
    </Surface>
  );
}
