export type ModelProviderType = "local" | "external";

export type CognitiveExecutionTier = "deterministic" | "local_model" | "external_plugin";

export interface ModelRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  contextData?: Record<string, unknown>;
}

export interface ModelResponse {
  content: string;
  provider: string;
  model: string;
  providerType: ModelProviderType;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface CognitiveModel {
  id: string;
  name: string;
  providerType: ModelProviderType;
  available(): Promise<boolean>;
  generate(request: ModelRequest): Promise<ModelResponse>;
}

// Alias for backwards compatibility
export type LLMAdapter = CognitiveModel;
