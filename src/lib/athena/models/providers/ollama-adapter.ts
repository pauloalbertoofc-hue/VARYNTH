import { LocalInferenceEngine, ModelCapabilities } from "../local-inference-engine";
import { ModelRequest, ModelResponse } from "../adapter";

export class OllamaAdapter implements LocalInferenceEngine {
  id = "ollama-local";
  name = "Ollama Local Runtime";
  endpoint = "http://127.0.0.1:11434";

  async isAvailable(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600); // 600ms quick check
      const res = await fetch(`${this.endpoint}/api/tags`, {
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
      const res = await fetch(`${this.endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen2.5:7b",
          prompt: `${request.systemPrompt}\n\nUser: ${request.userPrompt}`,
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama retornou status ${res.status}`);
      }

      const data = await res.json();
      return {
        content: data.response || "",
        provider: "ollama-local",
        model: data.model || "local-qwen",
        providerType: "local",
      };
    } catch (err: any) {
      throw new Error(`Falha na inferência local Ollama: ${err?.message || String(err)}`);
    }
  }

  async capabilities(): Promise<ModelCapabilities> {
    return {
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsEmbeddings: true,
      contextWindow: 32768,
    };
  }
}

export const ollamaAdapter = new OllamaAdapter();

