import { readAgentEvidenceDisclosure } from "@/lib/athena/runtime/agent-evidence-disclosure";

export function AthenaAgentEvidence({ metadata }: { metadata?: unknown }) {
  const evidence = readAgentEvidenceDisclosure(metadata);
  if (!evidence) return null;

  const resultWasDisplayed = evidence.success && evidence.accepted === true;
  return (
    <details className="mt-2 rounded-lg border border-slate-700/70 bg-slate-950/40 px-2.5 py-2 text-[10px] leading-relaxed">
      <summary className="cursor-pointer select-none text-slate-400 hover:text-violet-300">
        Base e limites · {evidence.agentName}
      </summary>
      {resultWasDisplayed ? (
        <div className="mt-2 space-y-2 text-slate-300">
          {evidence.persona && (
            <section>
              <p className="font-semibold text-slate-200">Como este agente trabalha</p>
              <p className="mt-1">{evidence.persona.identity} Método: {evidence.persona.approach}</p>
              <p className="mt-1 text-slate-400">Limite de evidência: {evidence.persona.evidenceBoundary}</p>
              <p className="mt-1 text-slate-400">Limite de autoridade: {evidence.persona.authorityBoundary}</p>
            </section>
          )}
          <section>
            <p className="font-semibold text-slate-200">Fontes e contexto indicados</p>
            {evidence.sources.length ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {evidence.sources.map((source, index) => <li key={`${index}-${source}`}>{source}</li>)}
              </ul>
            ) : (
              <p className="mt-1 text-slate-400">O executor não anexou fontes específicas estruturadas.</p>
            )}
          </section>
          <section>
            <p className="font-semibold text-slate-200">Limites informados</p>
            {evidence.limitations.length ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {evidence.limitations.map((limitation, index) => <li key={`${index}-${limitation}`}>{limitation}</li>)}
              </ul>
            ) : (
              <p className="mt-1 text-slate-400">O executor não registrou limites estruturados para esta resposta.</p>
            )}
          </section>
          {evidence.confidence !== undefined && (
            <p className="text-slate-400">
              Indicador heurístico informado pelo agente: {Math.round(evidence.confidence * 100)}%. Não é probabilidade calibrada nem garantia de acerto.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-amber-300">
          {evidence.success
            ? "O retorno do especialista não foi incorporado após a validação; suas fontes e limitações não são apresentadas como base da resposta."
            : "O especialista não concluiu a análise; o conteúdo parcial foi ocultado."}
        </p>
      )}
    </details>
  );
}
