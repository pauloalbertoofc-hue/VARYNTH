import {
  GameItem,
  GameDocumentState,
  GameMetadata,
  GameOperation,
  GameChangeSet,
  GameCommandHistoryState,
  GameScene,
  GameEntity,
  GameComponent,
  GameRule,
  GameVariable,
} from "./types";
import { GAME_TEMPLATES } from "./game-templates";
import { GameIntegrityValidator, gameRuntimeEngine } from "./game-runtime-engine";
import { artifactService } from "../../artifacts/artifact-service";
import { versionManager } from "../../artifacts/version-manager";
import { Artifact, ArtifactActor } from "../../artifacts/types";
import { athenaEventBus } from "../../athena/events/event-bus";
import { artifactStore } from "../../artifacts/artifact-store";

export class GameService {
  private gamesStore = new Map<string, GameItem>();
  private commandHistory = new Map<string, GameCommandHistoryState>();
  private pendingChangeSets = new Map<string, GameChangeSet[]>();

  constructor() {
    this.initDefaultGames();
  }

  private initDefaultGames() {
    // Instantiate initial default games
    const defaultTemplate = GAME_TEMPLATES[0]; // blank-2d
    const initialArtifact: Artifact = {
      id: "game-demo-1",
      name: "Protótipo 2D Inicial",
      description: "Projeto base com entidade de jogador e movimentação.",
      type: "GAME",
      status: "DRAFT",
      createdBy: "USER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentVersionNumber: 1,
      versions: [
        {
          versionId: "v1-init",
          versionNumber: 1,
          label: "Versão Inicial",
          createdAt: new Date().toISOString(),
          createdBy: "USER",
          changeSummary: "Inicialização do template 2D",
          snapshotData: {},
          fileAssetIds: [],
        },
      ],
      relationships: [],
      provenance: {
        creator: "USER",
      },
      assetFileIds: [],
      metadata: {
        gameType: defaultTemplate.gameType,
        sourceAssetIds: [],
      },
      tags: ["game", "2d"],
    };

    const docState = defaultTemplate.createDocumentState(initialArtifact.id);
    const metadata: GameMetadata = {
      gameType: defaultTemplate.gameType,
      targetPlatform: "WEB",
      resolution: { width: 800, height: 600 },
      frameRate: 60,
      entrySceneId: docState.entrySceneId,
      sceneCount: docState.scenes.length,
      entityCount: docState.entities.length,
      ruleCount: docState.rules.length,
      sourceAssetIds: [],
    };

    this.gamesStore.set(initialArtifact.id, {
      artifact: initialArtifact,
      metadata,
      documentState: docState,
    });
  }

  public getAllGames(): GameItem[] {
    for (const artifact of artifactStore.getAll().filter(a => a.type === "GAME" && a.status !== "TRASHED")) this.getGame(artifact.id);
    return Array.from(this.gamesStore.values());
  }

  public getGame(artifactId: string): GameItem | null {
    if (!this.gamesStore.has(artifactId) && typeof window !== "undefined") {
      const raw = window.localStorage.getItem(`varynth_game_state_${artifactId}`);
      if (raw) {
        try { const item = JSON.parse(raw) as GameItem; const artifact = artifactStore.getById(artifactId); if (artifact && item.artifact.id === artifactId) this.gamesStore.set(artifactId, { ...item, artifact }); } catch { /* Preserve damaged storage for recovery. */ }
      }
    }
    return this.gamesStore.get(artifactId) || null;
  }

  /**
   * Creates a new Game Artifact in DRAFT from a template
   */
  public async createGameProject(params: {
    name: string;
    description?: string;
    templateId?: string;
    actor?: ArtifactActor;
  }): Promise<{ success: boolean; game?: GameItem; error?: string }> {
    const template =
      GAME_TEMPLATES.find((t) => t.id === params.templateId) || GAME_TEMPLATES[0];

    const createRes = await artifactService.createArtifact(
      {
        type: "GAME",
        name: params.name,
        description: params.description || template.description,
        metadata: {
          gameType: template.gameType,
          templateId: template.id,
          sourceAssetIds: [],
        },
      },
      params.actor || "USER"
    );

    if (!createRes.success || !createRes.artifact) {
      return { success: false, error: createRes.error || "Falha ao criar artefato de jogo." };
    }

    const docState = template.createDocumentState(createRes.artifact.id);
    const metadata: GameMetadata = {
      gameType: template.gameType,
      targetPlatform: "WEB",
      resolution: { width: 800, height: 600 },
      frameRate: 60,
      entrySceneId: docState.entrySceneId,
      sceneCount: docState.scenes.length,
      entityCount: docState.entities.length,
      ruleCount: docState.rules.length,
      sourceAssetIds: [],
    };

    const gameItem: GameItem = {
      artifact: createRes.artifact,
      metadata,
      documentState: docState,
    };

    this.gamesStore.set(createRes.artifact.id, gameItem);
    if (typeof window !== "undefined") window.localStorage.setItem(`varynth_game_state_${createRes.artifact.id}`, JSON.stringify(gameItem));
    this.commandHistory.set(createRes.artifact.id, { past: [], future: [] });

    athenaEventBus.emit("GAME_CREATED", {
      artifactId: createRes.artifact.id,
      name: createRes.artifact.name,
      gameType: template.gameType,
    });

    return { success: true, game: gameItem };
  }

  /**
   * Autosave: updates in-memory state without version spam
   */
  public async saveDocumentState(
    artifactId: string,
    state: GameDocumentState,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const item = this.gamesStore.get(artifactId);
    if (!item) return { success: false, error: "Jogo não encontrado." };

    state.updatedAt = new Date().toISOString();
    item.documentState = state;
    item.metadata.sceneCount = state.scenes.length;
    item.metadata.entityCount = state.entities.length;
    item.metadata.ruleCount = state.rules.length;
    item.metadata.entrySceneId = state.entrySceneId;
    item.artifact.updatedAt = state.updatedAt;
    if (typeof window !== "undefined") window.localStorage.setItem(`varynth_game_state_${artifactId}`, JSON.stringify(item));

    return { success: true };
  }

  /**
   * Manual Version Snapshot in VersionManager
   */
  public async createManualVersion(
    artifactId: string,
    label: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; versionNumber?: number; error?: string }> {
    const item = this.gamesStore.get(artifactId);
    if (!item) return { success: false, error: "Jogo não encontrado." };

    const snapshot = versionManager.createSnapshot(
      item.artifact,
      `[MANUAL SNAPSHOT] ${label}`,
      actor
    );

    return { success: true, versionNumber: snapshot.versionNumber };
  }

  /**
   * Alex Principle: Rollback restores historical version as vNext
   */
  public async restoreVersion(
    artifactId: string,
    versionNumber: number,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; game?: GameItem; error?: string }> {
    const item = this.gamesStore.get(artifactId);
    if (!item) return { success: false, error: "Jogo não encontrado." };

    const rollbackRes = versionManager.rollbackToVersion(item.artifact, versionNumber, actor);
    if (!rollbackRes.success || !rollbackRes.rolledBackArtifact) {
      return { success: false, error: rollbackRes.error || "Falha ao restaurar versão." };
    }

    item.artifact = rollbackRes.rolledBackArtifact;
    return { success: true, game: item };
  }

  // -------------------------------------------------------------
  // SESSION UNDO / REDO (GameCommandHistory)
  // -------------------------------------------------------------
  public pushUndoState(state: GameDocumentState) {
    let history = this.commandHistory.get(state.artifactId);
    if (!history) {
      history = { past: [], future: [] };
      this.commandHistory.set(state.artifactId, history);
    }
    history.past.push(JSON.parse(JSON.stringify(state)));
    history.future = [];
    if (history.past.length > 50) history.past.shift();
  }

  public undo(artifactId: string): GameDocumentState | null {
    const item = this.gamesStore.get(artifactId);
    const history = this.commandHistory.get(artifactId);
    if (!item || !history || history.past.length === 0) return null;

    const previous = history.past.pop()!;
    history.future.push(JSON.parse(JSON.stringify(item.documentState)));
    item.documentState = previous;
    return previous;
  }

  public redo(artifactId: string): GameDocumentState | null {
    const item = this.gamesStore.get(artifactId);
    const history = this.commandHistory.get(artifactId);
    if (!item || !history || history.future.length === 0) return null;

    const next = history.future.pop()!;
    history.past.push(JSON.parse(JSON.stringify(item.documentState)));
    item.documentState = next;
    return next;
  }

  // -------------------------------------------------------------
  // ATHENA CHANGESETS & TRANSACTIONS
  // -------------------------------------------------------------
  public proposeChangeSet(
    artifactId: string,
    title: string,
    summary: string,
    operations: GameOperation[],
    plan?: any
  ): GameChangeSet {
    const cs: GameChangeSet = {
      id: `cs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      artifactId,
      title,
      summary,
      operations,
      plan,
      createdBy: "ATHENA",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const list = this.pendingChangeSets.get(artifactId) || [];
    list.push(cs);
    this.pendingChangeSets.set(artifactId, list);
    return cs;
  }

  public getPendingChangeSets(artifactId: string): GameChangeSet[] {
    return (this.pendingChangeSets.get(artifactId) || []).filter((c) => c.status === "PENDING");
  }

  public rejectChangeSet(artifactId: string, changeSetId: string): boolean {
    const list = this.pendingChangeSets.get(artifactId) || [];
    const cs = list.find((c) => c.id === changeSetId);
    if (cs) {
      cs.status = "REJECTED";
      return true;
    }
    return false;
  }

  /**
   * Accepts and atomically applies a ChangeSet with ATOMIC_ROLLBACK on failure
   */
  public async acceptChangeSet(
    artifactId: string,
    changeSetId: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const item = this.gamesStore.get(artifactId);
    if (!item) return { success: false, error: "Jogo não encontrado." };

    const list = this.pendingChangeSets.get(artifactId) || [];
    const cs = list.find((c) => c.id === changeSetId);
    if (!cs) return { success: false, error: "ChangeSet não encontrado." };

    // 1. Safety snapshot before mutation
    versionManager.createSnapshot(item.artifact, `[SAFETY SNAPSHOT] Antes de aplicar ${cs.title}`, actor);
    this.pushUndoState(item.documentState);

    const workingState: GameDocumentState = JSON.parse(JSON.stringify(item.documentState));

    try {
      // 2. Apply operations sequentially
      for (const op of cs.operations) {
        this.applyOperation(workingState, op);
      }

      // 3. Validate state integrity
      const validation = GameIntegrityValidator.validate(workingState);
      if (!validation.valid) {
        throw new Error(`[ATOMIC_ROLLBACK] Integridade do jogo violada: ${validation.errors.join("; ")}`);
      }

      // 4. Commit state
      item.documentState = workingState;
      cs.status = "ACCEPTED";
      await this.saveDocumentState(artifactId, workingState, actor);

      athenaEventBus.emit("GAME_CHANGESET_APPLIED", {
        artifactId,
        changeSetId: cs.id,
        appliedBy: actor,
      });

      return { success: true };
    } catch (err: any) {
      // Atomic Rollback
      cs.status = "REJECTED";
      return { success: false, error: err.message };
    }
  }

  private applyOperation(state: GameDocumentState, op: GameOperation) {
    switch (op.type) {
      case "CREATE_SCENE":
        state.scenes.push(op.scene);
        break;
      case "UPDATE_SCENE": {
        const sc = state.scenes.find((s) => s.id === op.sceneId);
        if (sc) Object.assign(sc, op.updates);
        break;
      }
      case "DELETE_SCENE":
        state.scenes = state.scenes.filter((s) => s.id !== op.sceneId);
        break;
      case "CREATE_ENTITY":
        state.entities.push(op.entity);
        break;
      case "UPDATE_ENTITY": {
        const ent = state.entities.find((e) => e.id === op.entityId);
        if (ent) Object.assign(ent, op.updates);
        break;
      }
      case "DELETE_ENTITY":
        state.entities = state.entities.filter((e) => e.id !== op.entityId);
        break;
      case "ADD_COMPONENT": {
        const ent = state.entities.find((e) => e.id === op.entityId);
        if (ent) ent.components.push(op.component);
        break;
      }
      case "REMOVE_COMPONENT": {
        const ent = state.entities.find((e) => e.id === op.entityId);
        if (ent) ent.components = ent.components.filter((c) => c.type !== op.componentType);
        break;
      }
      case "CREATE_VARIABLE":
        state.variables.push(op.variable);
        break;
      case "UPDATE_VARIABLE": {
        const v = state.variables.find((vr) => vr.id === op.variableId);
        if (v) Object.assign(v, op.updates);
        break;
      }
      case "CREATE_RULE":
        state.rules.push(op.rule);
        break;
      case "UPDATE_RULE": {
        const r = state.rules.find((rl) => rl.id === op.ruleId);
        if (r) Object.assign(r, op.updates);
        break;
      }
      case "DELETE_RULE":
        state.rules = state.rules.filter((r) => r.id !== op.ruleId);
        break;
      case "SET_ENTRY_SCENE":
        state.entrySceneId = op.sceneId;
        break;
    }
  }
}

export const gameService = new GameService();
