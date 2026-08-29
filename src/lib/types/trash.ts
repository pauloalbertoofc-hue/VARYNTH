import { ActorType } from "./activity";

export type TrashEntityType =
  | "projeto"
  | "tarefa"
  | "nota"
  | "vault"
  | "tese"
  | "evidencia"
  | "edital"
  | "codigo"
  | "ideia"
  | "pessoa"
  | "evento";

export interface TrashItem {
  id: string;
  originalId: string;
  entityType: TrashEntityType;
  title: string;
  data: unknown;
  deletedAt: string;
  expiresAt: string;
  daysRemaining: number;
  deletedBy?: string;
  deletedByType: ActorType;
  source: "manual" | "athena" | "system";
  schemaVersion: number;
  originalPath?: string;
}
