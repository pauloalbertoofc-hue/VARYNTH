import { LocalInferenceEngine, ModelCapabilities } from "../local-inference-engine";
import { ModelRequest, ModelResponse } from "../adapter";

export interface DetectedLocalRuntime {
  isAvailable: boolean;
  endpoint: string;
  activeModel?: string;
  installedModels: string[];
  lastChecked: string;
}

export class OllamaAdapter implements LocalInferenceEngine {
  id = "ollama-local";
  name = "Ollama Local Neural Engine";
  endpoint = "http://127.0.0.1:11434";
  activeModel: string | undefined = undefined;
  installedModels: string[] = [];

  /**
   * Automatically inspects 127.0.0.1:11434 to check if Ollama is running and discover all installed models.
   */
  async autoDetect(): Promise<DetectedLocalRuntime> {
    if (typeof window === "undefined") {
      return {
        isAvailable: false,
        endpoint: this.endpoint,
        installedModels: [],
        lastChecked: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout

      const res = await fetch(`${this.endpoint}/api/tags`, {
        signal: controller.signal,
        method: "GET",
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const models: string[] = Array.isArray(data.models)
          ? data.models.map((m: any) => m.name || m.model)
          : [];

        this.installedModels = models;

        // Auto-select preferred model (e.g. qwen, llama, deepseek, or first available)
        const preferred =
          models.find((m) => m.toLowerCase().includes("qwen")) ||
          models.find((m) => m.toLowerCase().includes("llama")) ||
          models.find((m) => m.toLowerCase().includes("deepseek")) ||
          models.find((m) => m.toLowerCase().includes("mistral")) ||
          models[0];

        this.activeModel = preferred;

        return {
          isAvailable: true,
          endpoint: this.endpoint,
          activeModel: preferred,
          installedModels: models,
          lastChecked: new Date().toISOString(),
        };
      }
    } catch {
      // Ollama not currently running on 127.0.0.1:11434
    }

    this.activeModel = undefined;
    this.installedModels = [];

    return {
      isAvailable: false,
      endpoint: this.endpoint,
      installedModels: [],
      lastChecked: new Date().toISOString(),
    };
  }

  async isAvailable(): Promise<boolean> {
    const status = await this.autoDetect();
    return status.isAvailable;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const targetModel = this.activeModel || (this.installedModels.length > 0 ? this.installedModels[0] : "qwen2.5:7b");

    try {
      const res = await fetch(`${this.endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: targetModel,
          prompt: `${request.systemPrompt}\n\n[CONTEXTO VIVO DO VARYNTH OS]\n${JSON.stringify(request.contextData || {})}\n\n[USUÁRIO]\n${request.userPrompt}`,
          stream: false,
          options: {
            temperature: request.temperature || 0.7,
            num_predict: request.maxTokens || 1024,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama retornou HTTP ${res.status}`);
      }

      const data = await res.json();
      return {
        content: data.response || "",
        provider: "ollama-local",
        model: targetModel,
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
