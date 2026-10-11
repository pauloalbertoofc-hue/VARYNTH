type ExperienceTrace = {
  agentId: string;
  retrievedPreferenceIds: string[];
  retrievedExperienceIds: string[];
  experienceIdsReferencedInResponse: string[];
  evidenceEventIdsReferencedInResponse: string[];
  instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION";
};

type ExperienceTraceEntry = { agentId: string; agentName: string; trace: ExperienceTrace };

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length <= 160);
}

function readEntries(metadata: unknown): ExperienceTraceEntry[] {
  if (!metadata || typeof metadata !== "object") return [];
  const value = (metadata as Record<string, unknown>).agentExperienceTraces;
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): ExperienceTraceEntry[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const trace = item.trace as Record<string, unknown> | undefined;
    if (
      typeof item.agentId !== "string" || typeof item.agentName !== "string" || !trace ||
      trace.instructionPrecedence !== "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION" ||
      !isIdList(trace.retrievedPreferenceIds) || !isIdList(trace.retrievedExperienceIds) ||
      !isIdList(trace.experienceIdsReferencedInResponse) || !isIdList(trace.evidenceEventIdsReferencedInResponse)
    ) return [];
    return [{
      agentId: item.agentId,
      agentName: item.agentName,
      trace: {
        agentId: item.agentId,
        retrievedPreferenceIds: trace.retrievedPreferenceIds.slice(0, 24),
        retrievedExperienceIds: trace.retrievedExperienceIds.slice(0, 24),
        experienceIdsReferencedInResponse: trace.experienceIdsReferencedInResponse.slice(0, 24),
        evidenceEventIdsReferencedInResponse: trace.evidenceEventIdsReferencedInResponse.slice(0, 24),
        instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION",
      },
    }];
  }).slice(0, 4);
}

function IdList({ label, ids }: { label: string; ids: string[] }) {
  if (!ids.length) return null;
  return <div><span className="text-slate-400">{label}:</span> <span className="font-mono text-slate-300">{ids.join(", ")}</span></div>;
}

export function AthenaExperienceTrace({ metadata }: { metadata?: unknown }) {
  const entries = readEntries(metadata);
  if (!entries.length) return null;
  return (
    <details className="mt-2 rounded-lg border border-slate-700/70 bg-slate-950/40 px-2.5 py-2 text-[10px] leading-relaxed">
      <summary className="cursor-pointer select-none text-slate-400 hover:text-violet-300">
        Rastro local da Experience · {entries.map((entry) => entry.agentName).join(", ")}
      </summary>
      <div className="mt-2 space-y-2">
        {entries.map(({ agentId, agentName, trace }) => (
          <section key={agentId} aria-label={`Rastro de Experience de ${agentName}`} className="space-y-1">
            <p className="font-semibold text-slate-300">Agente: {agentName}</p>
            <IdList label="IDs de preferências recuperadas" ids={trace.retrievedPreferenceIds} />
            <IdList label="IDs de experiências recuperadas" ids={trace.retrievedExperienceIds} />
            <IdList label="IDs cuja ação aparece literalmente no retorno do especialista" ids={trace.experienceIdsReferencedInResponse} />
            <IdList label="IDs de eventos de evidência referidos" ids={trace.evidenceEventIdsReferencedInResponse} />
            <p className="text-slate-500">A instrução atual prevalece sobre personalização. O retorno do especialista pode ter sido sintetizado ou bloqueado antes da exibição. O rastro mostra IDs e correspondências registradas, não prova influência causal nem expõe o conteúdo armazenado.</p>
          </section>
        ))}
      </div>
    </details>
  );
}
