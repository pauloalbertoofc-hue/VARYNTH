import { TaskStatus, AthenaTask } from "../domain/task";

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  CREATED: ["PLANNED", "FAILED", "CANCELLED"],
  PLANNED: ["ROUTED", "FAILED", "CANCELLED"],
  ROUTED: ["RUNNING", "FAILED", "CANCELLED"],
  RUNNING: ["REVIEWING", "FINISHED", "FAILED", "CANCELLED"],
  REVIEWING: ["FINISHED", "RUNNING", "FAILED"],
  FINISHED: ["ARCHIVED"],
  ARCHIVED: [],
  FAILED: [],
  CANCELLED: [],
  SKIPPED: [],
};

export class TaskStateMachine {
  canTransition(from: TaskStatus, to: TaskStatus): boolean {
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  transition(task: AthenaTask, newStatus: TaskStatus): AthenaTask {
    if (!this.canTransition(task.status, newStatus)) {
      throw new Error(
        `Transição de estado inválida para Task "${task.id}": de ${task.status} para ${newStatus}`
      );
    }

    return {
      ...task,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const taskStateMachine = new TaskStateMachine();

