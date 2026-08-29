import { AthenaMessage } from "./response";
import { AthenaScope } from "./context";

export interface AthenaSession {
  id: string;
  scope: AthenaScope;
  projectId?: string;
  messages: AthenaMessage[];
  lastActive: string;
}

