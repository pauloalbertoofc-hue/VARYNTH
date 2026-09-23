export type VaultItemType =
  | "artigo"
  | "livro"
  | "jurisprudencia"
  | "lei"
  | "pdf"
  | "link"
  | "video"
  | "citacao"
  | "codigo"
  | "ideia";

export type ReadingStatus = "para_ler" | "lendo" | "concluido" | "arquivado";
export type VaultLiteraryCategory = "Ficção" | "Não ficção" | "Acadêmico/Técnico" | "Referência" | "Documento oficial" | "Material educacional" | "Produção pessoal" | "Não classificado";
export type VaultWorkType = "Livro" | "Capítulo de livro" | "Artigo científico" | "Artigo/ensaio" | "Tese" | "Dissertação" | "Monografia" | "Legislação" | "Jurisprudência" | "Relatório" | "Manual" | "Notícia" | "Página web" | "Material audiovisual" | "Nota" | "Outro";
export type VaultFormat = "PDF" | "EPUB" | "MOBI/AZW" | "DOCX" | "TXT" | "Página web" | "Imagem/OCR" | "Áudio" | "Vídeo" | "Físico" | "Outro";

export interface VaultItem {
  id: string;
  title: string;
  type: VaultItemType;
  content?: string;
  url?: string;
  author?: string;
  source?: string;
  tags: string[];
  category: string;
  literaryCategory?: VaultLiteraryCategory;
  workType?: VaultWorkType;
  format?: VaultFormat;
  primarySubject?: string;
  /** Semantic Knowledge taxonomy, separate from the legacy editorial category. */
  knowledgeDomains?: string[];
  knowledgeCategories?: string[];
  knowledgeTags?: string[];
  originalFileName?: string;
  sourceOrigin?: string;
  taxonomyVersion?: 2;
  classificationSource?: "manual" | "migration" | "athena_accepted";
  classificationConfidence?: number;
  classificationReviewedAt?: string;
  relatedProjectIds?: string[];
  relatedPeopleIds?: string[];
  readingStatus: ReadingStatus;
  notes?: string;
  wordCount?: number;
  chapters?: string[];
  processingStatus?: "aguardando_processamento" | "processando" | "indexado" | "ocr" | "requer_revisao";
  processingMessage?: string;
  storageId?: string;
  storageUrl?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}
