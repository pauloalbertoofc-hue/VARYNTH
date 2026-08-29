export type PermissionLevel = "visualizar" | "comentar" | "editar" | "administrar";

export interface ProjectPermission {
  projectId: string;
  level: PermissionLevel;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  organization?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  tags: string[];
  notes?: string;
  projectPermissions: ProjectPermission[];
  createdAt: string;
}

