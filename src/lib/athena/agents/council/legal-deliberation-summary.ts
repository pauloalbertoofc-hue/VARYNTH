import type { ArgumentThesis } from "@/lib/types/codex";

/** Reports registered thesis fields without claiming a current-law review or complete risk analysis. */
export function buildLegalDeliberationSummary(thesis?: ArgumentThesis): string {
  if (!thesis) {
    return "⚖️ **Conselho Jurídico (Justitia + Critias):** O contexto desta execução não trouxe uma tese formal da Argument Arena. Isso não significa que não exista uma tese ou fonte fora do pacote recebido. Informe a controvérsia e a jurisdição para uma análise delimitada; não houve consulta a fontes oficiais nesta execução.";
  }

  return [
    `⚖️ **Registros da tese na Argument Arena (Justitia + Critias):** “${thesis.title}” — área registrada: ${thesis.area}.`,
    `Controvérsia registrada: “${thesis.question}”.`,
    `Argumentos favoráveis cadastrados: ${thesis.pros.map((point) => point.statement).join("; ") || "nenhum nesta tese"}.`,
    `Argumentos contrários cadastrados: ${thesis.cons.map((point) => point.statement).join("; ") || "nenhum nesta tese; isso não equivale a uma avaliação completa de riscos"}.`,
    `Referências jurisprudenciais cadastradas: ${thesis.precedents.join(", ") || "nenhuma nesta tese"}. Vigência, teor, força vinculante e pertinência não foram verificados em fonte oficial.`,
    "Esta síntese descreve registros, não é parecer jurídico nem confirmação de que a análise esteja completa. Próximo passo: conferir a legislação e os precedentes em fontes oficiais considerando jurisdição, data e fatos relevantes.",
  ].join("\n\n");
}
