import type { ActorType, Task } from "@/lib/types";
import type { ExperienceEvent } from "./contracts";
import { experienceService } from "./experience-service";

type TaskSignal = "TASK_CREATED" | "TASK_STATUS_CHANGED" | "TASK_PRIORITY_CHANGED";

function actorDetails(actorType: ActorType) {
  if (actorType === "athena") return { actor: "AGENT" as const, agentId: "athena" };
  if (actorType === "system") return { actor: "SYSTEM" as const };
  return { actor: "USER" as const };
}

/** Records deliberate task lifecycle changes without retaining task title or description. */
export function recordTaskExperience(input: {
  task: Pick<Task, "id" | "projectId" | "status" | "priority">;
  actorType?: ActorType;
  signal: TaskSignal;
  before?: { status?: Task["status"]; priority?: Task["priority"] };
}): Promise<ExperienceEvent> {
  const actorType = input.actorType ?? "user";
  const identity = actorDetails(actorType);
  return experienceService.record({
    ...identity,
    actionType: "USER_ACTION",
    domain: "productivity",
    moduleId: "chronos",
    projectId: input.task.projectId,
    targetType: "TASK",
    targetId: input.task.id,
    correlationId: `${input.task.projectId || "account"}:task:${input.task.id}`,
    before: input.before ? { ...(input.before.status ? { status: input.before.status } : {}), ...(input.before.priority ? { priority: input.before.priority } : {}) } : undefined,
    after: { status: input.task.status, priority: input.task.priority },
    metadata: { taskSignal: input.signal, generatedAutomatically: identity.actor !== "USER" },
    source: "task-learning-adapter",
    privacyScope: input.task.projectId ? "PROJECT_SHARED" : "USER_SHARED",
    learningEligible: identity.actor === "USER",
  });
}

