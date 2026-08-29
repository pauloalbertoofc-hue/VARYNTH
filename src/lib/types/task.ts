import { PriorityLevel } from "./project";

export type TaskStatus = "a_fazer" | "em_progresso" | "revisao" | "concluida";

export interface Task {
  id: string;
  projectId?: string; // Optional linkage to a Project
  title: string;
  description?: string;
  status: TaskStatus;
  priority: PriorityLevel;
  dueDate?: string;
  tags?: string[];
  assignedTo?: string;
  createdAt: string;
  completedAt?: string;
}

