export type ActivityAction =
  | "criou"
  | "atualizou"
  | "concluiu"
  | "arquivou"
  | "removeu"
  | "comentou";

export type EntityType =
  | "projeto"
  | "tarefa"
  | "nota"
  | "arquivo"
  | "pesquisa"
  | "ideia"
  | "referencia";

export interface Activity {
  id: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  projectId?: string;
  timestamp: string;
  user?: string;
}

