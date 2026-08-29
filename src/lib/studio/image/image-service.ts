import {
  ImageItem,
  ImageDocumentState,
  ImageLayer,
  ImageChangeSet,
  ImageOperation,
  ImageExportOptions,
  ImageExportResult,
  ImageCommandHistoryState,
} from "./types";
import { artifactService } from "../../artifacts/artifact-service";
import { artifactStore } from "../../artifacts/artifact-store";
import { assetManager } from "../../artifacts/asset-manager";
import { versionManager } from "../../artifacts/version-manager";
import { imageRenderEngine } from "./image-render-engine";
import { athenaEventBus } from "../../athena/events/event-bus";
import { ArtifactActor } from "../../artifacts/types";
import { IMAGE_TEMPLATES, ImageTemplate } from "./image-templates";

const IMAGE_STATE_STORAGE_PREFIX = "varynth_image_state_";
const MAX_UNDO_STACK_SIZE = 50;

export class ImageService {
  private stateCache: Map<string, ImageDocumentState> = new Map();
  private pendingChangeSets: Map<string, ImageChangeSet[]> = new Map();
  private commandHistory: Map<string, ImageCommandHistoryState> = new Map();

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(IMAGE_STATE_STORAGE_PREFIX)) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const state: ImageDocumentState = JSON.parse(raw);
              this.stateCache.set(state.artifactId, state);
            }
          }
        }
      } catch (err) {
        console.warn("[ImageService] Erro ao carregar estados do localStorage:", err);
      }
    }
  }

  private persistState(state: ImageDocumentState): void {
    this.stateCache.set(state.artifactId, state);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(
          `${IMAGE_STATE_STORAGE_PREFIX}${state.artifactId}`,
          JSON.stringify(state)
        );
      } catch (err) {
        console.error("[ImageService] Erro ao salvar estado de imagem:", err);
      }
    }
  }

  /**
   * Validates that group hierarchy has no circular dependencies (Group A -> Group B -> Group A).
   */
  public validateGroupHierarchy(layers: ImageLayer[]): { valid: boolean; error?: string } {
    const groupMap = new Map<string, ImageLayer>();
    layers.forEach((l) => {
      if (l.type === "GROUP") groupMap.set(l.id, l);
    });

    for (const layer of layers) {
      if (!layer.parentGroupId) continue;

      const visited = new Set<string>([layer.id]);
      let currentParentId: string | undefined = layer.parentGroupId;

      while (currentParentId) {
        if (visited.has(currentParentId)) {
          return {
            valid: false,
            error: `[INVALID_GROUP_HIERARCHY] Ciclo detectado na hierarquia de grupos: camada '${layer.name}' é ancestral de si mesma.`,
          };
        }
        visited.add(currentParentId);
        const parent = groupMap.get(currentParentId);
        currentParentId = parent?.parentGroupId;
      }
    }

    return { valid: true };
  }

  /**
   * Initializes session undo/redo stack for an artifact.
   */
  private getOrCreateHistory(artifactId: string): ImageCommandHistoryState {
    if (!this.commandHistory.has(artifactId)) {
      this.commandHistory.set(artifactId, { past: [], future: [] });
    }
    return this.commandHistory.get(artifactId)!;
  }

  /**
   * Pushes current state to session undo stack without touching VersionManager.
   */
  public pushUndoState(state: ImageDocumentState): void {
    const history = this.getOrCreateHistory(state.artifactId);
    history.past.push(JSON.parse(JSON.stringify(state)));
    if (history.past.length > MAX_UNDO_STACK_SIZE) {
      history.past.shift();
    }
    history.future = []; // Clear redo stack on new action
  }

  public undo(artifactId: string): ImageDocumentState | null {
    const history = this.getOrCreateHistory(artifactId);
    const currentState = this.stateCache.get(artifactId);
    if (!currentState || history.past.length === 0) return null;

    const previousState = history.past.pop()!;
    history.future.unshift(JSON.parse(JSON.stringify(currentState)));

    this.persistState(previousState);
    return previousState;
  }

  public redo(artifactId: string): ImageDocumentState | null {
    const history = this.getOrCreateHistory(artifactId);
    const currentState = this.stateCache.get(artifactId);
    if (!currentState || history.future.length === 0) return null;

    const nextState = history.future.shift()!;
    history.past.push(JSON.parse(JSON.stringify(currentState)));

    this.persistState(nextState);
    return nextState;
  }

  /**
   * Creates a new Image composition from a template or custom canvas.
   */
  public async createImage(params: {
    name: string;
    description?: string;
    templateId?: string;
    customCanvas?: { width: number; height: number; background?: string };
    actor?: ArtifactActor;
  }): Promise<{ success: boolean; image?: ImageItem; error?: string }> {
    const actor = params.actor || "USER";

    let canvas = { width: 1920, height: 1080, background: "#0b0c16" };
    let initialLayers: ImageLayer[] = [];

    if (params.templateId) {
      const tmpl = IMAGE_TEMPLATES.find((t) => t.id === params.templateId);
      if (tmpl) {
        canvas = { ...tmpl.canvas };
        initialLayers = JSON.parse(JSON.stringify(tmpl.initialLayers));
      }
    } else if (params.customCanvas) {
      canvas = {
        width: params.customCanvas.width,
        height: params.customCanvas.height,
        background: params.customCanvas.background || "#0b0c16",
      };
    }

    const limitCheck = imageRenderEngine.validateCanvasLimits(canvas.width, canvas.height);
    if (!limitCheck.valid) {
      return { success: false, error: limitCheck.error };
    }

    // 1. Create IMAGE Artifact
    const artRes = await artifactService.create(
      {
        type: "IMAGE",
        name: params.name,
        description: params.description || `Composição visual (${canvas.width}x${canvas.height})`,
        metadata: {
          width: canvas.width,
          height: canvas.height,
          canvasBackground: canvas.background,
          documentMode: "COMPOSITE",
          layerCount: initialLayers.length,
        },
        tags: ["image", "studio", "v1"],
      },
      actor
    );

    if (!artRes.success || !artRes.artifact) {
      return { success: false, error: artRes.error || "Falha ao instanciar artefato IMAGE" };
    }

    // 2. Initialize Editable Document State
    const docState: ImageDocumentState = {
      artifactId: artRes.artifact.id,
      canvas,
      layers: initialLayers,
      selectedLayerIds: initialLayers.length > 0 ? [initialLayers[0].id] : [],
      updatedAt: new Date().toISOString(),
    };

    this.persistState(docState);
    athenaEventBus.emit("IMAGE_CREATED" as any, { artifactId: artRes.artifact.id, name: params.name });

    return {
      success: true,
      image: {
        artifact: artRes.artifact,
        metadata: artRes.artifact.metadata as any,
        documentState: docState,
      },
    };
  }

  /**
   * Imports an external image file preserving the original source asset as immutable.
   */
  public async importImage(params: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    data: string | Blob | ArrayBuffer;
    actor?: ArtifactActor;
  }): Promise<{ success: boolean; image?: ImageItem; error?: string }> {
    const actor = params.actor || "USER";

    // 1. Validate Image Data
    const validation = imageRenderEngine.validateImageData(params.name, params.mimeType, params.data);
    if (validation.status !== "VALID_IMAGE") {
      return { success: false, error: validation.error };
    }

    // 2. If SVG, sanitize before storage
    let processedData = params.data;
    if (params.mimeType === "image/svg+xml" && typeof params.data === "string") {
      processedData = imageRenderEngine.sanitizeSvg(params.data);
    }

    // 3. Register Source Asset in AssetManager (marked as immutable source)
    const sourceAsset = await assetManager.registerAsset(
      {
        name: params.name,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        storageType: "INDEXEDDB_BLOB",
        createdBy: actor,
        metadata: {
          isSource: true,
          isDerived: false,
          originalName: params.name,
        },
      },
      processedData
    );

    // 4. Create IMAGE Artifact
    const artRes = await artifactService.create(
      {
        type: "IMAGE",
        name: params.name.replace(/\.[^/.]+$/, ""),
        description: `Imagem importada (${params.name})`,
        metadata: {
          sourceAssetId: sourceAsset.id,
          format: params.mimeType.replace("image/", "").toUpperCase(),
          documentMode: "RASTER",
        },
        tags: ["imported", "image", "source"],
      },
      actor
    );

    if (!artRes.success || !artRes.artifact) {
      return { success: false, error: artRes.error };
    }

    // Link source asset to artifact
    await assetManager.linkAssetToArtifact(sourceAsset.id, artRes.artifact.id);

    // 5. Initialize Document State with a single IMAGE layer
    const docState: ImageDocumentState = {
      artifactId: artRes.artifact.id,
      canvas: {
        width: 1920,
        height: 1080,
        background: "#0b0c16",
      },
      layers: [
        {
          id: `layer-${Date.now()}`,
          type: "IMAGE",
          name: params.name,
          visible: true,
          locked: false,
          opacity: 1,
          assetId: sourceAsset.id,
          transform: {
            x: 100,
            y: 100,
            width: 1720,
            height: 880,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
          },
        },
      ],
      selectedLayerIds: [],
      updatedAt: new Date().toISOString(),
    };

    this.persistState(docState);

    return {
      success: true,
      image: {
        artifact: artRes.artifact,
        metadata: artRes.artifact.metadata as any,
        documentState: docState,
      },
    };
  }

  public getImage(artifactId: string): ImageItem | null {
    const artifact = artifactService.getById(artifactId);
    if (!artifact) return null;

    let docState = this.stateCache.get(artifactId);
    if (!docState) {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = localStorage.getItem(`${IMAGE_STATE_STORAGE_PREFIX}${artifactId}`);
        if (raw) docState = JSON.parse(raw);
      }
    }

    if (!docState) {
      docState = {
        artifactId,
        canvas: { width: 1920, height: 1080, background: "#0b0c16" },
        layers: [],
        selectedLayerIds: [],
        updatedAt: new Date().toISOString(),
      };
      this.persistState(docState);
    }

    return {
      artifact,
      metadata: artifact.metadata as any,
      documentState: docState,
    };
  }

  public listImages(): ImageItem[] {
    const artifacts = artifactService.listAll("IMAGE");
    return artifacts.map((art) => {
      let docState = this.stateCache.get(art.id);
      if (!docState && typeof window !== "undefined" && window.localStorage) {
        const raw = localStorage.getItem(`${IMAGE_STATE_STORAGE_PREFIX}${art.id}`);
        if (raw) docState = JSON.parse(raw);
      }
      return {
        artifact: art,
        metadata: art.metadata as any,
        documentState: docState || {
          artifactId: art.id,
          canvas: { width: 1920, height: 1080, background: "#0b0c16" },
          layers: [],
          selectedLayerIds: [],
          updatedAt: art.updatedAt,
        },
      };
    });
  }

  /**
   * Saves layer mutations to the document state without polluting version history per keystroke/pixel.
   */
  public async saveDocumentState(
    artifactId: string,
    docState: ImageDocumentState,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const groupCheck = this.validateGroupHierarchy(docState.layers);
    if (!groupCheck.valid) {
      return { success: false, error: groupCheck.error };
    }

    docState.updatedAt = new Date().toISOString();
    this.persistState(docState);

    await artifactService.update(
      artifactId,
      {
        metadata: {
          width: docState.canvas.width,
          height: docState.canvas.height,
          layerCount: docState.layers.length,
          canvasBackground: docState.canvas.background,
        },
      },
      actor,
      "Autosave do estado do canvas",
      true // skipSnapshot = true
    );

    return { success: true };
  }

  /**
   * Creates a formal version snapshot in the VersionManager.
   */
  public async createManualVersion(
    artifactId: string,
    description: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const img = this.getImage(artifactId);
    if (!img) return { success: false, error: "Imagem não encontrada." };

    versionManager.createSnapshot(img.artifact, description, actor);
    artifactStore.save(img.artifact);
    return { success: true };
  }

  /**
   * Restores a past version applying Alex Principle (creates vNext without deleting forward versions).
   */
  public async restoreVersion(
    artifactId: string,
    versionNumber: number,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; image?: ImageItem; error?: string }> {
    const img = this.getImage(artifactId);
    if (!img) return { success: false, error: "Imagem não encontrada." };

    const res = versionManager.rollbackToVersion(img.artifact, versionNumber, actor);
    if (!res.success || !res.rolledBackArtifact) {
      return { success: false, error: res.error };
    }

    artifactStore.save(res.rolledBackArtifact);
    const currentImg = this.getImage(artifactId);
    return { success: true, image: currentImg || undefined };
  }

  /**
   * Proposes an atomic multi-operation ChangeSet from Athena.
   */
  public proposeChangeSet(
    artifactId: string,
    title: string,
    summary: string,
    operations: ImageOperation[],
    actor: "ATHENA" | "USER" = "ATHENA"
  ): ImageChangeSet {
    const cs: ImageChangeSet = {
      id: `img-cs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      artifactId,
      title,
      summary,
      operations,
      createdBy: actor,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const list = this.pendingChangeSets.get(artifactId) || [];
    list.push(cs);
    this.pendingChangeSets.set(artifactId, list);

    return cs;
  }

  public getPendingChangeSets(artifactId: string): ImageChangeSet[] {
    return (this.pendingChangeSets.get(artifactId) || []).filter((cs) => cs.status === "PENDING");
  }

  /**
   * Applies an Athena ChangeSet atomically with rollback on any failure.
   */
  public async acceptChangeSet(
    artifactId: string,
    changeSetId: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const list = this.pendingChangeSets.get(artifactId) || [];
    const cs = list.find((c) => c.id === changeSetId);
    if (!cs || cs.status !== "PENDING") {
      return { success: false, error: "ChangeSet não encontrado ou já processado." };
    }

    const currentImg = this.getImage(artifactId);
    if (!currentImg) return { success: false, error: "Imagem não encontrada." };

    // 1. Safety snapshot before Athena mutation
    versionManager.createSnapshot(
      currentImg.artifact,
      `Snapshot de segurança antes de aplicar ChangeSet: ${cs.title}`,
      actor
    );
    artifactStore.save(currentImg.artifact);

    // 2. Clone state for atomic application
    const workingState: ImageDocumentState = JSON.parse(JSON.stringify(currentImg.documentState));

    try {
      for (const op of cs.operations) {
        switch (op.type) {
          case "ADD_LAYER":
            workingState.layers.push(op.layer);
            break;
          case "REMOVE_LAYER":
            workingState.layers = workingState.layers.filter((l) => l.id !== op.layerId);
            break;
          case "TRANSFORM_LAYER": {
            const target = workingState.layers.find((l) => l.id === op.layerId);
            if (!target) throw new Error(`Camada '${op.layerId}' não encontrada para transformação.`);
            target.transform = { ...target.transform, ...op.transform };
            break;
          }
          case "UPDATE_TEXT": {
            const target = workingState.layers.find((l) => l.id === op.layerId);
            if (!target) throw new Error(`Camada de texto '${op.layerId}' não encontrada.`);
            target.textContent = op.textContent;
            if (op.textStyle) target.textStyle = { ...target.textStyle!, ...op.textStyle };
            break;
          }
          case "REORDER_LAYERS": {
            const orderMap = new Map<string, number>();
            op.layerIds.forEach((id, idx) => orderMap.set(id, idx));
            workingState.layers.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
            break;
          }
          case "ADJUST_CANVAS":
            workingState.canvas = { ...workingState.canvas, ...op.canvas };
            break;
          case "SET_LAYER_PROPERTIES": {
            const target = workingState.layers.find((l) => l.id === op.layerId);
            if (!target) throw new Error(`Camada '${op.layerId}' não encontrada.`);
            Object.assign(target, op.properties);
            break;
          }
        }
      }

      // Validate group hierarchy on resulting state
      const groupCheck = this.validateGroupHierarchy(workingState.layers);
      if (!groupCheck.valid) {
        throw new Error(groupCheck.error);
      }

      // Commit state
      await this.saveDocumentState(artifactId, workingState, actor);
      cs.status = "ACCEPTED";
      athenaEventBus.emit("IMAGE_CHANGESET_APPLIED" as any, { artifactId, changeSetId });
      return { success: true };
    } catch (err: any) {
      // Atomic rollback: original state remains intact
      cs.status = "REJECTED";
      return {
        success: false,
        error: `[ATOMIC_ROLLBACK] Falha ao aplicar operação do ChangeSet: ${err.message || String(err)}`,
      };
    }
  }

  public rejectChangeSet(artifactId: string, changeSetId: string): boolean {
    const list = this.pendingChangeSets.get(artifactId) || [];
    const cs = list.find((c) => c.id === changeSetId);
    if (!cs || cs.status !== "PENDING") return false;
    cs.status = "REJECTED";
    return true;
  }

  /**
   * Renders and exports the image composition non-destructively.
   */
  public async exportImage(
    artifactId: string,
    options: ImageExportOptions,
    actor: ArtifactActor = "USER"
  ): Promise<ImageExportResult> {
    const img = this.getImage(artifactId);
    if (!img) {
      return {
        success: false,
        format: options.format,
        dimensions: { width: 1920, height: 1080 },
        error: "Imagem não encontrada.",
      };
    }

    return await imageRenderEngine.renderComposition(img.documentState, options, actor);
  }
}

export const imageService = new ImageService();
