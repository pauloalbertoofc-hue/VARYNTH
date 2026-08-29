import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { AgentResult } from "../domain/result";

export interface AgentManifest {
  id: string;
  name: string;
  role: string;
  version: string;
  description: string;
  skills: string[];
  priority: number;
  enabled: boolean;
}

export interface AthenaAgent {
  manifest: AgentManifest;
  canHandle(task: AthenaTask, context: AthenaContext): boolean;
  execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult>;
  review?(result: AgentResult, context: AthenaContext): Promise<AgentResult>;
}

