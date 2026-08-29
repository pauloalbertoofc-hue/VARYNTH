export type GraphNodeType =
  | "project"
  | "vault"
  | "codex"
  | "research"
  | "opportunity"
  | "person"
  | "lab"
  | "forge";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  color: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  entityId: string;
  link?: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  weight?: number;
}

