import JSZip from "jszip";
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
import { stepPhysics } from "./game-physics";
import { stepAnimations } from "./game-animation";
import { stepCameras } from "./game-camera";
import { audioEventConditionsPass, validateGameAudioPackage } from "../audio/game-audio-domain";

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

    if (state.gameAudioPackage) {
      const availableAudioAssets = new Set(assetManager.getAllAssets().filter((asset) => asset.status !== "QUARANTINED" && asset.status !== "CORRUPTED").map((asset) => asset.id));
      for (const issue of validateGameAudioPackage(state.gameAudioPackage, availableAudioAssets)) errors.push(`[GAME_AUDIO:${issue.code}] ${issue.message}`);
    }

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
        if (act.audioEventId && !state.gameAudioPackage?.events.some((event) => event.id === act.audioEventId)) {
          errors.push(`Regra '${rule.name}' referencia evento Game Audio inexistente '${act.audioEventId}'.`);
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

  public getRuntimeEntities(sessionId: string): Record<string, GameEntity> | null {
    const state = this.activeSimulations.get(sessionId);
    return state ? JSON.parse(JSON.stringify(state.entities)) : null;
  }

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
    session.logs = [...runtimeState.logs];

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

    const physics = stepPhysics(simState.entities, GameRulesEngine.FIXED_TIMESTEP_MS);
    stepAnimations(simState.entities, GameRulesEngine.FIXED_TIMESTEP_MS);
    stepCameras(simState.entities, GameRulesEngine.FIXED_TIMESTEP_MS);
    for (const collision of physics.collisions) {
      gameRulesEngine.queueEvent({ type: "ON_COLLISION", entityId: collision.entityId, targetEntityId: collision.targetEntityId }, collision, 6, simState.simulationClockMs);
    }

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
    session.logs = [...simState.logs];

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
        assetIds: [...new Set([...(state.gameAudioPackage?.assets.map((asset) => asset.assetId) || []), ...state.entities.flatMap((entity) => entity.components.flatMap((component) => component.type === "SPRITE" || component.type === "AUDIO_SOURCE" ? [component.assetId] : component.type === "ANIMATOR" ? component.clips.flatMap((clip) => clip.frames.map((frame) => frame.assetId)) : []))])],
        entrypoint: "index.html",
        sceneCount: state.scenes.length,
        entityCount: state.entities.length,
        packageFormat: "ZIP",
      };

      jobManager.updateProgress(job.id, 60);

      const assetFiles: NonNullable<GameBuildManifest["assetFiles"]> = [];
      const includedAssetIds = buildManifest.assetIds;
      const zip = new JSZip();
      for (const assetId of includedAssetIds) {
        const asset = assetManager.getAsset(assetId);
        const data = await assetManager.getAssetData(assetId);
        if (!asset || !data) throw new Error(`[BUILD_ASSET_MISSING] O asset '${assetId}' não possui dados locais utilizáveis.`);
        let raw: ArrayBuffer;
        if (typeof data === "string") {
          const response = await fetch(data);
          if (!response.ok) throw new Error(`[BUILD_ASSET_READ_FAILED] Não foi possível ler '${assetId}'.`);
          raw = await response.arrayBuffer();
        } else if (data instanceof Blob) raw = await data.arrayBuffer();
        else raw = data.slice(0);
        const digest = await crypto.subtle.digest("SHA-256", raw);
        const sha256 = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
        const path = `assets/${assetId}-${asset.name.replace(/[^a-zA-Z0-9._-]+/g, "-")}`;
        zip.file(path, raw);
        assetFiles.push({ assetId, path, bytes: raw.byteLength, sha256, mimeType: asset.mimeType });
      }
      buildManifest.assetFiles = assetFiles;
      zip.file("manifest.json", JSON.stringify(buildManifest, null, 2));
      zip.file("game-state.json", JSON.stringify(state, null, 2));

      // Package HTML & JSON state in a self-contained browser runtime.
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${String(state.artifactId).replace(/[^a-zA-Z0-9 _-]/g, "")}</title>
  <style>body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; color: #fff; font-family: sans-serif; } canvas { border: 1px solid #334155; background: #0f172a; }</style>
</head>
<body>
  <div id="game-container">
    <canvas id="game-canvas" width="800" height="600"></canvas>
  </div>
  <script>
    window.__VARYNTH_GAME_DATA__ = ${JSON.stringify(state)};
    window.__VARYNTH_GAME_MANIFEST__ = ${JSON.stringify(buildManifest)};
    const game = window.__VARYNTH_GAME_DATA__;
    const manifest = window.__VARYNTH_GAME_MANIFEST__;
    const canvas = document.getElementById("game-canvas");
    const context = canvas.getContext("2d");
    const assetPaths = Object.fromEntries((manifest.assetFiles || []).map(item => [item.assetId, item.path]));
    const audioBuffers = new Map(); const imageAssets = new Map(); const sceneSources = new Set(); const sceneLoopStoppers = new Set(); const animationStarted = performance.now();
    async function loadImage(assetId) { if (imageAssets.has(assetId)) return imageAssets.get(assetId); const path = assetPaths[assetId]; if (!path) return null; try { const image = new Image(); image.src = path; await image.decode(); imageAssets.set(assetId, image); return image; } catch (_) { return null; } }
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    async function playAsset(assetId, options = {}) {
      const path = assetPaths[assetId]; if (!path) return;
      try {
        let buffer = audioBuffers.get(assetId);
        if (!buffer) { const response = await fetch(path); buffer = await audioContext.decodeAudioData(await response.arrayBuffer()); audioBuffers.set(assetId, buffer); }
        if (audioContext.state === "suspended") await audioContext.resume();
        const start = Math.max(0, Number(options.startMs || 0) / 1000); const end = Math.min(buffer.duration, Math.max(start, Number(options.endMs || buffer.duration * 1000) / 1000)); const rate = Number(options.rate || 1); const volume = Number(options.volume || 1); const crossfade = Math.min(Math.max(0, Number(options.crossfadeMs || 0) / 1000), Math.max(0, (end - start) / 2));
        if (options.loop && crossfade > 0 && end > start) {
          let cancelled = false; const stopLoop = () => { cancelled = true; }; if (options.sceneSource) sceneLoopStoppers.add(stopLoop);
          const schedule = (when) => { if (cancelled) return; const duration = end - start; const source = audioContext.createBufferSource(); source.buffer = buffer; source.playbackRate.value = rate; const gain = audioContext.createGain(); const spatial = options.spatial ? audioContext.createPanner() : null; if (spatial) { spatial.panningModel = "HRTF"; spatial.distanceModel = "inverse"; spatial.positionX.value = Number(options.spatial.x || 0); spatial.positionY.value = Number(options.spatial.y || 0); spatial.positionZ.value = Number(options.spatial.z || 0); spatial.refDistance = Math.max(0.001, Number(options.spatial.refDistance || 1)); spatial.maxDistance = Math.max(spatial.refDistance, Number(options.spatial.maxDistance || 10000)); spatial.rolloffFactor = Math.max(0, Number(options.spatial.rolloffFactor ?? 1)); } const fade = Math.min(crossfade, duration / 2); gain.gain.setValueAtTime(0, when); gain.gain.linearRampToValueAtTime(volume, when + fade); gain.gain.setValueAtTime(volume, when + duration - fade); gain.gain.linearRampToValueAtTime(0, when + duration); source.connect(gain); gain.connect(spatial || audioContext.destination); if (spatial) spatial.connect(audioContext.destination); source.start(when, start); source.stop(when + duration); window.setTimeout(() => schedule(audioContext.currentTime + Math.max(0.01, duration - fade)), Math.max(10, (duration - fade) * 1000)); };
          schedule(audioContext.currentTime);
        } else { const source = audioContext.createBufferSource(); source.buffer = buffer; source.loop = Boolean(options.loop); source.loopStart = start; source.loopEnd = end; source.playbackRate.value = rate; const gain = audioContext.createGain(); gain.gain.value = volume; const spatial = options.spatial ? audioContext.createPanner() : null; if (spatial) { spatial.panningModel = "HRTF"; spatial.distanceModel = "inverse"; spatial.positionX.value = Number(options.spatial.x || 0); spatial.positionY.value = Number(options.spatial.y || 0); spatial.positionZ.value = Number(options.spatial.z || 0); spatial.refDistance = Math.max(0.001, Number(options.spatial.refDistance || 1)); spatial.maxDistance = Math.max(spatial.refDistance, Number(options.spatial.maxDistance || 10000)); spatial.rolloffFactor = Math.max(0, Number(options.spatial.rolloffFactor ?? 1)); } source.connect(gain); gain.connect(spatial || audioContext.destination); if (spatial) spatial.connect(audioContext.destination); if (options.sceneSource) { sceneSources.add(source); source.addEventListener("ended", () => sceneSources.delete(source)); } source.start(0, source.loop ? start : start); }
      } catch (error) { console.warn("VARYNTH audio runtime failed", assetId, error); }
    }
    let eventSequence = 0;
    async function playEvent(eventId) {
      const event = (game.gameAudioPackage?.events || []).find(item => item.id === eventId); if (!event || !audioEventConditionsPass(event.conditions, runtime.variables)) return;
      const group = (game.gameAudioPackage?.variationGroups || []).find(item => item.id === event.variationGroupId);
      const variations = (group?.variations || []).filter(item => Number(item.weight) > 0);
      const totalWeight = variations.reduce((sum, item) => sum + Number(item.weight || 0), 0);
      let cursor = totalWeight ? (eventSequence++ % totalWeight) : 0; let chosen = null;
      for (const variation of variations) { cursor -= Number(variation.weight || 0); if (cursor < 0) { chosen = variation; break; } }
      await playAsset(chosen?.assetId || event.assetIds?.[eventSequence++ % Math.max(1, event.assetIds?.length || 1)], { volume: event.volumeRange?.[0] || 1, rate: event.pitchRange?.[0] || 1, loop: Boolean(event.loop?.loopable), startMs: event.loop?.startMs || 0, endMs: event.loop?.endMs, crossfadeMs: event.loop?.crossfadeMs || 0, spatial: event.spatial });
    }
    const runtime = { sceneId: game.entrySceneId, variables: Object.fromEntries((game.variables || []).map(item => [item.id, item.currentValue ?? item.initialValue])), visible: Object.fromEntries((game.entities || []).map(item => [item.id, true])), ended: false };
    function drawRuntime() {
      context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = "#0f172a"; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = "#e2e8f0"; context.font = "16px sans-serif"; context.fillText("VARYNTH Web Runtime", 24, 32); context.font = "12px monospace"; context.fillText("Build ${buildId}", 24, 54); context.fillText("Cena: " + (game.scenes || []).find(item => item.id === runtime.sceneId)?.name, 24, 76);
      (game.entities || []).filter(entity => entity.sceneId === runtime.sceneId && runtime.visible[entity.id]).forEach(entity => { const transform = (entity.components || []).find(component => component.type === "TRANSFORM"); const sprite = (entity.components || []).find(component => component.type === "SPRITE"); const animator = (entity.components || []).find(component => component.type === "ANIMATOR"); const activeClip = animator?.clips?.find(clip => clip.id === animator.activeClipId) || animator?.clips?.[0]; let visualAssetId = sprite?.assetId; if (activeClip?.frames?.length) { const total = activeClip.frames.reduce((sum, frame) => sum + Number(frame.durationMs || 100), 0); let cursor = total ? ((performance.now() - animationStarted) % total) : 0; visualAssetId = activeClip.frames.find(frame => { cursor -= Number(frame.durationMs || 100); return cursor < 0; })?.assetId || visualAssetId; } const x = Number(transform?.x || 0); const y = Number(transform?.y || 0); const width = Number(sprite?.width || 32); const height = Number(sprite?.height || 32); const image = visualAssetId ? imageAssets.get(visualAssetId) : null; if (image) context.drawImage(image, x, y, width, height); else { context.fillStyle = sprite?.tint || "#38bdf8"; context.fillRect(x, y, width, height); if (visualAssetId) void loadImage(visualAssetId).then(drawRuntime); } });
    }
    function conditionsPass(rule) { return (rule.conditions || []).every(condition => { const current = runtime.variables[condition.variableId]; const value = condition.value; if (condition.operator === "EQUALS") return current === value; if (condition.operator === "NOT_EQUALS") return current !== value; if (condition.operator === "GREATER_THAN") return Number(current) > Number(value); if (condition.operator === "LESS_THAN") return Number(current) < Number(value); if (condition.operator === "CONTAINS") return String(current).includes(String(value)); return true; }); }
    const velocities = new Map(); const collisionPairs = new Set(); let lastFrame = performance.now();
    function playSceneSources() { sceneSources.forEach(source => { try { source.stop(); } catch (_) {} }); sceneSources.clear(); sceneLoopStoppers.forEach(stop => stop()); sceneLoopStoppers.clear(); (game.entities || []).filter(entity => entity.sceneId === runtime.sceneId && runtime.visible[entity.id]).forEach(entity => { const source = (entity.components || []).find(component => component.type === "AUDIO_SOURCE" && component.playOnStart); if (source?.type === "AUDIO_SOURCE") void playAsset(source.assetId, { volume: source.volume, loop: source.loop, sceneSource: true }); }); }
    function simulateFrame(now) { const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now; const active = (game.entities || []).filter(entity => entity.sceneId === runtime.sceneId && runtime.visible[entity.id]); active.forEach(entity => { const body = (entity.components || []).find(component => component.type === "RIGID_BODY"); const transform = (entity.components || []).find(component => component.type === "TRANSFORM"); if (!body || !transform) return; const velocity = velocities.get(entity.id) || { x: Number(body.velocityX || 0), y: Number(body.velocityY || 0) }; velocity.y += Number(body.gravityScale || 0) * 600 * delta; transform.x += velocity.x * delta; transform.y += velocity.y * delta; if (transform.y > canvas.height - 32) { transform.y = canvas.height - 32; velocity.y = -Math.abs(velocity.y) * Math.max(0, Number(body.restitution || 0)); } velocities.set(entity.id, velocity); }); active.forEach(left => { const lt = (left.components || []).find(component => component.type === "TRANSFORM"); const ls = (left.components || []).find(component => component.type === "SPRITE"); const lb = (left.components || []).find(component => component.type === "RIGID_BODY"); if (!lt) return; active.forEach(right => { if (left.id >= right.id) return; const rt = (right.components || []).find(component => component.type === "TRANSFORM"); const rs = (right.components || []).find(component => component.type === "SPRITE"); const rb = (right.components || []).find(component => component.type === "RIGID_BODY"); const lcollider = (left.components || []).find(component => component.type === "COLLIDER"); const rcollider = (right.components || []).find(component => component.type === "COLLIDER"); if (!rt) return; const lw = Number(ls?.width || 32); const lh = Number(ls?.height || 32); const rw = Number(rs?.width || 32); const rh = Number(rs?.height || 32); const overlapX = Math.min(Number(lt.x || 0) + lw, Number(rt.x || 0) + rw) - Math.max(Number(lt.x || 0), Number(rt.x || 0)); const overlapY = Math.min(Number(lt.y || 0) + lh, Number(rt.y || 0) + rh) - Math.max(Number(lt.y || 0), Number(rt.y || 0)); const hit = overlapX > 0 && overlapY > 0; const key = left.id + ":" + right.id; if (hit) { if (!lcollider?.isTrigger && !rcollider?.isTrigger && overlapX < overlapY) { const direction = Number(lt.x || 0) < Number(rt.x || 0) ? -1 : 1; if (lb && !rb) lt.x += direction * overlapX; else if (rb && !lb) rt.x -= direction * overlapX; } else { const direction = Number(lt.y || 0) < Number(rt.y || 0) ? -1 : 1; if (lb && !rb) lt.y += direction * overlapY; else if (rb && !lb) rt.y -= direction * overlapY; const lv = velocities.get(left.id); const rv = velocities.get(right.id); if (lv && lb) lv.y = -Math.abs(lv.y) * Math.max(0, Number(lb.restitution || 0)); if (rv && rb) rv.y = -Math.abs(rv.y) * Math.max(0, Number(rb.restitution || 0)); } if (!collisionPairs.has(key)) { collisionPairs.add(key); runTrigger("ON_COLLISION", { entityId: left.id, targetEntityId: right.id }); } } else collisionPairs.delete(key); }); }); drawRuntime(); if (!runtime.ended) requestAnimationFrame(simulateFrame); }
    async function runActions(actions) { for (const action of actions || []) { if (action.type === "PLAY_AUDIO" && action.audioEventId) await playEvent(action.audioEventId); else if (action.type === "PLAY_AUDIO" && action.assetId) await playAsset(action.assetId); else if (action.type === "SET_VARIABLE") runtime.variables[action.variableId] = action.value; else if (action.type === "ADD_VARIABLE") runtime.variables[action.variableId] = Number(runtime.variables[action.variableId] || 0) + Number(action.value || 0); else if (action.type === "SHOW_ENTITY") runtime.visible[action.entityId] = true; else if (action.type === "HIDE_ENTITY") runtime.visible[action.entityId] = false; else if (action.type === "MOVE_ENTITY" || action.type === "SET_POSITION") { const entity = (game.entities || []).find(item => item.id === action.entityId); const transform = entity?.components?.find(component => component.type === "TRANSFORM"); if (transform) { if (action.type === "MOVE_ENTITY") { transform.x += Number(action.deltaX || 0); transform.y += Number(action.deltaY || 0); } else { transform.x = Number(action.x || 0); transform.y = Number(action.y || 0); } } } else if (action.type === "CHANGE_SCENE") { runtime.sceneId = action.targetSceneId; runTrigger("ON_SCENE_ENTER", { sceneId: runtime.sceneId }); playSceneSources(); } else if (action.type === "CREATE_ENTITY" && action.entity) { game.entities = [...(game.entities || []), action.entity]; runtime.visible[action.entity.id] = true; runTrigger("ON_ENTITY_CREATED", { entityId: action.entity.id }); } else if (action.type === "DESTROY_ENTITY") { game.entities = (game.entities || []).filter(entity => entity.id !== action.entityId); delete runtime.visible[action.entityId]; runTrigger("ON_ENTITY_DESTROYED", { entityId: action.entityId }); } else if (action.type === "SHOW_TEXT") { context.fillStyle = "#f8fafc"; context.font = "18px sans-serif"; context.fillText(String(action.text || ""), 24, canvas.height - 32); } else if (action.type === "END_GAME") runtime.ended = true; drawRuntime(); } }
    function runTrigger(triggerType, event = {}) {
      (game.rules || []).filter(rule => rule.enabled && rule.trigger?.type === triggerType && (!rule.trigger.key || rule.trigger.key === event.key) && (!rule.trigger.actionName || rule.trigger.actionName === event.actionName) && conditionsPass(rule)).sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0)).forEach(rule => { void runActions(rule.actions); });
    }
    canvas.addEventListener("click", () => runTrigger("ON_CLICK"));
    window.addEventListener("keydown", event => { if (event.repeat) return; runTrigger("ON_KEY", { key: event.code }); Object.entries(game.inputActions?.actions || {}).forEach(([actionName, keys]) => { if (Array.isArray(keys) && keys.includes(event.code)) runTrigger("ON_ACTION", { actionName }); }); });
    (game.rules || []).filter(rule => rule.enabled && rule.trigger?.type === "ON_TIMER" && Number(rule.trigger.timerMs) > 0).forEach(rule => setInterval(() => runActions(rule.actions), Number(rule.trigger.timerMs)));
    document.body.addEventListener("pointerdown", () => { if (audioContext.state === "suspended") audioContext.resume(); }, { once: true });
    drawRuntime(); runTrigger("ON_START"); playSceneSources(); requestAnimationFrame(simulateFrame);
    context.fillStyle = "#e2e8f0"; context.font = "16px sans-serif";
    context.fillText("VARYNTH Web Runtime", 24, 32);
    context.font = "12px monospace";
    context.fillText("Build ${buildId}", 24, 54);
    context.fillText("${state.scenes.length} cenas · ${state.entities.length} entidades · ${assetFiles.length} assets", 24, 76);
  </script>
</body>
</html>`;
      zip.file("index.html", htmlContent);
      const packageBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      jobManager.updateProgress(job.id, 90);

      // Save build as Derived Asset
      const savedAsset = await assetManager.createAsset(
        {
          name: `game-build-${state.artifactId}.zip`,
          type: "WEBSITE_BUNDLE",
          mimeType: "application/zip",
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
