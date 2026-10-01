"use client";

import { useState } from "react";
import type { AthenaFeedbackCategory } from "@/lib/athena/conversation/quality-feedback";
import { athenaConversationFeedback } from "@/lib/athena/conversation/quality-feedback";
import { recordAthenaFeedbackInExperience } from "@/lib/athena/conversation/experience-feedback-bridge";

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
  const [experienceStatus, setExperienceStatus] = useState<"idle" | "saving" | "saved" | "local-only">("idle");

  const choose = async (category: AthenaFeedbackCategory) => {
    if (selected === category) return;
    const feedback = athenaConversationFeedback.record({ ...props, category });
    setSelected(category);
    setExperienceStatus("saving");
    try {
      await recordAthenaFeedbackInExperience(feedback);
      setExperienceStatus("saved");
    } catch {
      setExperienceStatus("local-only");
    }
  };

  return (
    <div className="mt-2 flex flex-wrap gap-1" aria-label="Avaliar resposta da Athena">
      {choices.map((choice) => (
        <button
          key={choice.category}
          type="button"
          onClick={() => { void choose(choice.category); }}
          disabled={experienceStatus === "saving"}
          aria-pressed={selected === choice.category}
          className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${
            selected === choice.category
              ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
              : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
          }`}
        >
          {choice.label}
        </button>
      ))}
      {selected && selected !== "HELPFUL" && (
        <div className="basis-full space-y-1 pt-1">
          <input aria-label="Como a Athena deveria responder" value={correction} onChange={event => { setCorrection(event.target.value); setSaved(false); }} placeholder="O que deveria acontecer? (opcional)" className="w-full rounded border border-white/15 bg-black/20 p-2 text-xs text-slate-200" />
          <button type="button" onClick={() => { athenaConversationFeedback.record({ ...props, category: selected, correction: correction.trim() }); setSaved(true); }} className="text-xs text-violet-300">Salvar correção</button>
          <p role="status" className="text-[10px] text-slate-400">{saved ? "Correção salva. Diga “corrija a resposta” para retomar este pedido." : "Feedback registrado. Você pode explicar o ajuste e pedir “corrija a resposta”."}</p>
        </div>
      )}
      {selected && <p role="status" className="basis-full text-[10px] text-slate-400">
        {experienceStatus === "saving" ? "Associando sua avaliação à Experience…" : experienceStatus === "saved" ? "Avaliação explícita registrada na Experience desta conta. O texto da conversa não foi copiado." : experienceStatus === "local-only" ? "Avaliação mantida localmente; não foi associada à Experience. Verifique se você está conectado." : ""}
      </p>}
    </div>
  );
}
