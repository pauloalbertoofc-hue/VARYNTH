"use client";

import { useState } from "react";
import type { AthenaFeedbackCategory } from "@/lib/athena/conversation/quality-feedback";
import { athenaConversationFeedback } from "@/lib/athena/conversation/quality-feedback";
import { Surface } from "@/components/ui/Surface";

interface AthenaFeedbackControlsProps {
  messageId: string;
  response: string;
  sessionId: string;
  prompt?: string;
}

const choices: { category: AthenaFeedbackCategory; label: string }[] = [
  { category: "HELPFUL", label: "Útil" },
  { category: "MISUNDERSTOOD", label: "Não entendeu" },
  { category: "GENERIC_RESPONSE", label: "Genérica" },
  { category: "LOST_CONTEXT", label: "Perdeu contexto" },
  { category: "WRONG_ACTION", label: "Ação errada" },
];

export function AthenaFeedbackControls(props: AthenaFeedbackControlsProps) {
  const [selected, setSelected] = useState<AthenaFeedbackCategory>();
  const [correction, setCorrection] = useState("");
  const [saved, setSaved] = useState(false);

  const choose = (category: AthenaFeedbackCategory) => {
    athenaConversationFeedback.record({ ...props, category });
    setSelected(category);
  };

  return (
    <Surface tone="raised" className="mt-2 flex flex-wrap gap-1 border-none bg-transparent p-0" aria-label="Avaliar resposta da Athena">
      {choices.map((choice) => (
        <button
          key={choice.category}
          type="button"
          onClick={() => choose(choice.category)}
          aria-pressed={selected === choice.category}
          className={`vly-interactive rounded-md border px-2 py-1 text-[10px] transition-colors ${
            selected === choice.category
              ? "border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/15 text-[var(--vly-accent)]"
              : "border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)] hover:border-[var(--vly-border-default)] hover:text-[var(--vly-text-secondary)]"
          }`}
        >
          {choice.label}
        </button>
      ))}
      {selected && selected !== "HELPFUL" && (
        <div className="basis-full space-y-1 pt-1">
          <input aria-label="Como a Athena deveria responder" value={correction} onChange={event => { setCorrection(event.target.value); setSaved(false); }} placeholder="O que deveria acontecer? (opcional)" className="vly-field w-full rounded p-2 text-xs" />
          <button type="button" onClick={() => { athenaConversationFeedback.record({ ...props, category: selected, correction: correction.trim() }); setSaved(true); }} className="vly-interactive text-xs text-[var(--vly-accent)]">Salvar correção</button>
          <p role="status" className="text-[10px] text-[var(--vly-text-secondary)]">{saved ? "Correção salva. Diga “corrija a resposta” para retomar este pedido." : "Feedback registrado. Você pode explicar o ajuste e pedir “corrija a resposta”."}</p>
        </div>
      )}
    </Surface>
  );
}
