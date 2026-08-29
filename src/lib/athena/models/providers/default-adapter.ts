import { LLMAdapter, ModelRequest, ModelResponse } from "../adapter";

export class DefaultModelAdapter implements LLMAdapter {
  id = "default-adapter";
  name = "VARYNTH Deterministic Reasoning Engine";

  async generate(request: ModelRequest): Promise<ModelResponse> {
    return {
      content: `[VARYNTH AI Response based on System Context]`,
      provider: "varynth-internal",
      model: "athena-core-v2",
    };
  }
}

export const defaultModelAdapter = new DefaultModelAdapter();

