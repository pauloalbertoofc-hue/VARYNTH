import { ModelRequest, ModelResponse } from "./adapter";

export interface ModelCapabilities {
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsEmbeddings: boolean;
  contextWindow: number;
}

export interface LocalInferenceEngine {
  id: string;
  name: string;
  endpoint: string;
  isAvailable(): Promise<boolean>;
  generate(request: ModelRequest): Promise<ModelResponse>;
  capabilities(): Promise<ModelCapabilities>;
}

