import { CognitiveModel, CognitiveExecutionTier, ModelRequest, ModelResponse } from "./adapter";
import { deterministicCognitiveModel } from "./providers/default-adapter";
import { capabilityRegistry } from "../kernel/capabilities";

export class CognitiveModelRouter {
  private localModels: CognitiveModel[] = [deterministicCognitiveModel];
  private externalModels: CognitiveModel[] = [];

  registerLocalModel(model: CognitiveModel): void {
    this.localModels.push(model);
  }

  registerExternalPlugin(model: CognitiveModel): void {
    this.externalModels.push(model);
  }

  /**
   * Enforces Sovereign Execution Hierarchy:
   * 1. Deterministic / Local Rule Engine
   * 2. Local Open-Source Model (e.g. Ollama, Llama.cpp)
   * 3. Optional External Commercial API (if explicitly authorized)
   */
  async routeAndGenerate(
    request: ModelRequest,
    preferredTier: CognitiveExecutionTier = "deterministic"
  ): Promise<ModelResponse> {
    // 1. First Priority: Deterministic / Local Core
    if (preferredTier === "deterministic" || this.localModels.length === 0) {
      return deterministicCognitiveModel.generate(request);
    }

    // 2. Second Priority: Local Open Model Runtime (if available)
    for (const model of this.localModels) {
      if (model.id !== "deterministic-local" && (await model.available())) {
        return model.generate(request);
      }
    }

    // 3. Third Priority: Optional External Plugin (only if present & network available)
    for (const model of this.externalModels) {
      if (await model.available()) {
        return model.generate(request);
      }
    }

    // Default Fallback: Never fail, fallback to deterministic core
    return deterministicCognitiveModel.generate(request);
  }

  async listAvailableRuntimes(): Promise<string[]> {
    const runtimes: string[] = ["VARYNTH Deterministic Core (Local)"];
    for (const m of this.localModels) {
      if (m.id !== "deterministic-local" && (await m.available())) {
        runtimes.push(`${m.name} (Local Model)`);
      }
    }
    for (const m of this.externalModels) {
      if (await m.available()) {
        runtimes.push(`${m.name} (External Plugin)`);
      }
    }
    return runtimes;
  }
}

export const cognitiveModelRouter = new CognitiveModelRouter();
