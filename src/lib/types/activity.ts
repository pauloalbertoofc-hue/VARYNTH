export type ActorType = "user" | "athena" | "system";

export type ActivityAction =
  | "criou"
  | "atualizou"
  | "concluiu"
  | "moveu_lixeira"
  | "restaurou"
  | "destruiu_permanentemente"
  | "esvaziou_lixeira"
  | "arquivou"
  | "promoveu"
  | "executou_comando";

export type EntityType =
  | "projeto"
  | "tarefa"
  | "nota"
  | "arquivo"
  | "pesquisa"
  | "ideia"
  | "referencia"
  | "codigo"
  | "vault"
  | "tese"
  | "evidencia"
  | "edital"
  | "pessoa"
  | "evento"
  | "lixeira";

export interface ActivityLog {
  id: string;
  action: ActivityAction | string;
  entityType?: EntityType | string;
  entityId?: string;
  entityTitle?: string;
  actorType: ActorType;
  actorId?: string;
  user?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  timestamp?: string;
}

// Alias for backwards compatibility if needed
export type Activity = ActivityLog;
