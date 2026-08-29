export type EvidenceStrength = "forte" | "moderada" | "preliminar" | "refutada";

export type PaperSection =
  | "introducao"
  | "revisao_literatura"
  | "metodologia"
  | "resultados"
  | "discussao"
  | "conclusao";

export interface EvidenceItem {
  id: string;
  researchId?: string; // Vinculado a uma pesquisa ou projeto
  claim: string; // Afirmação / Proposição científica
  source: string; // Autor / Artigo / Livro
  page?: string;
  quote: string; // Trecho relevante do texto
  strength: EvidenceStrength;
  section: PaperSection;
  tags: string[];
  createdAt: string;
}

export interface AcademicResearch {
  id: string;
  title: string;
  problem: string; // Pergunta de pesquisa / Problema
  hypothesis: string; // Hipótese central
  objectives: string[];
  methodology: string;
  targetVenue?: string; // Conferência, Revista ou Qualis
  submissionDeadline?: string;
  status: "planejamento" | "coleta" | "escrita" | "submetido" | "publicado";
  projectId?: string;
  tags: string[];
  createdAt: string;
}

