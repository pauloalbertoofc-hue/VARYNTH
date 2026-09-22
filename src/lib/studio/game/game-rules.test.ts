import {
  GameRulesEngine,
  Mulberry32PRNG,
  RuleEngineRuntimeState,
} from "./game-rules-engine";
import { GameRule, GameVariable, GameEntity } from "./types";

async function runGameRulesTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH OS — GAME RULES ENGINE TEST SUITE                     ");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: [${testId}] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: [${testId}] ${desc}`);
      failed++;
    }
  }

  // GRULE-001: Mulberry32 PRNG produces identical sequence with same seed
  const prng1 = new Mulberry32PRNG(42);
  const prng2 = new Mulberry32PRNG(42);
  const val1_1 = prng1.nextFloat();
  const val1_2 = prng1.nextFloat();
  const val2_1 = prng2.nextFloat();
  const val2_2 = prng2.nextFloat();
  assert(
    val1_1 === val2_1 && val1_2 === val2_2,
    "GRULE-001",
    "Mesmo seed produz exatamente a mesma sequência de números pseudo-aleatórios."
  );

  // GRULE-002: Different seed produces different sequence
  const prngDiff = new Mulberry32PRNG(999);
  const valDiff = prngDiff.nextFloat();
  assert(val1_1 !== valDiff, "GRULE-002", "Seeds distintos produzem sequências pseudo-aleatórias diferentes.");

  // GRULE-003: Condition Evaluation - EQUALS
  const engine = new GameRulesEngine(123);
  const vars: Record<string, boolean | number | string> = { score: 100, isAlive: true, name: "Player" };
  const condEquals = engine.evaluateConditions(
    [{ variableId: "score", operator: "EQUALS", value: 100 }],
    vars
  );
  assert(condEquals, "GRULE-003", "Condição EQUALS avalia verdadeiro quando valores coincidem.");

  // GRULE-004: Condition Evaluation - GREATER_THAN / LESS_THAN
  const condGreater = engine.evaluateConditions(
    [{ variableId: "score", operator: "GREATER_THAN", value: 50 }],
    vars
  );
  const condLess = engine.evaluateConditions(
    [{ variableId: "score", operator: "LESS_THAN", value: 200 }],
    vars
  );
  assert(condGreater && condLess, "GRULE-004", "Condições GREATER_THAN e LESS_THAN avaliam corretamente.");

  // GRULE-005: Condition Evaluation - CONTAINS (String)
  const condContains = engine.evaluateConditions(
    [{ variableId: "name", operator: "CONTAINS", value: "Play" }],
    vars
  );
  assert(condContains, "GRULE-005", "Condição CONTAINS avalia correspondência de substring.");

  // GRULE-006: Event Queue & Simple Action Execution
  const testState: RuleEngineRuntimeState = {
    activeSceneId: "scene-1",
    variables: { score: 0, coins: 0 },
    entities: {
      "ent-hero": {
        id: "ent-hero",
        sceneId: "scene-1",
        name: "Hero",
        active: true,
        tags: ["player"],
        components: [{ type: "TRANSFORM", x: 10, y: 10, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 1 }],
      },
    },
    logs: [],
    errors: [],
    simulationTick: 1,
    simulationClockMs: 16.666,
    isGameOver: false,
    score: 0,
  };

  const simpleRules: GameRule[] = [
    {
      id: "rule-add-score",
      name: "Incrementar Pontos",
      enabled: true,
      trigger: { type: "ON_ACTION", actionName: "INTERACT" },
      conditions: [],
      actions: [
        { type: "ADD_VARIABLE", variableId: "score", value: 15 },
        { type: "MOVE_ENTITY", entityId: "ent-hero", deltaX: 5, deltaY: 0 },
      ],
    },
  ];

  engine.queueEvent({ type: "ON_ACTION", actionName: "INTERACT" });
  const processRes = engine.processEvents(simpleRules, testState);
  assert(
    processRes.executedRules.includes("rule-add-score") && testState.variables.score === 15,
    "GRULE-006",
    "Gatilho ON_ACTION executa ADD_VARIABLE corretamente."
  );

  const heroTransform = testState.entities["ent-hero"].components[0];
  assert(
    heroTransform.type === "TRANSFORM" && heroTransform.x === 15,
    "GRULE-007",
    "Ação MOVE_ENTITY atualiza as coordenadas da entidade."
  );

  const audioEventRule: GameRule = { id: "rule-play-audio-event", name: "Tocar evento", enabled: true, trigger: { type: "ON_ACTION", actionName: "PLAY_FOOTSTEPS" }, conditions: [], actions: [{ type: "PLAY_AUDIO", audioEventId: "event-footstep" }] };
  engine.queueEvent({ type: "ON_ACTION", actionName: "PLAY_FOOTSTEPS" });
  engine.processEvents([audioEventRule], testState);
  assert(testState.logs.some((log) => log.includes("[ACTION_AUDIO_EVENT]") && log.includes("event-footstep")), "GRULE-011", "Ação PLAY_AUDIO registra evento Game Audio estruturado para o sandbox consumidor.");

  // GRULE-008: Rule Storm Recursion Budget Guard (RULE_EXECUTION_BUDGET_EXCEEDED)
  // Create circular ping-pong rules: Variable A changes -> set B; Variable B changes -> set A
  const stormRules: GameRule[] = [
    {
      id: "rule-ping",
      name: "Ping Rule",
      enabled: true,
      trigger: { type: "ON_VARIABLE_CHANGED", variableId: "ping" },
      conditions: [],
      actions: [{ type: "ADD_VARIABLE", variableId: "pong", value: 1 }],
    },
    {
      id: "rule-pong",
      name: "Pong Rule",
      enabled: true,
      trigger: { type: "ON_VARIABLE_CHANGED", variableId: "pong" },
      conditions: [],
      actions: [{ type: "ADD_VARIABLE", variableId: "ping", value: 1 }],
    },
  ];

  const stormState: RuleEngineRuntimeState = {
    activeSceneId: "scene-1",
    variables: { ping: 0, pong: 0 },
    entities: {},
    logs: [],
    errors: [],
    simulationTick: 2,
    simulationClockMs: 33.333,
    isGameOver: false,
    score: 0,
  };

  engine.queueEvent({ type: "ON_VARIABLE_CHANGED", variableId: "ping" });
  const stormRes = engine.processEvents(stormRules, stormState, 30); // limit to 30 steps
  assert(
    stormRes.budgetExceeded === true &&
      stormState.errors.some((e) => e.includes("RULE_EXECUTION_BUDGET_EXCEEDED")),
    "GRULE-008",
    "Tempestade de regras indiretas é interrompida pelo orçamento de passos sem congelar o runtime."
  );

  // GRULE-009: Capability Matrix
  assert(
    engine.supportsAction("SET_VARIABLE") && engine.supportsAction("CHANGE_SCENE"),
    "GRULE-009",
    "Matriz de capacidades reporta suporte a ações declarativas locais."
  );
  assert(
    !engine.supportsAction("QUANTUM_WARP_ACTION"),
    "GRULE-010",
    "Ação não suportada retorna false na matriz de capacidades."
  );

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runGameRulesTests().catch((err) => {
  console.error("Erro fatal na suíte de regras de jogo:", err);
  process.exit(1);
});
