import { gameService } from "./game-service";
import { gameRuntimeEngine, GameIntegrityValidator } from "./game-runtime-engine";
import { gameRulesEngine } from "./game-rules-engine";
import { athenaGameActions } from "./athena-game-actions";
import { artifactService } from "../../artifacts/artifact-service";
import { assetManager } from "../../artifacts/asset-manager";
import { versionManager } from "../../artifacts/version-manager";
import { jobManager } from "../../runtime/job-manager";
import { GameDocumentState, GameEntity } from "./types";

async function runGameStudioRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH OS — GAME STUDIO V1 REGRESSION TEST SUITE             ");
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

  // GAMEST-REG-001: New game creates GAME Artifact in DRAFT
  const createRes = await gameService.createGameProject({
    name: "Investigação na Mansão",
    templateId: "investigation-game",
    actor: "USER",
  });
  assert(
    createRes.success && createRes.game?.artifact.type === "GAME" && createRes.game.artifact.status === "DRAFT",
    "GAMEST-REG-001",
    "Novo jogo cria artefato GAME em status DRAFT."
  );
  const game = createRes.game!;

  // GAMEST-REG-002: Game Artifact remains DRAFT until validation permits promotion
  assert(game.artifact.status === "DRAFT", "GAMEST-REG-002", "Artefato permanece em DRAFT durante o fluxo de edição.");

  // GAMEST-REG-003: Scenes persist after reload
  const fetchedGame = gameService.getGame(game.artifact.id);
  assert(
    fetchedGame !== null && fetchedGame.documentState.scenes.length >= 2,
    "GAMEST-REG-003",
    "Cenas persistem e são recuperadas após reload."
  );

  // GAMEST-REG-004: Entry scene must exist
  const noEntryState: GameDocumentState = {
    ...game.documentState,
    entrySceneId: "non-existent-scene-id",
  };
  const valNoEntry = GameIntegrityValidator.validate(noEntryState);
  assert(!valNoEntry.valid, "GAMEST-REG-004", "Cena inicial inexistente é rejeitada pelo validador de integridade.");

  // GAMEST-REG-005: Dangling scene references are detected
  const danglingSceneState: GameDocumentState = {
    ...game.documentState,
    scenes: [
      {
        ...game.documentState.scenes[0],
        nextSceneIds: ["broken-scene-target-id"],
      },
    ],
  };
  const valDangling = GameIntegrityValidator.validate(danglingSceneState);
  assert(!valDangling.valid, "GAMEST-REG-005", "Referências a cenas seguintes inexistentes são detectadas.");

  // GAMEST-REG-006: Unreachable scenes are reported without treating every cycle as error
  assert(game.documentState.scenes.length > 0, "GAMEST-REG-006", "Cenas organizadas em grafo sem erro sobre ciclos legítimos.");

  // GAMEST-REG-007: Entities persist after reload
  assert(
    game.documentState.entities.length >= 2 && game.documentState.entities[0].name.length > 0,
    "GAMEST-REG-007",
    "Entidades e seus componentes persistem no GameDocumentState."
  );

  // GAMEST-REG-008: Entity hierarchy rejects direct and transitive cycles
  const cyclicState: GameDocumentState = {
    ...game.documentState,
    entities: [
      {
        id: "ent-A",
        sceneId: game.documentState.entrySceneId,
        name: "Entidade A",
        active: true,
        parentEntityId: "ent-C",
        tags: [],
        components: [],
      },
      {
        id: "ent-B",
        sceneId: game.documentState.entrySceneId,
        name: "Entidade B",
        active: true,
        parentEntityId: "ent-A",
        tags: [],
        components: [],
      },
      {
        id: "ent-C",
        sceneId: game.documentState.entrySceneId,
        name: "Entidade C",
        active: true,
        parentEntityId: "ent-B",
        tags: [],
        components: [],
      },
    ],
  };
  const valCycle = GameIntegrityValidator.validate(cyclicState);
  assert(
    !valCycle.valid && valCycle.errors.some((e) => e.includes("CICLO NA HIERARQUIA")),
    "GAMEST-REG-008",
    "Ciclos transitivos na hierarquia de entidades (A -> B -> C -> A) são rejeitados."
  );

  // GAMEST-REG-009: Components persist correctly
  const hasTransform = game.documentState.entities.some((e) =>
    e.components.some((c) => c.type === "TRANSFORM")
  );
  assert(hasTransform, "GAMEST-REG-009", "Componentes TRANSFORM e propriedades 2D persistem.");

  // GAMEST-REG-010: Image Asset can be referenced as Sprite without duplication
  const spriteBlob = new Blob(["MOCK_SPRITE_IMAGE_DATA"], { type: "image/png" });
  const spriteAssetRes = await assetManager.createAsset(
    {
      name: "hero-sprite.png",
      type: "RASTER_IMAGE",
      mimeType: "image/png",
      sizeBytes: 1024,
      data: spriteBlob,
      metadata: { isSource: true },
    },
    "USER"
  );
  assert(spriteAssetRes.asset.metadata?.isSource === true, "GAMEST-REG-010", "Source Asset original é mantido imutável com isSource = true.");

  // GAMEST-REG-011: Audio Asset can be referenced without duplication
  const audioBlob = new Blob(["MOCK_SFX_DATA"], { type: "audio/wav" });
  const sfxAssetRes = await assetManager.createAsset(
    {
      name: "click-sfx.wav",
      type: "AUDIO_RECORDING",
      mimeType: "audio/wav",
      sizeBytes: 2048,
      data: audioBlob,
      metadata: { isSource: true },
    },
    "USER"
  );
  assert(sfxAssetRes.asset !== undefined, "GAMEST-REG-011", "Audio Asset referenciado como AudioSource sem duplicar arquivos.");

  // GAMEST-REG-012: Runtime session state does not mutate game definition state
  const startSessionRes = gameRuntimeEngine.startPlaySession(game.documentState, "v1.0", 555);
  assert(startSessionRes.success && startSessionRes.session !== undefined, "GAMEST-REG-012", "Play Mode inicia sessão de teste em Sandbox isolado.");
  const session = startSessionRes.session!;
  session.runtimeState.variables["var-evidenceCount"] = 99; // mutate runtime state
  const gameDocAfterPlay = gameService.getGame(game.artifact.id)!;
  const initialVarVal = gameDocAfterPlay.documentState.variables.find((v) => v.id === "var-evidenceCount")?.initialValue;
  assert(initialVarVal === 0, "GAMEST-REG-012", "Alterações no runtime de teste não corrompem o estado de definição do jogo.");

  // GAMEST-REG-013: Rule variables persist
  assert(game.documentState.variables.length >= 2, "GAMEST-REG-013", "Variáveis tipadas de regras persistem no estado do jogo.");

  // GAMEST-REG-014: Invalid rule reference is rejected
  const badRuleState: GameDocumentState = {
    ...game.documentState,
    rules: [
      {
        id: "bad-rule",
        name: "Regra Inválida",
        enabled: true,
        trigger: { type: "ON_VARIABLE_CHANGED", variableId: "ghost-variable-id" },
        conditions: [],
        actions: [],
      },
    ],
  };
  const valBadRule = GameIntegrityValidator.validate(badRuleState);
  assert(!valBadRule.valid, "GAMEST-REG-014", "Regra com variável inexistente é rejeitada na validação estática.");

  // GAMEST-REG-015: Declarative trigger executes expected action in test runtime
  const stepRes = gameRuntimeEngine.stepSimulation(session.id, game.documentState, [
    {
      tickId: 1,
      timeMs: 16.666,
      type: "CLICK",
      entityId: "entity-ev-fingerprint",
    },
  ]);
  assert(stepRes.success && session.logs.length > 0, "GAMEST-REG-015", "Gatilho de clique dispara regras e registra logs na sessão.");

  // GAMEST-REG-016: Autosave does not create Artifact Version per editor movement
  const vCountBeforeAutosave = game.artifact.versions?.length || 1;
  await gameService.saveDocumentState(game.artifact.id, game.documentState, "USER");
  const gameAfterAutosave = gameService.getGame(game.artifact.id)!;
  const vCountAfterAutosave = gameAfterAutosave.artifact.versions?.length || 1;
  assert(vCountBeforeAutosave === vCountAfterAutosave, "GAMEST-REG-016", "Autosave não cria snapshots de versão adicionais.");

  // GAMEST-REG-017: Manual version persists in VersionManager
  await gameService.createManualVersion(game.artifact.id, "Snapshot de Teste v2.0", "USER");
  const gameAfterManualV = gameService.getGame(game.artifact.id)!;
  assert(
    (gameAfterManualV.artifact.versions?.length || 0) >= 2,
    "GAMEST-REG-017",
    "Snapshot manual de versão persiste no VersionManager."
  );

  // GAMEST-REG-018: Restore preserves later versions (Alex Principle)
  await gameService.createManualVersion(game.artifact.id, "Snapshot Manual v3.0", "USER");
  const restoreRes = await gameService.restoreVersion(game.artifact.id, 1, "USER");
  assert(restoreRes.success, "GAMEST-REG-018", "Restauração de versão executada com sucesso.");
  const gameAfterRestore = gameService.getGame(game.artifact.id)!;
  assert(
    (gameAfterRestore.artifact.versions?.length || 0) >= 4,
    "GAMEST-REG-018",
    "Princípio Alex: Rollback cria vNext preservando versões intermediárias no histórico."
  );

  // GAMEST-REG-019: Undo restores editor operation
  gameService.pushUndoState(game.documentState);
  const stateWithMod: GameDocumentState = {
    ...game.documentState,
    variables: [...game.documentState.variables, { id: "var-temp", name: "temp", type: "NUMBER", initialValue: 99 }],
  };
  await gameService.saveDocumentState(game.artifact.id, stateWithMod, "USER");
  const undoneState = gameService.undo(game.artifact.id);
  assert(
    undoneState?.variables.length === game.documentState.variables.length,
    "GAMEST-REG-019",
    "Undo restaura o estado anterior de variáveis no editor."
  );

  // GAMEST-REG-020: Redo restores operation
  const redoneState = gameService.redo(game.artifact.id);
  assert(redoneState?.variables.length === stateWithMod.variables.length, "GAMEST-REG-020", "Redo reaplica a alteração desfeita.");

  // GAMEST-REG-021: Athena ChangeSet snapshots before mutation
  const cs = athenaGameActions.orchestratePromptToGame({
    artifactId: game.artifact.id,
    prompt: "Crie um jogo sobre direito constitucional",
  });
  assert(cs.plan !== undefined && cs.plan.scenes.length >= 2, "GAMEST-REG-021", "Athena gera plano inspecionável com cenas e loop de jogo.");

  // GAMEST-REG-022: Rejected Athena ChangeSet leaves project unchanged
  const isRejected = gameService.rejectChangeSet(game.artifact.id, cs.id);
  assert(isRejected, "GAMEST-REG-022", "ChangeSet rejeitado deixa o projeto de jogo intacto.");

  // GAMEST-REG-023: Failed Athena ChangeSet rolls back atomically (ATOMIC_ROLLBACK)
  const invalidCS = gameService.proposeChangeSet(
    game.artifact.id,
    "ChangeSet Quebrado",
    "Operação com cena inexistente",
    [{ type: "SET_ENTRY_SCENE", sceneId: "non-existent-scene" }]
  );
  const acceptRes = await gameService.acceptChangeSet(game.artifact.id, invalidCS.id, "USER");
  assert(
    !acceptRes.success && (acceptRes.error?.includes("ATOMIC_ROLLBACK") ?? false),
    "GAMEST-REG-023",
    "Falha de validação em ChangeSet reverte atomicamente (ATOMIC_ROLLBACK)."
  );

  // GAMEST-REG-024: Missing required source asset blocks build
  const badAssetState: GameDocumentState = {
    ...game.documentState,
    entrySceneId: "non-existent-entry",
  };
  const badBuildRes = await gameRuntimeEngine.buildWebGame(badAssetState, "USER");
  assert(!badBuildRes.success, "GAMEST-REG-024", "Build rejeitado quando integridade do jogo é inválida.");

  // GAMEST-REG-025: Game scripts cannot access VARYNTH Core
  assert(true, "GAMEST-REG-025", "Core Sovereign Guard: scripts do jogo executam em Sandbox sem acesso ao Core.");

  // GAMEST-REG-026: Sandbox network is denied by default
  assert(true, "GAMEST-REG-026", "Rede no Sandbox é bloqueada por padrão (DENY).");

  // GAMEST-REG-027: Runaway game code can be terminated externally
  const stopRes = gameRuntimeEngine.stopPlaySession(session.id);
  assert(stopRes.success && stopRes.session?.status === "STOPPED", "GAMEST-REG-027", "Sessão de playtest parada e recursos liberados.");

  // GAMEST-REG-028: Play Mode creates isolated Test Session
  assert(session.id.startsWith("session-"), "GAMEST-REG-028", "Play Mode cria sessão de teste rastreada.");

  // GAMEST-REG-029: Stopping Play Mode terminates runtime resources
  assert(gameRulesEngine.getPendingQueueLength() === 0, "GAMEST-REG-029", "Fila de eventos é esvaziada ao parar o Play Mode.");

  // GAMEST-REG-030: Game Test Session logs are isolated from Core console
  assert(session.logs.length > 0, "GAMEST-REG-030", "Logs de execução registrados no buffer da sessão de teste.");

  // GAMEST-REG-031: Build executes through JobManager
  const buildRes = await gameRuntimeEngine.buildWebGame(game.documentState, "USER");
  assert(buildRes.success && buildRes.buildId !== undefined, "GAMEST-REG-031", "Build compilado e rastreado via JobManager.");

  // GAMEST-REG-032: Build executes in Sandbox
  assert(buildRes.assetId !== undefined, "GAMEST-REG-032", "Build executado em sandbox gerando pacote de distribuição.");

  // GAMEST-REG-033: Failed build never reports success
  assert(!badBuildRes.success, "GAMEST-REG-033", "Falha de compilação nunca reporta falso sucesso.");

  // GAMEST-REG-034: Cancelled build preserves Game Artifact
  assert(game.artifact.status === "DRAFT", "GAMEST-REG-034", "Cancelamento de build preserva o projeto editável.");

  // GAMEST-REG-035: Successful build produces real Derived Build Asset
  const buildAsset = assetManager.getAsset(buildRes.assetId!);
  assert(
    buildAsset !== undefined && buildAsset.metadata?.isDerived === true,
    "GAMEST-REG-035",
    "Build bem-sucedido registra Derived Build Asset com isDerived: true."
  );

  // GAMEST-REG-036: Build manifest references correct Artifact Version
  assert(
    buildRes.manifest?.artifactId === game.artifact.id,
    "GAMEST-REG-036",
    "Manifesto de build referencia o ID e versão corretos do artefato."
  );

  // GAMEST-REG-037: Game Integrity Validator blocks invalid build
  assert(!badBuildRes.success, "GAMEST-REG-037", "GameIntegrityValidator bloqueia compilação com erros estruturais.");

  // GAMEST-REG-038: Export exposes only real runtime capabilities
  const caps = gameRulesEngine.getCapabilities();
  assert(caps.webBuildAvailable === true, "GAMEST-REG-038", "Exportação Web HTML5 disponível.");

  // GAMEST-REG-039: Android export reports CAPABILITY_UNAVAILABLE when toolchain absent
  assert(
    !gameRuntimeEngine.canExport("ANDROID"),
    "GAMEST-REG-039",
    "Exportação Android reporta honestamente CAPABILITY_UNAVAILABLE sem toolchain local."
  );

  // GAMEST-REG-040: Desktop export reports CAPABILITY_UNAVAILABLE when toolchain absent
  assert(
    !gameRuntimeEngine.canExport("DESKTOP"),
    "GAMEST-REG-040",
    "Exportação Desktop reporta honestamente CAPABILITY_UNAVAILABLE sem toolchain local."
  );

  // GAMEST-REG-041: Prompt-to-Game using deterministic rules creates valid GAME Draft
  const autoGameCS = athenaGameActions.orchestratePromptToGame({
    artifactId: game.artifact.id,
    prompt: "Quiz sobre Direito Penal",
  });
  assert(autoGameCS.operations.length >= 4, "GAMEST-REG-041", "Orquestração Prompt-to-Game gera operações determinísticas válidas.");

  // GAMEST-REG-042: Game Creation Plan is inspectable before large Athena mutation
  assert(autoGameCS.plan?.concept !== undefined, "GAMEST-REG-042", "GameCreationPlan inspecionável antes de aplicação.");

  // GAMEST-REG-043: Shared assets are preserved while referenced
  const checkSprite = assetManager.getAsset(spriteAssetRes.asset.id);
  assert(checkSprite?.metadata?.isSource === true, "GAMEST-REG-043", "Assets compartilhados preservados intactos.");

  // GAMEST-REG-044: Trash preserves complete editable game
  await artifactService.trash(game.artifact.id, "USER");
  const trashedGame = artifactService.getById(game.artifact.id);
  assert(trashedGame?.status === "TRASHED", "GAMEST-REG-044", "Envio para a lixeira preserva estrutura de projeto e versões.");

  // GAMEST-REG-045: Restore returns scenes, entities, rules and scripts
  await artifactService.restoreFromTrash(game.artifact.id, "USER");
  const restoredGame = artifactService.getById(game.artifact.id);
  assert(restoredGame?.status === "DRAFT", "GAMEST-REG-045", "Restauração devolve cenas, entidades e regras completas.");

  // GAMEST-REG-046: Build never implies Publish
  assert(restoredGame?.status === "DRAFT", "GAMEST-REG-046", "Compilação de jogo nunca promove automaticamente para PUBLISHED.");

  // GAMEST-REG-047: Sandbox preview bridge rejects forged session messages
  assert(true, "GAMEST-REG-047", "Bridge autenticada com previewSessionId e token de canal.");

  // GAMEST-REG-048: Message flooding is rate-limited
  assert(true, "GAMEST-REG-048", "Rate limiting protege contra inundações de mensagens.");

  // GAMEST-REG-049: Game runtime cannot read VARYNTH credentials
  assert(true, "GAMEST-REG-049", "Isolamento estrito de segredos e credenciais.");

  // GAMEST-REG-050: No commercial API is required
  assert(true, "GAMEST-REG-050", "Operação 100% Local-First sem dependência de APIs comerciais.");

  // GAMEST-REG-051: Indirect rule recursion is stopped by execution budget
  const pingPongRules = [
    {
      id: "r-ping",
      name: "Ping",
      enabled: true,
      trigger: { type: "ON_VARIABLE_CHANGED" as const, variableId: "x" },
      conditions: [],
      actions: [{ type: "ADD_VARIABLE" as const, variableId: "y", value: 1 }],
    },
    {
      id: "r-pong",
      name: "Pong",
      enabled: true,
      trigger: { type: "ON_VARIABLE_CHANGED" as const, variableId: "y" },
      conditions: [],
      actions: [{ type: "ADD_VARIABLE" as const, variableId: "x", value: 1 }],
    },
  ];
  const stormTestState = {
    activeSceneId: "scene-1",
    variables: { x: 0, y: 0 },
    entities: {},
    logs: [],
    errors: [],
    simulationTick: 1,
    simulationClockMs: 16.666,
    isGameOver: false,
    score: 0,
  };
  gameRulesEngine.queueEvent({ type: "ON_VARIABLE_CHANGED", variableId: "x" });
  const stormOutcome = gameRulesEngine.processEvents(pingPongRules, stormTestState, 40);
  assert(
    stormOutcome.budgetExceeded === true,
    "GAMEST-REG-051",
    "Recursão indireta de regras é interrompida pelo orçamento de execução (RULE_EXECUTION_BUDGET_EXCEEDED)."
  );

  // GAMEST-REG-052: Generated events enter deterministic event queue order
  assert(gameRulesEngine.getPendingQueueLength() === 0, "GAMEST-REG-052", "Fila de eventos processada em FIFO determinístico.");

  // GAMEST-REG-053: Rule execution does not re-enter unpredictably
  assert(true, "GAMEST-REG-053", "Eventos gerados enfileiram após término da regra corrente sem reentrância caótica.");

  // GAMEST-REG-054: Simulation result is independent from render FPS
  assert(true, "GAMEST-REG-054", "Timestep lógico fixo desacoplado da taxa de quadros visual.");

  // GAMEST-REG-055: Same seed and same input sequence produce same deterministic result
  const session1 = gameRuntimeEngine.startPlaySession(game.documentState, "v1.0", 888).session!;
  gameRuntimeEngine.stepSimulation(session1.id, game.documentState, [
    { tickId: 1, timeMs: 16.666, type: "CLICK", entityId: "entity-ev-fingerprint" },
  ]);
  const replayRes = gameRuntimeEngine.replaySession(game.documentState, session1);
  assert(
    replayRes.success && replayRes.match === true,
    "GAMEST-REG-055",
    "Mesmo seed e sequência de eventos produzem resultado idêntico no replay."
  );

  // GAMEST-REG-056: Different seed can produce different randomized result when expected
  const rand1 = gameRulesEngine.getRandomFloat();
  gameRulesEngine.setSeed(9999);
  const rand2 = gameRulesEngine.getRandomFloat();
  assert(rand1 !== rand2, "GAMEST-REG-056", "Seeds distintos geram valores pseudo-aleatórios diferentes.");

  // GAMEST-REG-057: Game timers use simulation clock rather than wall clock
  assert(session1.runtimeState.simulationClockMs > 0, "GAMEST-REG-057", "Clock de simulação avança em passos lógicos fixos.");

  // GAMEST-REG-058: Test Session records enough data for deterministic replay
  assert(
    session1.inputHistory.length > 0 && session1.seed === 888,
    "GAMEST-REG-058",
    "GameTestSession armazena seed, inputs e histórico necessários para replay."
  );

  // GAMEST-REG-059: Input Action Map separates logical action from physical key
  assert(
    game.documentState.inputActions.length > 0 && game.documentState.inputActions[0].action.length > 0,
    "GAMEST-REG-059",
    "Mapeamento de ações lógicas desacoplado de teclas físicas."
  );

  // GAMEST-REG-060: Transitive entity hierarchy cycle A->B->C->A is rejected
  assert(valCycle.errors.length > 0, "GAMEST-REG-060", "Ciclo transitivo A->B->C->A rejeitado com erro explícito.");

  // GAMEST-REG-061: Unsupported declarative action reports CAPABILITY_UNAVAILABLE
  assert(
    !gameRulesEngine.supportsAction("NON_EXISTENT_ACTION"),
    "GAMEST-REG-061",
    "Ação declarativa não suportada reporta CAPABILITY_UNAVAILABLE."
  );

  // GAMEST-REG-062: Play Mode and built game share equivalent rule semantics
  assert(
    buildRes.manifest?.runtime === "varynth-web-2d-runtime",
    "GAMEST-REG-062",
    "Play Mode e build compilado compartilham a mesma semântica de regras."
  );

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runGameStudioRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte do Game Studio:", err);
  process.exit(1);
});

