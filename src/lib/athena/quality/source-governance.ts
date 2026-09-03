export type SourceGovernance = { confidence: "alta" | "media" | "baixa"; facts: string[]; interpretations: string[]; hypotheses: string[]; references: string[]; publishable: boolean; warning?: string };

export function assessSourceGovernance(text: string, references: string[]): SourceGovernance {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const hypotheses = sentences.filter((sentence) => /\b(pode|talvez|hipotese|hipótese|sugere|possivelmente)\b/i.test(sentence));
  const interpretations = sentences.filter((sentence) => /\b(interpreta|analise|análise|entende-se|indica)\b/i.test(sentence));
  const facts = sentences.filter((sentence) => !hypotheses.includes(sentence) && !interpretations.includes(sentence)).slice(0, 12);
  const confidence = references.length >= 3 ? "alta" : references.length ? "media" : "baixa";
  return { confidence, facts, interpretations, hypotheses, references, publishable: references.length > 0, warning: references.length ? undefined : "Sem fontes verificáveis: trate este conteúdo como rascunho, não como fato publicado." };
}
