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

class ImageCreationEngine implements CreationEngine {
  engineId = "local-image-engine";
  name = "VARYNTH Local Image Engine";
  supportedArtifactTypes: ArtifactType[] = ["IMAGE"];

  async canExecute(request: CreationRequest): Promise<boolean> {
    return request.artifactType === "IMAGE";
  }

  async create(request: CreationRequest): Promise<CreationResult> {
    const id = `art-img-${Date.now()}`;
    const now = new Date().toISOString();

    const artifact: Artifact = {
      id,
      type: "IMAGE",
      name: request.name,
      description: request.description || "Composição de imagem local",
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
        width: request.options?.width || 1920,
        height: request.options?.height || 1080,
        format: request.options?.format || "PNG",
        documentMode: "COMPOSITE",
      },
      tags: ["image", "studio", "draft"],
    };

    versionManager.createSnapshot(artifact, "Criação inicial da composição de imagem em DRAFT (v1.0)", request.actor);
    artifactStore.save(artifact);

    return {
      success: true,
      artifact,
      capabilityStatus: "AVAILABLE",
    };
  }
}

class AudioCreationEngine implements CreationEngine {
  engineId = "local-audio-engine";
  name = "VARYNTH Local Audio Engine";
  supportedArtifactTypes: ArtifactType[] = ["AUDIO"];

  async canExecute(request: CreationRequest): Promise<boolean> {
    return request.artifactType === "AUDIO";
  }

  async create(request: CreationRequest): Promise<CreationResult> {
    const id = `art-aud-${Date.now()}`;
    const now = new Date().toISOString();

    const artifact: Artifact = {
      id,
      type: "AUDIO",
      name: request.name,
      description: request.description || "Projeto de áudio local",
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
        durationMs: request.options?.durationMs || 30000,
        timelineDurationMs: request.options?.durationMs || 30000,
        documentMode: "SINGLE_TRACK",
        format: "WAV",
      },
      tags: ["audio", "studio", "draft"],
    };

    versionManager.createSnapshot(artifact, "Criação inicial do projeto de áudio em DRAFT (v1.0)", request.actor);
    artifactStore.save(artifact);

    return {
      success: true,
      artifact,
      capabilityStatus: "AVAILABLE",
    };
  }
}

class VideoCreationEngine implements CreationEngine {
  engineId = "local-video-engine";
  name = "VARYNTH Local Video Engine";
  supportedArtifactTypes: ArtifactType[] = ["VIDEO"];

  async canExecute(request: CreationRequest): Promise<boolean> {
    return request.artifactType === "VIDEO";
  }

  async create(request: CreationRequest): Promise<CreationResult> {
    const id = `art-vid-${Date.now()}`;
    const now = new Date().toISOString();

    const artifact: Artifact = {
      id,
      type: "VIDEO",
      name: request.name,
      description: request.description || "Projeto de vídeo local",
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
        width: request.options?.width || 1920,
        height: request.options?.height || 1080,
        durationMs: request.options?.durationMs || 30000,
        timelineDurationMs: request.options?.durationMs || 30000,
        format: "MP4",
      },
      tags: ["video", "studio", "draft"],
    };

    versionManager.createSnapshot(artifact, "Criação inicial do projeto de vídeo em DRAFT (v1.0)", request.actor);
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
    this.registerEngine(new ImageCreationEngine());
    this.registerEngine(new AudioCreationEngine());
    this.registerEngine(new VideoCreationEngine());
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

