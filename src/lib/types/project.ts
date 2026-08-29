export type ProjectCategory =
  | "software"
  | "pesquisa"
  | "estudo"
  | "negocio"
  | "academico"
  | "experimento"
  | "pessoal";

export type ProjectStatus =
  | "planejamento"
  | "ativo"
  | "em_espera"
  | "concluido"
  | "arquivado";

export type PriorityLevel = "baixa" | "media" | "alta" | "urgente";

export interface Project {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  priority: PriorityLevel;
  deadline?: string;
  tags: string[];
  collaborators?: string[];
  progress?: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  uploadedAt: string;
}

export interface ProjectReference {
  id: string;
  projectId: string;
  title: string;
  author?: string;
  url?: string;
  type: "artigo" | "livro" | "jurisprudencia" | "lei" | "site" | "video" | "outro";
  notes?: string;
  createdAt: string;
}

export interface ProjectTimelineEvent {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  date: string;
  type: "criacao" | "marco" | "entrega" | "reuniao" | "atualizacao";
}

