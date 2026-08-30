import {
  GameScene,
  GameEntity,
  GameComponent,
  GameVariable,
  GameRule,
  GameTrigger,
  GameCondition,
  GameAction,
  GameCreationPlan,
  GameChangeSet,
  GameOperation,
  GameType,
} from "./types";
import { gameService } from "./game-service";

export class AthenaGameActions {
  public createScene(name: string, description?: string): GameScene {
    return {
      id: `scene-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      description,
      backgroundColor: "#0f172a",
      entityIds: [],
      ruleIds: [],
    };
  }

  public createEntity(
    sceneId: string,
    name: string,
    components: GameComponent[],
    tags: string[] = []
  ): GameEntity {
    return {
      id: `ent-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sceneId,
      name,
      active: true,
      tags,
      components,
    };
  }

  public createVariable(
    name: string,
    type: "BOOLEAN" | "NUMBER" | "STRING",
    initialValue: boolean | number | string
  ): GameVariable {
    return {
      id: `var-${name.toLowerCase().replace(/\s+/g, "_")}`,
      name,
      type,
      initialValue,
    };
  }

  public createRule(
    name: string,
    trigger: GameTrigger,
    conditions: GameCondition[] = [],
    actions: GameAction[] = []
  ): GameRule {
    return {
      id: `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      enabled: true,
      trigger,
      conditions,
      actions,
    };
  }

  /**
   * Deterministic Prompt-to-Game Orchestration
   * Transforms natural language requests into an inspectable GameCreationPlan + GameChangeSet
   */
  public orchestratePromptToGame(params: {
    artifactId: string;
    prompt: string;
    gameType?: GameType;
    sceneCount?: number;
  }): GameChangeSet {
    const gameType = params.gameType || "2D";
    const promptLower = params.prompt.toLowerCase();
    const isQuiz = promptLower.includes("pergunta") || promptLower.includes("quiz");
    const isInvestigation = promptLower.includes("investiga") || promptLower.includes("crime") || promptLower.includes("evidência");

    const plan: GameCreationPlan = {
      title: isQuiz ? "Quiz Educativo Automático" : isInvestigation ? "Investigação Criminal" : "Aventura 2D Interativa",
      gameType: isQuiz ? "QUIZ" : isInvestigation ? "INTERACTIVE_STORY" : "2D",
      concept: `Jogo interativo gerado a partir do prompt: "${params.prompt}"`,
      gameplayLoop: isQuiz
        ? "Ler pergunta -> Escolher alternativa -> Validar resposta -> Acumular pontos -> Ver pontuação final."
        : isInvestigation
        ? "Explorar sala -> Coletar evidências -> Desbloquear tribunal -> Acusar suspeito culpado."
        : "Navegar na cena -> Interagir com objetos -> Disparar regras -> Concluir objetivo.",
      scenes: [
        { name: "Cena Inicial", description: "Ponto de partida da experiência", entities: ["Player", "Interface"] },
        { name: "Cena de Desfecho", description: "Conclusão e tela de vitória", entities: ["Resultado"] },
      ],
      entities: [
        { name: "Player / Interface", components: ["TRANSFORM", "TEXT", "UI"], sceneName: "Cena Inicial" },
        { name: "Tela Final", components: ["TRANSFORM", "TEXT"], sceneName: "Cena de Desfecho" },
      ],
      mechanics: [
        { name: "Controle de Pontuação", description: "Incrementa score com base nas decisões do jogador." },
        { name: "Transição Condicional", description: "Permite avançar para a próxima cena ao cumprir os requisitos." },
      ],
      variables: [
        { name: "score", type: "NUMBER", initialValue: 0 },
        { name: "gameCompleted", type: "BOOLEAN", initialValue: false },
      ],
      requiredAssets: [
        { name: "sprite-bg", type: "IMAGE" },
        { name: "sfx-victory", type: "AUDIO" },
      ],
      runtimeRequirements: ["Web 2D Canvas Runtime", "Local Deterministic Rule Engine"],
      capabilityWarnings: [],
    };

    const operations: GameOperation[] = [];

    const scene1 = this.createScene(plan.scenes[0].name, plan.scenes[0].description);
    const scene2 = this.createScene(plan.scenes[1].name, plan.scenes[1].description);
    scene1.nextSceneIds = [scene2.id];

    operations.push({ type: "CREATE_SCENE", scene: scene1 });
    operations.push({ type: "CREATE_SCENE", scene: scene2 });
    operations.push({ type: "SET_ENTRY_SCENE", sceneId: scene1.id });

    const varScore = this.createVariable("score", "NUMBER", 0);
    const varComplete = this.createVariable("gameCompleted", "BOOLEAN", false);
    operations.push({ type: "CREATE_VARIABLE", variable: varScore });
    operations.push({ type: "CREATE_VARIABLE", variable: varComplete });

    const ent1 = this.createEntity(
      scene1.id,
      "Elemento Interativo Principal",
      [
        { type: "TRANSFORM", x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 1 },
        { type: "UI", elementType: "BUTTON", text: "Clique para Interagir e Ganhar Pontos" },
      ],
      ["interactive", "button"]
    );
    operations.push({ type: "CREATE_ENTITY", entity: ent1 });

    const ruleClick = this.createRule(
      "Interagir e Pontuar",
      { type: "ON_CLICK", entityId: ent1.id },
      [],
      [
        { type: "ADD_VARIABLE", variableId: varScore.id, value: 10 },
        { type: "SHOW_TEXT", text: "Ação executada com sucesso! +10 Pontos." },
        { type: "CHANGE_SCENE", targetSceneId: scene2.id },
      ]
    );
    operations.push({ type: "CREATE_RULE", rule: ruleClick });

    return gameService.proposeChangeSet(
      params.artifactId,
      `Orquestração de Jogo: ${plan.title}`,
      `Athena compilou ${operations.length} operações a partir do prompt do usuário.`,
      operations,
      plan
    );
  }
}

export const athenaGameActions = new AthenaGameActions();
