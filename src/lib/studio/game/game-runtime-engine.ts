import {
  GameDocumentState,
  GameTestSession,
  GameBuildResult,
  GameBuildManifest,
  GameRuntimeCapabilities,
  GameEntity,
  GameInputEvent,
} from "./types";
import { GameRulesEngine, gameRulesEngine, RuleEngineRuntimeState } from "./game-rules-engine";
import { jobManager } from "../../runtime/job-manager";
import { assetManager } from "../../artifacts/asset-manager";
import { ArtifactActor } from "../../artifacts/types";
import { athenaEventBus } from "../../athena/events/event-bus";

export interface IntegrityValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class GameIntegrityValidator {
  /**
   * Performs full static validation of the game document state
   */
  public static validate(state: GameDocumentState): IntegrityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Entry Scene Validation
    if (!state.entrySceneId) {
      errors.push("Nenhuma cena inicial (entrySceneId) definida no projeto.");
    } else {
      const entryScene = state.scenes.find((s) => s.id === state.entrySceneId);
      if (!entryScene) {
        errors.push(`Cena inicial '${state.entrySceneId}' não existe no rol de cenas.`);
      }
    }

    if (state.scenes.length === 0) {
      errors.push("O projeto deve possuir pelo menos 1 cena.");
    }

    // 2. Scene References & Reachability
    const sceneIdSet = new Set(state.scenes.map((s) => s.id));
    for (const scene of state.scenes) {
      if (scene.nextSceneIds) {
        for (const nextId of scene.nextSceneIds) {
          if (!sceneIdSet.has(nextId)) {
            errors.push(`Cena '${scene.name}' (${scene.id}) referencia cena seguinte inexistente '${nextId}'.`);
          }
        }
      }
    }

    // 3. Entity Hierarchy & Transitive Cycle Detection
    const entityMap = new Map<string, GameEntity>();
    for (const ent of state.entities) {
      entityMap.set(ent.id, ent);
    }

    for (const ent of state.entities) {
      if (ent.parentEntityId) {
        if (!entityMap.has(ent.parentEntityId)) {
          errors.push(`Entidade '${ent.name}' (${ent.id}) referencia entidade pai inexistente '${ent.parentEntityId}'.`);
        } else {
          // Check transitive cycles: traverse upward
          let currentParentId: string | undefined = ent.parentEntityId;
          const visited = new Set<string>([ent.id]);
          while (currentParentId) {
            if (visited.has(currentParentId)) {
              errors.push(
                `[CICLO NA HIERARQUIA] Ciclo transitivo detectado na entidade '${ent.name}' (${ent.id}) através de '${currentParentId}'.`
              );
              break;
            }
            visited.add(currentParentId);
            const parentEnt = entityMap.get(currentParentId);
            currentParentId = parentEnt?.parentEntityId;
          }
        }
      }
    }

    // 4. Variables Validation
    const variableIdSet = new Set(state.variables.map((v) => v.id));

    // 5. Static Rule References Validation
    for (const rule of state.rules) {
      if (rule.trigger.variableId && !variableIdSet.has(rule.trigger.variableId)) {
        errors.push(`Regra '${rule.name}' referencia variável de gatilho inexistente '${rule.trigger.variableId}'.`);
      }
      if (rule.trigger.entityId && !entityMap.has(rule.trigger.entityId)) {
        errors.push(`Regra '${rule.name}' referencia entidade de gatilho inexistente '${rule.trigger.entityId}'.`);
      }
      if (rule.trigger.targetEntityId && !entityMap.has(rule.trigger.targetEntityId)) {
        errors.push(`Regra '${rule.name}' referencia entidade alvo de gatilho inexistente '${rule.trigger.targetEntityId}'.`);
      }

      for (const cond of rule.conditions) {
        if (!variableIdSet.has(cond.variableId)) {
          errors.push(`Regra '${rule.name}' possui condição com variável inexistente '${cond.variableId}'.`);
        }
      }

      for (const act of rule.actions) {
        if (act.variableId && !variableIdSet.has(act.variableId)) {
          errors.push(`Regra '${rule.name}' possui ação que altera variável inexistente '${act.variableId}'.`);
        }
        if (act.entityId && !entityMap.has(act.entityId)) {
          errors.push(`Regra '${rule.name}' possui ação sobre entidade inexistente '${act.entityId}'.`);
        }
        if (act.targetSceneId && !sceneIdSet.has(act.targetSceneId)) {
          errors.push(`Regra '${rule.name}' possui ação de mudança para cena inexistente '${act.targetSceneId}'.`);
        }
        if (!gameRulesEngine.supportsAction(act.type)) {
          errors.push(`Ação '${act.type}' na regra '${rule.name}' não é suportada pelo runtime local.`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export class GameRuntimeEngine {
  private activeSessions = new Map<string, GameTestSession>();
  private activeSimulations = new Map<string, RuleEngineRuntimeState>();

  /**
   * Starts an isolated Sandbox Play Mode session
   */
  public startPlaySession(
    state: GameDocumentState,
    versionId = "v1.0",
    seed = 123456
  ): { success: boolean; session?: GameTestSession; error?: string } {
    const validation = GameIntegrityValidator.validate(state);
    if (!validation.valid) {
      return { success: false, error: `[VALIDAÇÃO FALHOU] ${validation.errors.join("; ")}` };
    }

    const sessionId = `session-${Date.now()}`;
    const initialVariables: Record<string, boolean | number | string> = {};
    for (const v of state.variables) {
      initialVariables[v.id] = v.initialValue;
    }

    const initialEntities: Record<string, GameEntity> = {};
    for (const e of state.entities) {
      // Deep clone entities for runtime session to protect editor state
      initialEntities[e.id] = JSON.parse(JSON.stringify(e));
    }

    const runtimeState: RuleEngineRuntimeState = {
      activeSceneId: state.entrySceneId,
      variables: { ...initialVariables },
      entities: initialEntities,
      logs: [`[SESSION_START] Sessão de teste iniciada com seed ${seed}.`],
      errors: [],
      simulationTick: 0,
      simulationClockMs: 0,
      isGameOver: false,
      score: (initialVariables["var-score"] as number) || 0,
    };

    const session: GameTestSession = {
      id: sessionId,
      artifactId: state.artifactId,
      versionId,
      seed,
      startedAt: new Date().toISOString(),
      status: "RUNNING",
      initialState: {
        activeSceneId: state.entrySceneId,
        variables: { ...initialVariables },
      },
      runtimeState: {
        activeSceneId: state.entrySceneId,
        variables: { ...initialVariables },
        simulationTick: 0,
        simulationClockMs: 0,
        score: runtimeState.score,
      },
      inputHistory: [],
      logs: runtimeState.logs,
      errors: runtimeState.errors,
    };

    this.activeSessions.set(sessionId, session);
    this.activeSimulations.set(sessionId, runtimeState);
    gameRulesEngine.setSeed(seed);
    gameRulesEngine.clearQueue();

    // Trigger ON_START event for entry scene
    gameRulesEngine.queueEvent({ type: "ON_START" }, {}, 10, 0);
    gameRulesEngine.processEvents(state.rules, runtimeState);

    // Sync session runtimeState
    session.runtimeState.activeSceneId = runtimeState.activeSceneId;
    session.runtimeState.variables = { ...runtimeState.variables };

    athenaEventBus.emit("GAME_TEST_STARTED", {
      artifactId: state.artifactId,
      sessionId,
      seed,
    });

    return { success: true, session };
  }

  /**
   * Advances the simulation by 1 logical fixed timestep
   */
  public stepSimulation(
    sessionId: string,
    state: GameDocumentState,
    inputEvents: GameInputEvent[] = []
  ): { success: boolean; session?: GameTestSession; error?: string } {
    const session = this.activeSessions.get(sessionId);
    const simState = this.activeSimulations.get(sessionId);

    if (!session || !simState) {
      return { success: false, error: `Sessão ${sessionId} não encontrada.` };
    }

    if (session.status !== "RUNNING") {
      return { success: false, error: `Sessão ${sessionId} não está em execução (${session.status}).` };
    }

    simState.simulationTick++;
    simState.simulationClockMs += GameRulesEngine.FIXED_TIMESTEP_MS;

    // Queue input events
    for (const inp of inputEvents) {
      session.inputHistory.push(inp);
      if (inp.type === "ACTION_DOWN" && inp.action) {
        gameRulesEngine.queueEvent(
          { type: "ON_ACTION", actionName: inp.action },
          { actionName: inp.action },
          5,
          simState.simulationClockMs
        );
      } else if (inp.type === "CLICK" && inp.entityId) {
        gameRulesEngine.queueEvent(
          { type: "ON_CLICK", entityId: inp.entityId },
          { originEntityId: inp.entityId },
          5,
          simState.simulationClockMs
        );
      }
    }

    // Process queued events with budget guard
    const { budgetExceeded } = gameRulesEngine.processEvents(state.rules, simState);

    // Sync state
    session.runtimeState.activeSceneId = simState.activeSceneId;
    session.runtimeState.variables = { ...simState.variables };
    session.runtimeState.simulationTick = simState.simulationTick;
    session.runtimeState.simulationClockMs = simState.simulationClockMs;
    session.runtimeState.score = (simState.variables["var-score"] as number) || 0;

    if (budgetExceeded) {
      session.status = "FAILED";
      session.endedAt = new Date().toISOString();
      return { success: false, session, error: simState.errors[simState.errors.length - 1] };
    }

    if (simState.isGameOver) {
      session.status = "COMPLETED";
      session.endedAt = new Date().toISOString();
    }

    return { success: true, session };
  }

  /**
   * Stops an active play session and releases runtime resources
   */
  public stopPlaySession(sessionId: string): { success: boolean; session?: GameTestSession } {
    const session = this.activeSessions.get(sessionId);
    if (!session) return { success: false };

    session.status = "STOPPED";
    session.endedAt = new Date().toISOString();
    this.activeSimulations.delete(sessionId);
    gameRulesEngine.clearQueue();

    athenaEventBus.emit("GAME_TEST_COMPLETED", {
      artifactId: session.artifactId,
      sessionId,
      status: "STOPPED",
    });

    return { success: true, session };
  }

  /**
   * Deterministic Replay: Replays a recorded session with the same seed and input events
   */
  public replaySession(
    state: GameDocumentState,
    recordedSession: GameTestSession
  ): { success: boolean; finalSession?: GameTestSession; match: boolean; error?: string } {
    const startRes = this.startPlaySession(state, recordedSession.versionId, recordedSession.seed);
    if (!startRes.success || !startRes.session) {
      return { success: false, match: false, error: startRes.error };
    }

    const replaySession = startRes.session;
    const ticksToSimulate = Math.max(1, recordedSession.runtimeState.simulationTick);

    for (let t = 1; t <= ticksToSimulate; t++) {
      const inputsForTick = recordedSession.inputHistory.filter((i) => i.tickId === t);
      const stepRes = this.stepSimulation(replaySession.id, state, inputsForTick);
      if (!stepRes.success) {
        return { success: false, finalSession: replaySession, match: false, error: stepRes.error };
      }
    }

    // Compare final variable state
    let match = true;
    for (const key of Object.keys(recordedSession.runtimeState.variables)) {
      if (replaySession.runtimeState.variables[key] !== recordedSession.runtimeState.variables[key]) {
        match = false;
        break;
      }
    }

    this.stopPlaySession(replaySession.id);
    return { success: true, finalSession: replaySession, match };
  }

  /**
   * Compiles the game into a standalone Web Game Build Package
   */
  public async buildWebGame(
    state: GameDocumentState,
    actor: ArtifactActor = "USER"
  ): Promise<GameBuildResult> {
    const validation = GameIntegrityValidator.validate(state);
    if (!validation.valid) {
      return { success: false, error: `[BUILD REJEITADO] ${validation.errors.join("; ")}` };
    }

    // Track build job in JobManager
    const job = jobManager.createJob({
      type: "CODE_EXECUTION",
      title: `Build Web Game: ${state.artifactId}`,
      description: `Compilando pacote Web do jogo com ${state.scenes.length} cenas e ${state.entities.length} entidades.`,
      priority: "HIGH",
      createdBy: actor,
      relatedArtifactId: state.artifactId,
      creationEngineId: "local-game-engine",
      metadata: { targetPlatform: "WEB" },
    });

    athenaEventBus.emit("GAME_BUILD_STARTED", { artifactId: state.artifactId, jobId: job.id });

    try {
      jobManager.updateProgress(job.id, 25);

      const buildId = `build-web-${Date.now()}`;
      const buildManifest: GameBuildManifest = {
        artifactId: state.artifactId,
        versionId: `v${Date.now()}`,
        buildId,
        timestamp: new Date().toISOString(),
        runtime: "varynth-web-2d-runtime",
        runtimeVersion: "1.0.0",
        schemaVersion: "1.0",
        targetPlatform: "WEB",
        resolution: { width: 800, height: 600 },
        assetIds: [],
        entrypoint: "index.html",
        sceneCount: state.scenes.length,
        entityCount: state.entities.length,
      };

      jobManager.updateProgress(job.id, 60);

      // Package HTML & JSON state
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VARYNTH Web Game</title>
  <style>body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; color: #fff; font-family: sans-serif; }</style>
</head>
<body>
  <div id="game-container">
    <canvas id="game-canvas" width="800" height="600"></canvas>
  </div>
  <script>
    window.__VARYNTH_GAME_DATA__ = ${JSON.stringify(state)};
    console.log("VARYNTH Web Game Loaded Successfully.");
  </script>
</body>
</html>`;

      const packageBlob = new Blob([htmlContent], { type: "text/html" });
      jobManager.updateProgress(job.id, 90);

      // Save build as Derived Asset
      const savedAsset = await assetManager.createAsset(
        {
          name: `game-build-${state.artifactId}.html`,
          type: "WEBSITE_BUNDLE",
          mimeType: "text/html",
          sizeBytes: packageBlob.size,
          data: packageBlob,
          metadata: {
            artifactId: state.artifactId,
            buildId,
            isDerived: true,
            manifest: buildManifest,
          },
        },
        actor
      );

      jobManager.completeJob(job.id, { buildId, assetId: savedAsset.asset.id });
      athenaEventBus.emit("GAME_BUILD_COMPLETED", { artifactId: state.artifactId, buildId, assetId: savedAsset.asset.id });

      return {
        success: true,
        buildId,
        assetId: savedAsset.asset.id,
        sizeBytes: packageBlob.size,
        manifest: buildManifest,
      };
    } catch (err: any) {
      jobManager.failJob(job.id, err.message);
      return { success: false, error: err.message };
    }
  }

  public canExport(platform: string): boolean {
    if (platform === "WEB" || platform === "HTML5") return true;
    return false; // Android and Desktop native tools report CAPABILITY_UNAVAILABLE honestly
  }
}

export const gameRuntimeEngine = new GameRuntimeEngine();
