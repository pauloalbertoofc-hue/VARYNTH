import { AthenaScope } from "./context";

export interface AthenaActionCard {
  type: "tarefa_criada" | "nota_criada" | "prazos" | "diagnostico" | "tese" | "evidencia" | "edital";
  title: string;
  subtitle?: string;
  link?: string;
  linkLabel?: string;
  data?: Record<string, unknown>;
}

export interface AthenaResponse {
  id: string;
  sender: "athena";
  text: string;
  timestamp: string;
  scope?: AthenaScope;
  actionCard?: AthenaActionCard;
  deliberationId?: string;
  participatingAgents?: string[];
  executionTimeMs?: number;
  metadata?: Record<string, unknown>;
}

// Alias for backwards compatibility
export type AthenaMessage = AthenaResponse | {
  id: string;
  sender: "user" | "athena";
  text: string;
  timestamp: string;
  scope?: AthenaScope;
  actionCard?: AthenaActionCard;
};

