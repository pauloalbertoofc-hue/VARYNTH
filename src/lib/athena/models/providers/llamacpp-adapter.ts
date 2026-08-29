import { LocalInferenceEngine, ModelCapabilities } from "../local-inference-engine";
import { ModelRequest, ModelResponse } from "../adapter";

export class LlamaCppAdapter implements LocalInferenceEngine {
  id = "llamacpp-local";
  name = "llama.cpp Server Local";
  endpoint = "http://127.0.0.1:8080";

  async isAvailable(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch(`${this.endpoint}/health`, {
        signal: controller.signal,
        method: "GET",
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    try {
      const res = await fetch(`${this.endpoint}/completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${request.systemPrompt}\n\n${request.userPrompt}`,
          temperature: request.temperature || 0.2,
          n_predict: request.maxTokens || 1024,
        }),
      });

      if (!res.ok) {
        throw new Error(`llama.cpp retornou status ${res.status}`);
      }

      const data = await res.json();
      return {
        content: data.content || "",
        provider: "llamacpp-local",
        model: "gguf-local",
        providerType: "local",
      };
    } catch (err: any) {
      throw new Error(`Falha na inferência local llama.cpp: ${err?.message || String(err)}`);
    }
  }

  async capabilities(): Promise<ModelCapabilities> {
    return {
      supportsTools: false,
      supportsStructuredOutput: true,
      supportsEmbeddings: true,
      contextWindow: 16384,
    };
  }
}

export const llamaCppAdapter = new LlamaCppAdapter();

