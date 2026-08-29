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
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LLMAdapter {
  id: string;
  name: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
}

