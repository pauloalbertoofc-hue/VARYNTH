export type AthenaScope = "geral" | "juridico" | "pesquisa" | "produtividade";

export interface AthenaActionCard {
  type: "tarefa_criada" | "nota_criada" | "prazos" | "diagnostico" | "tese" | "evidencia" | "edital";
  title: string;
  subtitle?: string;
  link?: string;
  linkLabel?: string;
  data?: Record<string, unknown>;
}

export interface AthenaMessage {
  id: string;
  sender: "user" | "athena";
  text: string;
  timestamp: string;
  scope?: AthenaScope;
  actionCard?: AthenaActionCard;
}
