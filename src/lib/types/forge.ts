export type ForgeLanguage =
  | "python"
  | "typescript"
  | "javascript"
  | "sql"
  | "json"
  | "markdown"
  | "html"
  | "css";

export interface ForgeFile {
  id: string;
  name: string;
  language: ForgeLanguage;
  content: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForgeExecutionResult {
  status: "idle" | "running" | "success" | "error";
  logs: string[];
  executionTimeMs: number;
  returnValue?: string;
  timestamp?: string;
}

export interface ForgeTemplate {
  id: string;
  title: string;
  description: string;
  language: ForgeLanguage;
  filename: string;
  code: string;
}
