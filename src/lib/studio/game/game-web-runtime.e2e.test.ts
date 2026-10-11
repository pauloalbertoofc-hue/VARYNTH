import JSZip from "jszip";
import { chromium } from "@playwright/test";
import { assetManager } from "../../artifacts/asset-manager";
import { gameRuntimeEngine } from "./game-runtime-engine";
import { GAME_TEMPLATES } from "./game-templates";
import { GameDocumentState } from "./types";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function run() {
  const state: GameDocumentState = {
    artifactId: "web-runtime-e2e",
    entrySceneId: "scene-main",
    scenes: [{ id: "scene-main", name: "Runtime E2E", backgroundColor: "#0f172a", entityIds: ["player", "wide-collider", "health-hud", "heal-button", "decoy-button"], ruleIds: ["move-right", "decoy-only", "collider-geometry"] }],
    entities: [
      {
        id: "player", sceneId: "scene-main", name: "Player", active: true, tags: ["player"],
        components: [{ type: "TRANSFORM", x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 0 }, { type: "SPRITE", assetId: "", width: 32, height: 32 }, { type: "COLLIDER", shape: "RECTANGLE", width: 64, height: 32 }],
      },
      {
        id: "wide-collider", sceneId: "scene-main", name: "Alvo de geometria", active: true, tags: ["test"],
        components: [{ type: "TRANSFORM", x: 70, y: 20, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 0 }, { type: "COLLIDER", shape: "RECTANGLE", width: 32, height: 32 }],
      },
      {
        id: "health-hud", sceneId: "scene-main", name: "Vida", active: true, tags: ["ui"],
        components: [
          { type: "TRANSFORM", x: 20, y: 100, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 10 },
          { type: "UI", elementType: "PROGRESS_BAR", text: "Vida", variableId: "health", min: 0, max: 100 },
        ],
      },
      {
        id: "heal-button", sceneId: "scene-main", name: "Curar", active: true, tags: ["ui"],
        components: [
          { type: "TRANSFORM", x: 20, y: 150, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 11 },
          { type: "UI", elementType: "BUTTON", text: "Curar", onClickAction: { type: "ADD_VARIABLE", variableId: "health", value: 25 } },
        ],
      },
      {
        id: "decoy-button", sceneId: "scene-main", name: "Não clicar", active: true, tags: ["ui"],
        components: [
          { type: "TRANSFORM", x: 300, y: 150, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 11 },
          { type: "UI", elementType: "BUTTON", text: "Decoy" },
        ],
      },
    ],
    variables: [{ id: "health", name: "Vida", type: "NUMBER", initialValue: 50 }, { id: "collision-geometry", name: "Geometria de colisão", type: "NUMBER", initialValue: 0 }],
    rules: [{
      id: "move-right", name: "Mover para direita", enabled: true,
      trigger: { type: "ON_ACTION", actionName: "move_right" }, conditions: [],
      actions: [{ type: "MOVE_ENTITY", entityId: "player", deltaX: 25, deltaY: 0 }],
    }, {
      id: "decoy-only", name: "Somente botão decoy", enabled: true,
      trigger: { type: "ON_CLICK", entityId: "decoy-button" }, conditions: [],
      actions: [{ type: "SET_VARIABLE", variableId: "health", value: 0 }],
    }, {
      id: "collider-geometry", name: "Colisor é maior que Sprite", enabled: true,
      trigger: { type: "ON_COLLISION", entityId: "player", targetEntityId: "wide-collider" }, conditions: [],
      actions: [{ type: "SET_VARIABLE", variableId: "collision-geometry", value: 1 }],
    }],
    scripts: [],
    inputActions: [{ action: "move_right", keys: ["KeyD"] }],
    selectedEntityIds: [],
    updatedAt: new Date().toISOString(),
  };

  const build = await gameRuntimeEngine.buildWebGame(state, "USER");
  assert(build.success && build.assetId, `Falha ao criar pacote Web: ${build.error || "sem asset"}`);
  const raw = await assetManager.getAssetData(build.assetId);
  assert(raw, "Pacote Web não possui dados locais.");
  const bytes = raw instanceof Blob ? await raw.arrayBuffer() : raw instanceof ArrayBuffer ? raw : await (await fetch(raw)).arrayBuffer();
  const html = await (await JSZip.loadAsync(bytes)).file("index.html")!.async("text");

  const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(html, { waitUntil: "load" });
  await page.keyboard.press("KeyD");
  const canvas = page.locator("canvas");
  const bounds = await canvas.boundingBox();
  assert(bounds, "Runtime Web não criou o canvas de jogo.");
  await canvas.click({ position: { x: bounds.width * 110 / 800, y: bounds.height * 168 / 600 } });
  await page.waitForTimeout(80);
  const result = await page.evaluate(() => {
    const game = (window as unknown as { __VARYNTH_GAME_DATA__: GameDocumentState }).__VARYNTH_GAME_DATA__;
    const transform = game.entities.find((entity) => entity.id === "player")?.components.find((component) => component.type === "TRANSFORM");
    const canvas = document.querySelector("canvas");
    const pixels = canvas?.getContext("2d")?.getImageData(140, 120, 1, 1).data;
    return {
      position: transform?.type === "TRANSFORM" ? transform.x : undefined,
      progressPixelIsFilled: Boolean(pixels && pixels[1] > pixels[0]),
      collisionFlag: (window as unknown as { __VARYNTH_GAME_RUNTIME__?: { variables?: Record<string, unknown> } }).__VARYNTH_GAME_RUNTIME__?.variables?.["collision-geometry"],
    };
  });
  const adventureState = GAME_TEMPLATES.find((template) => template.id === "action-adventure-v1")!.createDocumentState("web-adventure-e2e");
  const adventureBuild = await gameRuntimeEngine.buildWebGame(adventureState, "USER");
  assert(adventureBuild.success && adventureBuild.assetId, `Falha ao exportar a Aventura V1 para Web: ${adventureBuild.error || "sem detalhe"}`);
  const adventureRaw = await assetManager.getAssetData(adventureBuild.assetId);
  assert(adventureRaw, "Aventura V1 exportada sem dados locais.");
  const adventureBytes = adventureRaw instanceof Blob ? await adventureRaw.arrayBuffer() : adventureRaw instanceof ArrayBuffer ? adventureRaw : await (await fetch(adventureRaw)).arrayBuffer();
  const adventureHtml = await (await JSZip.loadAsync(adventureBytes)).file("index.html")!.async("text");
  await page.goto("about:blank");
  await page.setContent(adventureHtml, { waitUntil: "load" });
  const adventureCanvas = page.locator("canvas");
  const adventureBounds = await adventureCanvas.boundingBox();
  assert(adventureBounds, "Aventura V1 não criou canvas no runtime exportado.");
  await adventureCanvas.click({ position: { x: adventureBounds.width * 400 / 800, y: adventureBounds.height * 280 / 600 } });
  await page.waitForTimeout(80);
  const activeAdventureScene = await page.evaluate(() => (window as unknown as { __VARYNTH_GAME_RUNTIME__?: { sceneId?: string } }).__VARYNTH_GAME_RUNTIME__?.sceneId);
  const cameraPixel = await page.evaluate(() => Array.from(document.querySelector("canvas")?.getContext("2d")?.getImageData(405, 305, 1, 1).data || []));
  for (let coin = 1; coin <= 10; coin++) {
    await page.evaluate((coinIndex) => {
      const game = (window as unknown as { __VARYNTH_GAME_DATA__: GameDocumentState }).__VARYNTH_GAME_DATA__;
      const player = game.entities.find((entity) => entity.id === "entity-player");
      const collectible = game.entities.find((entity) => entity.id === `entity-coin-${coinIndex}`);
      const playerTransform = player?.components.find((component) => component.type === "TRANSFORM");
      const coinTransform = collectible?.components.find((component) => component.type === "TRANSFORM");
      if (playerTransform?.type === "TRANSFORM" && coinTransform?.type === "TRANSFORM") { playerTransform.x = coinTransform.x; playerTransform.y = coinTransform.y; }
    }, coin);
    await page.waitForTimeout(35);
  }
  await page.evaluate(() => {
    const game = (window as unknown as { __VARYNTH_GAME_DATA__: GameDocumentState }).__VARYNTH_GAME_DATA__;
    const player = game.entities.find((entity) => entity.id === "entity-player");
    const door = game.entities.find((entity) => entity.id === "entity-door");
    const playerTransform = player?.components.find((component) => component.type === "TRANSFORM");
    const doorTransform = door?.components.find((component) => component.type === "TRANSFORM");
    if (playerTransform?.type === "TRANSFORM" && doorTransform?.type === "TRANSFORM") { playerTransform.x = doorTransform.x; playerTransform.y = doorTransform.y; }
  });
  await page.waitForTimeout(80);
  const adventureResult = await page.evaluate(() => {
    const runtime = (window as unknown as { __VARYNTH_GAME_RUNTIME__?: { sceneId?: string; variables?: Record<string, unknown> } }).__VARYNTH_GAME_RUNTIME__;
    return { sceneId: runtime?.sceneId, score: runtime?.variables?.["var-score"] };
  });
  await browser.close();

  assert(errors.length === 0, `Runtime Web gerou erro: ${errors.join("; ")}`);
  assert(result.position === 35, `Input Map não moveu Player no build Web (posição: ${result.position}).`);
  assert(result.progressPixelIsFilled, "Botão UI não atualizou o HUD de progresso vinculado à variável no build Web.");
  assert(result.collisionFlag === 1, `Runtime Web não usou a geometria do Collider (flag: ${result.collisionFlag}).`);
  assert(activeAdventureScene === "scene-game", `Menu da Aventura V1 não iniciou a fase no build Web (cena: ${activeAdventureScene}).`);
  assert(cameraPixel.length === 4 && cameraPixel[2] > cameraPixel[0], `Câmera exportada não centralizou o Player no canvas (pixel: ${cameraPixel.join(",")}).`);
  assert(adventureResult.score === 10 && adventureResult.sceneId === "scene-victory", `Aventura V1 exportada não concluiu coleta e porta (score: ${adventureResult.score}, cena: ${adventureResult.sceneId}).`);
  console.log("GAME-WEB-E2E PASS: ZIP exportado executa Input Map, botão UI, HUD vinculado e Aventura V1 completa no Chrome.");
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
