import type { ArgumentThesis } from "@/lib/types/codex";

/** Reports registered thesis fields without claiming a current-law review or complete risk analysis. */
export function buildLegalDeliberationSummary(thesisOrCandidates?: ArgumentThesis | readonly ArgumentThesis[]): string {
  const candidates: readonly ArgumentThesis[] = thesisOrCandidates
    ? Array.isArray(thesisOrCandidates) ? thesisOrCandidates : [thesisOrCandidates as ArgumentThesis]
    : [];
  if (candidates.length > 1) {
    return `⚖️ **Conselho Jurídico (Justitia + Critias):** Encontrei mais de uma tese candidata no contexto: ${candidates.map((candidate) => `“${candidate.title}” (${candidate.area})`).join("; ")}. Ainda não escolhi nem analisei nenhuma delas. Indique qual título corresponde à sua pergunta para evitar misturar casos.`;
  }
  const thesis = candidates[0];
  if (!thesis) {
    return "⚖️ **Conselho Jurídico (Justitia + Critias):** Não identifiquei uma tese da Argument Arena que corresponda à solicitação no contexto desta execução. Isso não significa que não exista tese ou fonte fora do pacote recebido. Informe a controvérsia ou o título da tese; não houve consulta a fontes oficiais nesta execução.";
  }

  return [
    `⚖️ **Registros da tese na Argument Arena (Justitia + Critias):** “${thesis.title}” — área registrada: ${thesis.area}.`,
    `Controvérsia registrada: “${thesis.question}”.`,
    "A correspondência foi identificada por termos do título, área, questão ou tags; a pertinência jurídica real à solicitação ainda precisa ser confirmada.",
    `Argumentos favoráveis cadastrados: ${thesis.pros.map((point) => point.statement).join("; ") || "nenhum nesta tese"}.`,
    `Argumentos contrários cadastrados: ${thesis.cons.map((point) => point.statement).join("; ") || "nenhum nesta tese; isso não equivale a uma avaliação completa de riscos"}.`,
    `Referências jurisprudenciais cadastradas: ${thesis.precedents.join(", ") || "nenhuma nesta tese"}. Vigência, teor, força vinculante e pertinência não foram verificados em fonte oficial.`,
    "Esta síntese descreve registros, não é parecer jurídico nem confirmação de que a análise esteja completa. Próximo passo: conferir a legislação e os precedentes em fontes oficiais considerando jurisdição, data e fatos relevantes.",
  ].join("\n\n");
}
