import { ModelCapabilities } from "./local-inference-engine";

export interface LocalModelDefinition {
  id: string;
  name: string;
  runtime: "ollama" | "llamacpp" | "embedded";
  capabilities: ModelCapabilities;
  sizeParameters?: string;
  recommendedTaskTypes: string[];
}

export class LocalModelRegistry {
  private models: Map<string, LocalModelDefinition> = new Map();

  register(model: LocalModelDefinition): void {
    this.models.set(model.id, model);
  }

  get(id: string): LocalModelDefinition | undefined {
    return this.models.get(id);
  }

  list(): LocalModelDefinition[] {
    return Array.from(this.models.values());
  }
}

export const localModelRegistry = new LocalModelRegistry();
