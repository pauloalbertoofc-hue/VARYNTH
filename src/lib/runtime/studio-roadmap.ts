import { StudioDefinition, StudioReadinessReport } from "./types";
import { creationEngineRegistry } from "../artifacts/creation-engine";

export const STUDIO_ROADMAP: StudioDefinition[] = [
  {
    id: "document-studio",
    name: "Document Studio",
    order: 1,
    status: "READY",
    description: "Estúdio de autoria estruturada de monografias, tratados, artigos científicos, pareceres e relatórios técnicos.",
    supportedArtifactTypes: ["DOCUMENT"],
    availableCreationEngines: ["local-document-engine"],
    capabilities: ["markdown-editor", "version-diff", "pdf-export", "athena-coauthor"],
    supportsPreview: true,
    supportsBuild: true,
    supportsExport: true,
  },
  {
    id: "web-studio",
    name: "Web Studio",
    order: 2,
    status: "READY",
    description: "Ambiente de desenvolvimento e prototipagem de aplicações web, páginas dinâmicas e portais interativos.",
    supportedArtifactTypes: ["WEBSITE", "CODE"],
    availableCreationEngines: ["local-code-engine"],
    capabilities: ["code-editor", "sandbox-preview", "bundle-export", "athena-coder"],
    supportsPreview: true,
    supportsBuild: true,
    supportsExport: true,
  },
  {
    id: "image-studio",
    name: "Image Studio",
    order: 3,
    status: "READY",
    description: "Estúdio de composição visual, storyboards, capas, diagramas e assets gráficos.",
    supportedArtifactTypes: ["IMAGE", "DIAGRAM"],
    availableCreationEngines: ["local-image-engine"],
    capabilities: ["canvas-layers", "vector-draw", "crop-resize", "png-export", "deterministic-render"],
    supportsPreview: true,
    supportsBuild: true,
    supportsExport: true,
  },
  {
    id: "audio-studio",
    name: "Audio Studio",
    order: 4,
    status: "READY",
    description: "Linha do tempo multipistas, waveforms derivadas, cortes não-destrutivos e mixagem offline PCM 16-bit.",
    supportedArtifactTypes: ["AUDIO"],
    availableCreationEngines: ["local-audio-engine"],
    capabilities: ["waveform-viewer", "multitrack-timeline", "non-destructive-trim", "offline-mix", "wav-export"],
    supportsPreview: true,
    supportsBuild: true,
    supportsExport: true,
  },
  {
    id: "video-studio",
    name: "Video Studio",
    order: 5,
    status: "READY",
    description: "Edição audiovisual em linha do tempo, integração de cenas, legendas e renderização local.",
    supportedArtifactTypes: ["VIDEO"],
    availableCreationEngines: ["local-video-engine"],
    capabilities: ["timeline-editor", "scene-arranger", "subtitles-sync", "local-render-engine", "webm-export", "mp4-export"],
    supportsPreview: true,
    supportsBuild: true,
    supportsExport: true,
  },
  {
    id: "game-studio",
    name: "Game Studio",
    order: 6,
    status: "READY",
    description: "Criação de jogos interativos, design de fases, mecânicas, assets e compilação em sandbox.",
    supportedArtifactTypes: ["GAME", "INTERACTIVE"],
    availableCreationEngines: ["local-game-engine"],
    capabilities: ["game-design-doc", "level-editor", "sandbox-playtest", "web-build", "declarative-rules", "deterministic-sim"],
    supportsPreview: true,
    supportsBuild: true,
    supportsExport: true,
  },
];

export const CREATION_FOUNDATION_ROADMAP = [
  {
    phase: 1,
    id: "cross-studio-integration",
    name: "Phase 1 — Cross-Studio Integration & Creative Graph",
    status: "READY",
    description: "Unificação relacional dos 6 Studios, Creative Graph, Version Pinning, Asset Usage e Validador de Integridade Criativa.",
    capabilities: ["creative-graph", "version-pinning", "asset-usage-tracking", "creative-integrity-validator", "reverse-index"],
  },
  {
    phase: 2,
    id: "creation-foundation-hardening",
    name: "Phase 2 — Creation Foundation Hardening & Chaos Testing",
    status: "PLANNED",
    description: "Resiliência a desastres, testes de caos, políticas avançadas de GC e integridade sob alta concorrência.",
    capabilities: ["chaos-resilience", "deep-gc-policy", "concurrent-stress-safety"],
  },
  {
    phase: 3,
    id: "athena-creative-orchestration",
    name: "Phase 3 — Athena Creative Orchestration",
    status: "PLANNED",
    description: "Orquestração autônoma de fluxos criativos multimodais (Document -> Script -> Audio/Image -> Video -> Game).",
    capabilities: ["autonomous-multimodal-orchestration", "multi-studio-generation", "smart-dependency-synthesis"],
  },
];

export class StudioRoadmapManager {
  public listStudios(): StudioDefinition[] {
    return [...STUDIO_ROADMAP].sort((a, b) => a.order - b.order);
  }

  public getStudio(id: string): StudioDefinition | undefined {
    return STUDIO_ROADMAP.find((s) => s.id === id);
  }

  public getStudioReadinessReport(studioId: string): StudioReadinessReport {
    const studio = this.getStudio(studioId);
    if (!studio) {
      throw new Error(`Studio '${studioId}' não encontrado no roadmap.`);
    }

    const hasArtifactType = studio.supportedArtifactTypes.length > 0;
    const hasEngine = studio.supportedArtifactTypes.some((type) =>
      creationEngineRegistry.isCapabilityAvailable(type)
    );

    const components = {
      artifacts: hasArtifactType,
      assets: true, // AssetManager universal exists
      versions: true, // VersionManager universal exists
      jobs: true, // JobManager universal exists
      sandbox: true, // SandboxRuntime universal exists
      renderingEngine: hasEngine,
    };

    const missingRequirements: string[] = [];
    if (!components.renderingEngine) {
      missingRequirements.push(`Engine local para renderização/build de ${studio.supportedArtifactTypes.join(", ")} ainda não instalada.`);
    }

    const readyForImplementation =
      components.artifacts &&
      components.assets &&
      components.versions &&
      components.jobs &&
      components.sandbox &&
      components.renderingEngine;

    return {
      studioId: studio.id,
      name: studio.name,
      order: studio.order,
      readyForImplementation,
      components,
      missingRequirements,
    };
  }
}

export const studioRoadmapManager = new StudioRoadmapManager();

