import {
  GameRule,
  GameTrigger,
  GameCondition,
  GameAction,
  GameVariable,
  GameEntity,
  TriggerType,
  ConditionOperator,
  ActionType,
  GameRuntimeCapabilities,
} from "./types";

export interface RuleExecutionContext {
  executionId: string;
  tickId: number;
  simulationClockMs: number;
  eventDepth: number;
  stepCount: number;
  maxSteps: number;
  maxDepth: number;
  executedRuleIds: string[];
}

export interface QueuedGameEvent {
  id: string;
  trigger: GameTrigger;
  context: {
    originEntityId?: string;
    targetEntityId?: string;
    variableId?: string;
    newValue?: boolean | number | string;
    actionName?: string;
  };
  priority: number;
  createdAtClockMs: number;
}

export interface RuleEngineRuntimeState {
  activeSceneId: string;
  variables: Record<string, boolean | number | string>;
  entities: Record<string, GameEntity>;
  logs: string[];
  errors: string[];
  simulationTick: number;
  simulationClockMs: number;
  isGameOver: boolean;
  score: number;
}

export class Mulberry32PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }
}

export class GameRulesEngine {
  public static readonly DEFAULT_MAX_STEPS = 50;
  public static readonly DEFAULT_MAX_DEPTH = 8;
  public static readonly FIXED_TIMESTEP_MS = 16.666;

  private prng: Mulberry32PRNG;
  private eventQueue: QueuedGameEvent[] = [];
  private eventCounter = 0;

  constructor(seed = 123456) {
    this.prng = new Mulberry32PRNG(seed);
  }

  public setSeed(seed: number) {
    this.prng = new Mulberry32PRNG(seed);
  }

  public getRandomFloat(): number {
    return this.prng.nextFloat();
  }

  public getRandomInt(min: number, max: number): number {
    return this.prng.nextInt(min, max);
  }

  public queueEvent(
    trigger: GameTrigger,
    context: QueuedGameEvent["context"] = {},
    priority = 0,
    clockMs = 0
  ) {
    this.eventCounter++;
    const event: QueuedGameEvent = {
      id: `evt-${this.eventCounter}`,
      trigger,
      context,
      priority,
      createdAtClockMs: clockMs,
    };
    this.eventQueue.push(event);
    // Sort stably: highest priority first, then insertion order
    this.eventQueue.sort((a, b) => b.priority - a.priority);
  }

  public clearQueue() {
    this.eventQueue = [];
    this.eventCounter = 0;
  }

  public getPendingQueueLength(): number {
    return this.eventQueue.length;
  }

  /**
   * Evaluates conditions against variables and entity states
   */
  public evaluateConditions(
    conditions: GameCondition[],
    variables: Record<string, boolean | number | string>,
    entities: Record<string, GameEntity> = {}
  ): boolean {
    for (const cond of conditions) {
      if (cond.type === "ENTITY_EXISTS") {
        if (Boolean(entities[cond.entityId || ""]) !== Boolean(cond.value)) return false;
        continue;
      }
      if (cond.type === "HAS_TAG") {
        if (Boolean(entities[cond.entityId || ""]?.tags.includes(cond.tag || "")) !== Boolean(cond.value)) return false;
        continue;
      }
      if (cond.type === "BOOLEAN_CHECK") {
        if (variables[cond.variableId] !== cond.value) return false;
        continue;
      }
      const varVal = variables[cond.variableId];
      if (varVal === undefined) return false;

      switch (cond.operator) {
        case "EQUALS":
          if (varVal !== cond.value) return false;
          break;
        case "NOT_EQUALS":
          if (varVal === cond.value) return false;
          break;
        case "GREATER_THAN":
          if (typeof varVal === "number" && typeof cond.value === "number") {
            if (varVal <= cond.value) return false;
          } else {
            return false;
          }
          break;
        case "LESS_THAN":
          if (typeof varVal === "number" && typeof cond.value === "number") {
            if (varVal >= cond.value) return false;
          } else {
            return false;
          }
          break;
        case "CONTAINS":
          if (typeof varVal === "string" && typeof cond.value === "string") {
            if (!varVal.includes(cond.value)) return false;
          } else {
            return false;
          }
          break;
      }
    }
    return true;
  }

  /**
   * Executes a single tick processing queued events with strict recursion and budget guard
   */
  public processEvents(
    rules: GameRule[],
    state: RuleEngineRuntimeState,
    maxSteps = GameRulesEngine.DEFAULT_MAX_STEPS,
    maxDepth = GameRulesEngine.DEFAULT_MAX_DEPTH
  ): { executedRules: string[]; budgetExceeded: boolean } {
    const executedRules: string[] = [];
    const context: RuleExecutionContext = {
      executionId: `exec-${Date.now()}`,
      tickId: state.simulationTick,
      simulationClockMs: state.simulationClockMs,
      eventDepth: 0,
      stepCount: 0,
      maxSteps,
      maxDepth,
      executedRuleIds: [],
    };

    while (this.eventQueue.length > 0) {
      if (context.stepCount >= context.maxSteps) {
        state.errors.push(
          `[RULE_EXECUTION_BUDGET_EXCEEDED] Limite máximo de ${context.maxSteps} passos atingido no tick ${state.simulationTick}. Loop lógico interrompido com segurança.`
        );
        this.clearQueue();
        return { executedRules, budgetExceeded: true };
      }

      const currentEvent = this.eventQueue.shift()!;
      context.stepCount++;

      // Find matching rules for this trigger
      const matchingRules = rules.filter((r) => r.enabled && this.isTriggerMatching(r.trigger, currentEvent.trigger));

      for (const rule of matchingRules) {
        if (context.stepCount >= context.maxSteps) {
          state.errors.push(
            `[RULE_EXECUTION_BUDGET_EXCEEDED] Limite máximo de ${context.maxSteps} passos atingido durante execução da regra ${rule.name}.`
          );
          this.clearQueue();
          return { executedRules, budgetExceeded: true };
        }

        const conditionsPass = this.evaluateConditions(rule.conditions, state.variables, state.entities);
        if (conditionsPass) {
          executedRules.push(rule.id);
          context.executedRuleIds.push(rule.id);
          state.logs.push(`[RULE_EXECUTED] Regra "${rule.name}" disparada.`);

          // Apply actions sequentially
          for (const action of rule.actions) {
            this.applyAction(action, state, context);
          }
        }
      }
    }

    return { executedRules, budgetExceeded: false };
  }

  private isTriggerMatching(ruleTrigger: GameTrigger, eventTrigger: GameTrigger): boolean {
    if (ruleTrigger.type !== eventTrigger.type) return false;

    if (ruleTrigger.type === "ON_CLICK" || ruleTrigger.type === "ON_COLLISION") {
      if (ruleTrigger.entityId && ruleTrigger.entityId !== eventTrigger.entityId) return false;
      if (ruleTrigger.targetEntityId && ruleTrigger.targetEntityId !== eventTrigger.targetEntityId) return false;
    }

    if (ruleTrigger.type === "ON_ACTION") {
      if (ruleTrigger.actionName && ruleTrigger.actionName !== eventTrigger.actionName) return false;
    }

    if (ruleTrigger.type === "ON_KEY") {
      if (ruleTrigger.key && ruleTrigger.key !== eventTrigger.key) return false;
    }

    if (ruleTrigger.type === "ON_VARIABLE_CHANGED") {
      if (ruleTrigger.variableId && ruleTrigger.variableId !== eventTrigger.variableId) return false;
    }

    return true;
  }

  private applyAction(action: GameAction, state: RuleEngineRuntimeState, context: RuleExecutionContext) {
    switch (action.type) {
      case "SET_VARIABLE": {
        if (action.variableId && action.value !== undefined) {
          const oldVal = state.variables[action.variableId];
          state.variables[action.variableId] = action.value;
          state.logs.push(`[ACTION] Variável "${action.variableId}" definida para ${action.value}.`);
          if (oldVal !== action.value) {
            // Queue variable changed event for deterministic evaluation
            this.queueEvent(
              { type: "ON_VARIABLE_CHANGED", variableId: action.variableId },
              { variableId: action.variableId, newValue: action.value },
              0,
              state.simulationClockMs
            );
          }
        }
        break;
      }
      case "ADD_VARIABLE": {
        if (action.variableId && typeof action.value === "number") {
          const current = (state.variables[action.variableId] as number) || 0;
          const next = current + action.value;
          state.variables[action.variableId] = next;
          state.logs.push(`[ACTION] Variável "${action.variableId}" somada em ${action.value} (novo: ${next}).`);
          this.queueEvent(
            { type: "ON_VARIABLE_CHANGED", variableId: action.variableId },
            { variableId: action.variableId, newValue: next },
            0,
            state.simulationClockMs
          );
        }
        break;
      }
      case "MOVE_ENTITY": {
        if (action.entityId && state.entities[action.entityId]) {
          const entity = state.entities[action.entityId];
          const tr = entity.components.find((c) => c.type === "TRANSFORM");
          if (tr && tr.type === "TRANSFORM") {
            tr.x += action.deltaX || 0;
            tr.y += action.deltaY || 0;
            state.logs.push(`[ACTION] Entidade "${entity.name}" movida para (${tr.x}, ${tr.y}).`);
          }
        }
        break;
      }
      case "SET_POSITION": {
        if (action.entityId && state.entities[action.entityId]) {
          const tr = state.entities[action.entityId].components.find((component) => component.type === "TRANSFORM");
          if (tr && tr.type === "TRANSFORM") { tr.x = action.x ?? tr.x; tr.y = action.y ?? tr.y; state.logs.push(`[ACTION] Posição de "${state.entities[action.entityId].name}" definida.`); }
        }
        break;
      }
      case "APPLY_FORCE": {
        if (action.entityId && state.entities[action.entityId]) {
          const body = state.entities[action.entityId].components.find((component) => component.type === "RIGID_BODY");
          if (body && body.type === "RIGID_BODY" && body.mode === "DYNAMIC") { body.velocityX += (action.forceX || 0) / Math.max(body.mass, 0.01); body.velocityY += (action.forceY || 0) / Math.max(body.mass, 0.01); state.logs.push(`[ACTION] Força aplicada em "${state.entities[action.entityId].name}".`); }
        }
        break;
      }
      case "SHOW_ENTITY": {
        if (action.entityId && state.entities[action.entityId]) {
          state.entities[action.entityId].active = true;
          state.logs.push(`[ACTION] Entidade "${state.entities[action.entityId].name}" ativada.`);
        }
        break;
      }
      case "HIDE_ENTITY": {
        if (action.entityId && state.entities[action.entityId]) {
          state.entities[action.entityId].active = false;
          state.logs.push(`[ACTION] Entidade "${state.entities[action.entityId].name}" desativada.`);
        }
        break;
      }
      case "CHANGE_SCENE": {
        if (action.targetSceneId) {
          state.activeSceneId = action.targetSceneId;
          state.logs.push(`[ACTION] Mudança de cena para "${action.targetSceneId}".`);
          this.queueEvent(
            { type: "ON_SCENE_ENTER" },
            {},
            1, // higher priority for scene transitions
            state.simulationClockMs
          );
        }
        break;
      }
      case "SHOW_TEXT": {
        if (action.text) {
          state.logs.push(`[ACTION_DIALOGUE] "${action.text}"`);
        }
        break;
      }
      case "END_GAME": {
        state.isGameOver = true;
        state.logs.push(`[ACTION] Jogo finalizado.`);
        break;
      }
      case "PLAY_AUDIO": {
        if (action.audioEventId) {
          state.logs.push(`[ACTION_AUDIO_EVENT] Reproduzindo evento de áudio "${action.audioEventId}".`);
        } else if (action.assetId) {
          state.logs.push(`[ACTION_AUDIO] Reproduzindo asset "${action.assetId}".`);
        }
        break;
      }
      case "EMIT_EVENT": {
        if (action.eventType) this.queueEvent({ type: action.eventType, entityId: action.entityId, targetEntityId: action.targetEntityId } as any, { originEntityId: action.entityId, targetEntityId: action.targetEntityId, actionName: action.actionName }, 2, state.simulationClockMs);
        state.logs.push(`[ACTION_EVENT] Evento emitido: ${action.eventType || " desconhecido"}.`);
        break;
      }
      case "CREATE_ENTITY": {
        if (action.entity?.id && !state.entities[action.entity.id]) { state.entities[action.entity.id] = JSON.parse(JSON.stringify(action.entity)); state.logs.push(`[ACTION] Entidade "${action.entity.name}" criada.`); this.queueEvent({ type: "ON_ENTITY_CREATED", entityId: action.entity.id } as any, { originEntityId: action.entity.id }, 1, state.simulationClockMs); }
        break;
      }
      case "DESTROY_ENTITY": {
        if (action.entityId && state.entities[action.entityId]) { delete state.entities[action.entityId]; state.logs.push(`[ACTION] Entidade destruída: "${action.entityId}".`); this.queueEvent({ type: "ON_ENTITY_DESTROYED", entityId: action.entityId } as any, { originEntityId: action.entityId }, 1, state.simulationClockMs); }
        break;
      }
      case "WAIT": state.logs.push(`[ACTION_WAIT] ${action.durationMs || 0}ms.`); break;
    }
  }

  public getCapabilities(): GameRuntimeCapabilities {
    return {
      supportedGameTypes: ["2D", "WEB_2D", "INTERACTIVE_STORY", "QUIZ", "SIMULATION"],
      supportedComponents: ["TRANSFORM", "SPRITE", "TEXT", "AUDIO_SOURCE", "COLLIDER", "INPUT", "STATE", "VARIABLES", "SCRIPT", "UI"],
      supportedTriggers: ["ON_START", "ON_CLICK", "ON_KEY", "ON_ACTION", "ON_COLLISION", "ON_VARIABLE_CHANGED", "ON_SCENE_ENTER", "ON_TIMER"],
      supportedConditions: ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "CONTAINS"],
      supportedActions: ["SET_VARIABLE", "ADD_VARIABLE", "MOVE_ENTITY", "SET_POSITION", "APPLY_FORCE", "SHOW_ENTITY", "HIDE_ENTITY", "PLAY_AUDIO", "CHANGE_SCENE", "SHOW_TEXT", "END_GAME", "EMIT_EVENT", "CREATE_ENTITY", "DESTROY_ENTITY", "WAIT"],
      webBuildAvailable: true,
      androidBuildAvailable: false,
      desktopBuildAvailable: false,
      maxEntitiesPerScene: 500,
      maxRulesPerScene: 100,
    };
  }

  public supportsAction(actionType: string): boolean {
    const caps = this.getCapabilities();
    return caps.supportedActions.includes(actionType as ActionType);
  }

  public supportsTrigger(triggerType: string): boolean {
    const caps = this.getCapabilities();
    return caps.supportedTriggers.includes(triggerType as TriggerType);
  }
}

export const gameRulesEngine = new GameRulesEngine();
