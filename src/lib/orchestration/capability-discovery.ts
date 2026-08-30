import { CreativeOutputRequest, PlannedCapability, PlannedBlocker } from "./types";
import { creationEngineRegistry } from "../artifacts/creation-engine";

export class CreativeCapabilityDiscovery {
  private static dynamicOverrides: Map<string, boolean> = new Map();

  public static setCapabilityOverride(capabilityId: string, available: boolean): void {
    this.dynamicOverrides.set(capabilityId, available);
  }

  public static clearOverrides(): void {
    this.dynamicOverrides.clear();
  }

  public static discoverCapabilities(outputs: CreativeOutputRequest[]): {
    capabilities: PlannedCapability[];
    blockers: PlannedBlocker[];
  } {
    const capabilities: PlannedCapability[] = [];
    const blockers: PlannedBlocker[] = [];

    const types = new Set(outputs.map((o) => o.artifactType));

    // 1. Document Studio Capabilities
    if (types.has("DOCUMENT")) {
      capabilities.push({
        capabilityId: "local-document-engine",
        domain: "DOCUMENT",
        available: this.checkCapability("local-document-engine", true),
      });
      capabilities.push({
        capabilityId: "document-pdf-export",
        domain: "DOCUMENT",
        available: this.checkCapability("document-pdf-export", true),
      });
    }

    // 2. Web Studio Capabilities
    if (types.has("WEBSITE")) {
      capabilities.push({
        capabilityId: "local-web-build",
        domain: "WEBSITE",
        available: this.checkCapability("local-web-build", true),
      });
      capabilities.push({
        capabilityId: "web-sandbox-preview",
        domain: "WEBSITE",
        available: this.checkCapability("web-sandbox-preview", true),
      });
    }

    // 3. Image Studio Capabilities
    if (types.has("IMAGE")) {
      capabilities.push({
        capabilityId: "image-layers-compose",
        domain: "IMAGE",
        available: this.checkCapability("image-layers-compose", true),
      });
      capabilities.push({
        capabilityId: "image-png-export",
        domain: "IMAGE",
        available: this.checkCapability("image-png-export", true),
      });
      const genImageAvail = this.checkCapability("generative-ai-image", false);
      capabilities.push({
        capabilityId: "generative-ai-image",
        domain: "IMAGE",
        available: genImageAvail,
        fallbackAvailable: true,
        fallbackDescription: "Composição determinística em camadas a partir de assets locais",
        blockerMessage: genImageAvail
          ? undefined
          : "Modelo neural de difusão não instalado localmente. Imagens serão compostas a partir de assets existentes.",
      });
    }

    // 4. Audio Studio Capabilities
    if (types.has("AUDIO")) {
      capabilities.push({
        capabilityId: "audio-multitrack-timeline",
        domain: "AUDIO",
        available: this.checkCapability("audio-multitrack-timeline", true),
      });
      capabilities.push({
        capabilityId: "audio-wav-export",
        domain: "AUDIO",
        available: this.checkCapability("audio-wav-export", true),
      });
    }

    // 5. Video Studio Capabilities
    if (types.has("VIDEO")) {
      capabilities.push({
        capabilityId: "video-composition-timeline",
        domain: "VIDEO",
        available: this.checkCapability("video-composition-timeline", true),
      });
      capabilities.push({
        capabilityId: "video-local-render",
        domain: "VIDEO",
        available: this.checkCapability("video-local-render", true),
      });
      const genVideoAvail = this.checkCapability("generative-ai-video", false);
      capabilities.push({
        capabilityId: "generative-ai-video",
        domain: "VIDEO",
        available: genVideoAvail,
        fallbackAvailable: true,
        fallbackDescription: "Montagem em linha do tempo TemporalCore com áudios e imagens locais",
        blockerMessage: genVideoAvail
          ? undefined
          : "Modelo neural de síntese de vídeo não instalado. O vídeo será construído deterministicamente via TemporalCore com os assets fornecidos.",
      });
    }

    // 6. Game Studio Capabilities
    if (types.has("GAME")) {
      capabilities.push({
        capabilityId: "game-rules-engine",
        domain: "GAME",
        available: this.checkCapability("game-rules-engine", true),
      });
      capabilities.push({
        capabilityId: "game-web-build",
        domain: "GAME",
        available: this.checkCapability("game-web-build", true),
      });
      const androidAvail = this.checkCapability("game-android-build", false);
      capabilities.push({
        capabilityId: "game-android-build",
        domain: "GAME",
        available: androidAvail,
        fallbackAvailable: true,
        fallbackDescription: "Compilação para Web / HTML5 Sandbox",
        blockerMessage: androidAvail
          ? undefined
          : "Toolchain Android SDK/NDK ausente localmente. Compilação direcionada para Web/HTML5.",
      });
    }

    // Populate explicit blockers for critical capabilities missing
    capabilities.forEach((c) => {
      if (!c.available && !c.fallbackAvailable) {
        blockers.push({
          id: `blocker-${c.capabilityId}`,
          message: c.blockerMessage || `Capacidade crítica '${c.capabilityId}' indisponível no ambiente local.`,
          affectedArtifactTempIds: [],
          severity: "CRITICAL",
        });
      }
    });

    return { capabilities, blockers };
  }

  public static revalidateCapability(capabilityId: string): boolean {
    if (this.dynamicOverrides.has(capabilityId)) {
      return this.dynamicOverrides.get(capabilityId)!;
    }
    // Baseline availability
    if (capabilityId === "generative-ai-image" || capabilityId === "generative-ai-video" || capabilityId === "game-android-build") {
      return false;
    }
    return true;
  }

  private static checkCapability(id: string, defaultVal: boolean): boolean {
    if (this.dynamicOverrides.has(id)) {
      return this.dynamicOverrides.get(id)!;
    }
    return defaultVal;
  }
}

