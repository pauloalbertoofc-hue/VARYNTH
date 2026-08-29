import {
  ArtifactType,
  CreationRequest,
  CreationResult,
  CreationEngine,
  Artifact,
} from "./types";
import { artifactStore } from "./artifact-store";
import { versionManager } from "./version-manager";

class DocumentCreationEngine implements CreationEngine {
  engineId = "local-document-engine";
  name = "VARYNTH Local Document Engine";
  supportedArtifactTypes: ArtifactType[] = ["DOCUMENT"];

  async canExecute(request: CreationRequest): Promise<boolean> {
    return request.artifactType === "DOCUMENT";
  }

  async create(request: CreationRequest): Promise<CreationResult> {
    const id = `art-doc-${Date.now()}`;
    const now = new Date().toISOString();

    const artifact: Artifact = {
      id,
      type: "DOCUMENT",
      name: request.name,
      description: request.description,
      projectId: request.projectId,
      status: "DRAFT",
      createdBy: request.actor,
      createdAt: now,
      updatedAt: now,
      currentVersionNumber: 0,
      versions: [],
      relationships: [],
      provenance: {
        creator: request.actor,
        generationPrompt: request.prompt,
        engineUsed: this.engineId,
      },
      assetFileIds: [],
      metadata: {
        content: request.options?.content || `# ${request.name}\n\nRascunho inicial gerado via ${this.name}.`,
        format: "markdown",
      },
      tags: ["documento", "draft"],
    };

    versionManager.createSnapshot(artifact, "Criação inicial do documento em DRAFT (v1.0)", request.actor);
    artifactStore.save(artifact);

    return {
      success: true,
      artifact,
      capabilityStatus: "AVAILABLE",
    };
  }
}

class CodeCreationEngine implements CreationEngine {
  engineId = "local-code-engine";
  name = "VARYNTH Local Code Engine";
  supportedArtifactTypes: ArtifactType[] = ["CODE", "WEBSITE"];

  async canExecute(request: CreationRequest): Promise<boolean> {
    return ["CODE", "WEBSITE"].includes(request.artifactType);
  }

  async create(request: CreationRequest): Promise<CreationResult> {
    const id = `art-code-${Date.now()}`;
    const now = new Date().toISOString();

    const artifact: Artifact = {
      id,
      type: request.artifactType,
      name: request.name,
      description: request.description,
      projectId: request.projectId,
      status: "DRAFT",
      createdBy: request.actor,
      createdAt: now,
      updatedAt: now,
      currentVersionNumber: 0,
      versions: [],
      relationships: [],
      provenance: {
        creator: request.actor,
        generationPrompt: request.prompt,
        engineUsed: this.engineId,
      },
      assetFileIds: [],
      metadata: {
        language: request.options?.language || "typescript",
        entryPoint: "index.ts",
        sourceCode: request.options?.sourceCode || "// Rascunho inicial de código",
      },
      tags: ["codigo", "draft"],
    };

    versionManager.createSnapshot(artifact, "Criação inicial do projeto de código em DRAFT (v1.0)", request.actor);
    artifactStore.save(artifact);

    return {
      success: true,
      artifact,
      capabilityStatus: "AVAILABLE",
    };
  }
}

export class CreationEngineRegistry {
  private engines: Map<string, CreationEngine> = new Map();

  constructor() {
    this.registerEngine(new DocumentCreationEngine());
    this.registerEngine(new CodeCreationEngine());
  }

  public registerEngine(engine: CreationEngine): void {
    this.engines.set(engine.engineId, engine);
  }

  public getEngineForType(type: ArtifactType): CreationEngine | undefined {
    for (const engine of this.engines.values()) {
      if (engine.supportedArtifactTypes.includes(type)) {
        return engine;
      }
    }
    return undefined;
  }

  public isCapabilityAvailable(type: ArtifactType): boolean {
    return !!this.getEngineForType(type);
  }

  public async executeCreation(request: CreationRequest): Promise<CreationResult> {
    const engine = this.getEngineForType(request.artifactType);

    if (!engine) {
      return {
        success: false,
        capabilityStatus: "CAPABILITY_UNAVAILABLE",
        error: `[CAPABILITY_UNAVAILABLE] Engine local para geração/renderização de ${request.artifactType} ainda não está disponível no ecossistema VARYNTH.`,
      };
    }

    return await engine.create(request);
  }
}

export const creationEngineRegistry = new CreationEngineRegistry();

