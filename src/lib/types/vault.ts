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
  relatedProjectIds?: string[];
  relatedPeopleIds?: string[];
  readingStatus: ReadingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

