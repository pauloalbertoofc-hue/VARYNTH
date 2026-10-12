import type { EvidenceItem } from "@/lib/types/research";

/** Describes the Evidence Board inventory without implying query relevance or source verification. */
export function buildResearchEvidenceSummary(evidences: readonly EvidenceItem[]): string {
  if (evidences.length === 0) {
    return "🔬 **Conselho Científico (Logos + Critias):** O contexto desta execução não trouxe registros do Evidence Board. Isso não demonstra que não existam estudos ou fontes fora do pacote recebido; também não houve busca externa. Indique as fontes ou o recorte que deseja analisar.";
  }

  const strong = evidences.filter((item) => item.strength === "forte");
  const moderate = evidences.filter((item) => item.strength === "moderada");
  const preliminary = evidences.filter((item) => item.strength === "preliminar");
  const refuted = evidences.filter((item) => item.strength === "refutada");
  const exemplar = strong[0];

  return [
    `🔬 **Registros disponíveis no Evidence Board (Logos + Critias):** ${evidences.length} registro(s) no pacote recebido: ${strong.length} classificados como fortes, ${moderate.length} moderados, ${preliminary.length} preliminares e ${refuted.length} refutados. Essas classes são as cadastradas no acervo, não uma avaliação independente.`,
    "A pertinência de cada registro à pergunta atual e a natureza primária das fontes não foram verificadas nesta síntese; trate os itens como candidatos para triagem, não como resposta já validada.",
    ...(exemplar ? [`Exemplo de registro classificado como forte no acervo (não significa que seja central ou pertinente à pergunta): “${exemplar.claim}” — ${exemplar.source}.`] : []),
    ...(refuted.length ? [`Há também registro(s) classificados como refutados no acervo: ${refuted.slice(0, 2).map((item) => `“${item.claim}” — ${item.source}`).join("; ")}.`] : []),
    "Próximo passo: confirmar quais registros respondem diretamente à pergunta e conferir fonte original, método e contexto antes de sintetizar; nenhuma fonte primária foi verificada e não houve consulta externa.",
  ].join("\n\n");
}
