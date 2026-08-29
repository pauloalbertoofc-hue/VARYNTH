export type ModuleLayer = "core" | "system" | "personal";

export type ModuleCategory =
  | "gestao"
  | "conhecimento"
  | "produtividade"
  | "inteligencia"
  | "juridico"
  | "pesquisa"
  | "desenvolvimento";

export interface VarynthModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  layer: ModuleLayer;
  category: ModuleCategory;
  color: "violet" | "cyan" | "green" | "orange" | "red" | "emerald" | "amber";
  href: string;
  status: "active" | "wip" | "coming-soon";
  tags: string[];
  version?: string;
  badge?: string;
}

export interface VarynthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "dono" | "membro" | "colaborador";
}

