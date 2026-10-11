"use client";

import { useState } from "react";
import { recordStudioResultFeedback } from "@/lib/experience/studio-result-feedback";
import type { DocumentSaveState } from "@/lib/studio/document/types";

interface StudioExperienceFeedbackProps {
  artifactId: string;
  moduleId: "document" | "web" | "image" | "audio" | "video" | "game";
  projectId?: string;
  createdByAthena: boolean;
  saveState: DocumentSaveState;
}

export function StudioExperienceFeedback(props: StudioExperienceFeedbackProps) {
  const [choice, setChoice] = useState<boolean>();
  const [correction, setCorrection] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const ready = props.saveState === "SAVED" && !busy && choice === undefined;

  async function save(helpful: boolean, note?: string) {
    setBusy(true);
    setMessage("");
    try {
      await recordStudioResultFeedback({
        artifactId: props.artifactId,
        moduleId: props.moduleId,
        projectId: props.projectId,
        createdByAthena: props.createdByAthena,
        helpful,
        correction: note,
      });
      setChoice(helpful);
      setMessage(note?.trim() ? "Correção registrada para este artefato." : "Feedback registrado para este artefato.");
    } catch {
      setMessage("Não foi possível registrar agora. O conteúdo do artefato não foi alterado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]" aria-label="Feedback sobre este resultado salvo">
      <span className="text-slate-400">Este resultado ajudou?</span>
      <button type="button" disabled={!ready} onClick={() => void save(true)} className="rounded border border-emerald-400/25 px-2 py-1 text-emerald-200 disabled:opacity-40">Sim</button>
      <button type="button" disabled={!ready} onClick={() => setChoice(false)} className="rounded border border-rose-400/25 px-2 py-1 text-rose-200 disabled:opacity-40">Não / precisa de ajuste</button>
      {choice === false && (
        <form className="flex min-w-[min(100%,28rem)] flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); void save(false, correction); }}>
          <input aria-label="Correção opcional do resultado" value={correction} onChange={(event) => setCorrection(event.target.value)} maxLength={500} placeholder="Correção opcional (até 500 caracteres)" className="min-w-0 flex-1 rounded border border-white/10 bg-black/20 px-2 py-1 text-slate-200" />
          <button type="submit" disabled={busy} className="rounded border border-violet-300/25 px-2 py-1 text-violet-200 disabled:opacity-40">{correction.trim() ? "Salvar correção" : "Registrar avaliação"}</button>
        </form>
      )}
      {message && <span role="status" className="text-slate-400">{message}</span>}
      {props.saveState !== "SAVED" && <span className="text-slate-500">Salve o artefato antes de avaliar.</span>}
      {choice !== undefined && <span className="text-slate-500">Feedback associado somente ao ID do artefato; o conteúdo não é copiado.</span>}
    </div>
  );
}
