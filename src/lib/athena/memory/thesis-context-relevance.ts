import type { ArgumentThesis } from "@/lib/types/codex";

const GENERIC_TERMS = new Set([
  "analise", "analisar", "avaliar", "avalie", "avaliacao", "comente", "explique", "fale", "sobre", "esta", "essa", "esse", "isso", "minha", "minhas", "registrada", "registrado", "cadastrada", "cadastrado", "ativa", "atual", "juridica", "juridico", "direito", "tese", "teses", "lei", "norma", "normas", "processo", "jurisprudencia", "precedente", "precedentes", "risco", "riscos", "fundamento", "fundamentos", "argumento", "argumentos", "contrato", "caso", "questao", "questoes", "por", "favor", "quais", "qual", "como", "pode", "poderia", "para", "com", "uma", "uns", "das", "dos", "que", "tem",
]);

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function topicTerms(value: string): string[] {
  return [...new Set(normalize(value).match(/[a-z0-9]{3,}/g) || [])].filter((term) => !GENERIC_TERMS.has(term));
}

function searchableThesis(thesis: ArgumentThesis): string {
  return normalize([thesis.title, thesis.area, thesis.question, ...thesis.tags].join(" "));
}

/** Returns a unique topical match, or tied candidates for explicit disambiguation; never picks by storage order. */
export function selectRelevantTheses(
  theses: readonly ArgumentThesis[],
  prompt: string,
): ArgumentThesis[] {
  if (!theses.length) return [];
  const normalizedPrompt = normalize(prompt);
  const exactTitleMatches = theses.filter((thesis) => {
    const title = normalize(thesis.title).trim();
    return title.length >= 5 && normalizedPrompt.includes(title);
  });
  if (exactTitleMatches.length === 1) return exactTitleMatches;
  if (exactTitleMatches.length > 1) return exactTitleMatches.slice(0, 5);

  const terms = topicTerms(prompt);
  if (!terms.length) {
    if (!/\bteses?\b/.test(normalizedPrompt)) return [];
    return theses.slice(0, 5);
  }

  const ranked = theses.map((thesis) => {
    const searchable = new Set(searchableThesis(thesis).match(/[a-z0-9]{3,}/g) || []);
    const overlap = terms.filter((term) => searchable.has(term)).length;
    return { thesis, overlap, ratio: overlap / terms.length };
  }).filter((candidate) => candidate.overlap > 0 && candidate.ratio >= 0.25)
    .sort((left, right) => right.ratio - left.ratio || right.overlap - left.overlap);
  if (!ranked.length) return [];
  const best = ranked[0];
  const tied = ranked.filter((candidate) => candidate.ratio === best.ratio && candidate.overlap === best.overlap);
  return tied.slice(0, 5).map((candidate) => candidate.thesis);
}
