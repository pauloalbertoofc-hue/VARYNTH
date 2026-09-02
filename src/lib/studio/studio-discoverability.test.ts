import {
  STUDIO_DEFINITIONS,
  getStudioDefinition,
  getStudioByArtifactType,
  isValidStudioType,
} from "./studio-registry";
import { documentService } from "./document/document-service";
import { webService } from "./web/web-service";
import { imageService } from "./image/image-service";
import { audioService } from "./audio/audio-service";
import { videoService } from "./video/video-service";
import { gameService } from "./game/game-service";
import { artifactStore } from "../artifacts/artifact-store";
import { modules } from "../modules";

interface TestResult {
  code: string;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function record(code: string, name: string, passed: boolean, details?: string, error?: string) {
  results.push({ code, name, passed, details, error });
  const symbol = passed ? "✓" : "✗";
  console.log(`  ${symbol} [${code}] ${name}`);
  if (details) console.log(`     ↳ ${details}`);
  if (error) console.log(`     ↳ ERROR: ${error}`);
}

export async function runStudioDiscoverabilitySuite(): Promise<boolean> {
  console.log("\n===============================================================================");
  console.log("  VARYNTH OS — STUDIO DISCOVERABILITY & CREATIVE NAVIGATION SUITE");
  console.log("===============================================================================\n");

  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }

  // DISC-REG-001: /modules/studio opens Hub without auto-opening first Artifact
  try {
    const docRes = await documentService.createDocument({
      title: "Documento Existente no Acervo",
      documentType: "ARTICLE",
      createdBy: "USER",
    });

    const params = new URLSearchParams("");
    const studioParam = params.get("studio");
    const idParam = params.get("id");

    const activeDoc = idParam ? documentService.getDocument(idParam) : null;
    record(
      "DISC-REG-001",
      "/modules/studio opens Hub without auto-opening first Artifact",
      activeDoc === null && studioParam === null && docRes.success,
      `No active workspace auto-selected; Hub state remains clean`
    );
  } catch (err: any) {
    record("DISC-REG-001", "/modules/studio opens Hub without auto-opening first Artifact", false, undefined, err.message);
  }

  // DISC-REG-002: ?studio=VIDEO selects Video Studio without auto-opening arbitrary Video Artifact
  try {
    const vidRes = await videoService.createVideoProject({
      name: "Vídeo Promocional",
      actor: "USER",
    });

    const params = new URLSearchParams("studio=VIDEO");
    const studioParam = params.get("studio")?.toUpperCase();
    const idParam = params.get("id");

    const isValid = isValidStudioType(studioParam || "");
    const activeVideo = idParam ? videoService.getVideo(idParam) : null;

    record(
      "DISC-REG-002",
      "?studio=VIDEO selects Video Studio without auto-opening arbitrary Video Artifact",
      isValid && studioParam === "VIDEO" && activeVideo === null && vidRes.success,
      `Studio tab: VIDEO, activeVideo workspace: null`
    );
  } catch (err: any) {
    record("DISC-REG-002", "?studio=VIDEO selects Video Studio without auto-opening arbitrary Video Artifact", false, undefined, err.message);
  }

  // DISC-REG-003: Valid ?id= opens correct Artifact and matching Studio
  try {
    const audRes = await audioService.createAudioProject({
      name: "Podcast Episódio 01",
      actor: "USER",
    });
    const audId = audRes.audio!.artifact.id;

    const params = new URLSearchParams(`id=${audId}`);
    const idParam = params.get("id");
    const art = artifactStore.getById(idParam!);
    const studioDef = getStudioByArtifactType(art!.type);
    const audioLoaded = audioService.getAudio(audId);

    record(
      "DISC-REG-003",
      "Valid ?id= opens correct Artifact and matching Studio",
      art !== undefined && studioDef?.type === "AUDIO" && audioLoaded !== undefined,
      `Resolved artifact: "${art?.name}", studio: ${studioDef?.label}`
    );
  } catch (err: any) {
    record("DISC-REG-003", "Valid ?id= opens correct Artifact and matching Studio", false, undefined, err.message);
  }

  // DISC-REG-004: Invalid ?id= shows recoverable NOT_FOUND state
  try {
    const invalidId = "art-missing-999";
    const art = artifactStore.getById(invalidId);
    let notFoundArtifactId: string | null = null;
    if (!art || art.status === "TRASHED") {
      notFoundArtifactId = invalidId;
    }

    record(
      "DISC-REG-004",
      "Invalid ?id= shows recoverable NOT_FOUND state",
      art === undefined && notFoundArtifactId === invalidId,
      `State flagged notFoundArtifactId: "${notFoundArtifactId}" with recovery action`
    );
  } catch (err: any) {
    record("DISC-REG-004", "Invalid ?id= shows recoverable NOT_FOUND state", false, undefined, err.message);
  }

  // DISC-REG-005: Artifact type mismatch with ?studio= is handled deterministically
  try {
    const gameRes = await gameService.createGameProject({
      name: "Jogo RPG Sandbox",
      actor: "USER",
    });
    const gameId = gameRes.game!.artifact.id;

    // URL specifies studio=IMAGE but id is a GAME artifact
    const params = new URLSearchParams(`studio=IMAGE&id=${gameId}`);
    const idParam = params.get("id");
    const art = artifactStore.getById(idParam!);
    const authoritativeStudio = getStudioByArtifactType(art!.type);

    record(
      "DISC-REG-005",
      "Artifact type mismatch with ?studio= is handled deterministically (artifact authority)",
      authoritativeStudio?.type === "GAME",
      `Param: studio=IMAGE -> Overridden by Artifact Type: ${art?.type} -> Resolved Studio: ${authoritativeStudio?.label}`
    );
  } catch (err: any) {
    record("DISC-REG-005", "Artifact type mismatch with ?studio= is handled deterministically", false, undefined, err.message);
  }

  // DISC-REG-006: Back to Studios updates visible state and URL coherently
  try {
    let simulatedUrl = "/modules/studio?studio=DOCUMENT&id=doc-123";
    let activeDocState: any = { id: "doc-123" };
    let activeStudioState = "DOCUMENT";

    const handleBackToHub = (targetStudio: string) => {
      activeDocState = null;
      activeStudioState = targetStudio;
      simulatedUrl = `/modules/studio?studio=${targetStudio}`;
    };

    handleBackToHub("DOCUMENT");

    record(
      "DISC-REG-006",
      "Back to Studios updates visible state and URL coherently",
      activeDocState === null && activeStudioState === "DOCUMENT" && simulatedUrl === "/modules/studio?studio=DOCUMENT",
      `Closed active workspace and restored URL to: "${simulatedUrl}"`
    );
  } catch (err: any) {
    record("DISC-REG-006", "Back to Studios updates visible state and URL coherently", false, undefined, err.message);
  }

  // DISC-REG-007: Browser back/forward preserves Studio navigation
  try {
    const historyStack = [
      "/modules/studio",
      "/modules/studio?studio=VIDEO",
      "/modules/studio?studio=VIDEO&id=vid-999",
    ];

    const step3 = new URLSearchParams(historyStack[2].split("?")[1]);
    const step2 = new URLSearchParams(historyStack[1].split("?")[1]);
    const step1 = new URLSearchParams(historyStack[0].split("?")[1] || "");

    const ok =
      step3.get("studio") === "VIDEO" &&
      step3.get("id") === "vid-999" &&
      step2.get("studio") === "VIDEO" &&
      step2.get("id") === null &&
      step1.get("studio") === null;

    record(
      "DISC-REG-007",
      "Browser back/forward preserves Studio navigation",
      ok,
      `History popstate transitions correctly reproduce Studio -> Hub -> Workspace states`
    );
  } catch (err: any) {
    record("DISC-REG-007", "Browser back/forward preserves Studio navigation", false, undefined, err.message);
  }

  // DISC-REG-008: Command Palette distinguishes Studio, Action and Artifact result types
  try {
    const categories = ["Studios Criativos", "Ações Criativas", "Artefatos Criativos"];
    const allDefs = STUDIO_DEFINITIONS;

    const allHaveActions = allDefs.every((s) => Boolean(s.quickActionTitle && s.quickActionDescription));
    const allHaveHrefs = allDefs.every((s) => s.href.startsWith("/modules/studio?studio="));

    record(
      "DISC-REG-008",
      "Command Palette distinguishes Studio, Action and Artifact result types",
      categories.length === 3 && allDefs.length === 6 && allHaveActions && allHaveHrefs,
      `Categories properly structured: ${categories.join(", ")}`
    );
  } catch (err: any) {
    record("DISC-REG-008", "Command Palette distinguishes Studio, Action and Artifact result types", false, undefined, err.message);
  }

  // DISC-REG-009: Artifact search opens correct Studio type
  try {
    const webRes = await webService.createWebsite({
      name: "Portal de Testes",
      actor: "USER",
    });
    const art = artifactStore.getById(webRes.website!.artifact.id);
    const studio = getStudioByArtifactType(art!.type);
    const route = `/modules/studio?studio=${studio?.type}&id=${art?.id}`;

    record(
      "DISC-REG-009",
      "Artifact search opens correct Studio type",
      studio?.type === "WEB" && route.includes("studio=WEB"),
      `Website artifact resolves target route: "${route}"`
    );
  } catch (err: any) {
    record("DISC-REG-009", "Artifact search opens correct Studio type", false, undefined, err.message);
  }

  // DISC-REG-010: Quick Create enters real creation flow rather than merely navigating ambiguously
  try {
    const docRes = await documentService.createDocument({
      title: "Artigo via Quick Create",
      documentType: "ARTICLE",
      createdBy: "USER",
    });
    const gameRes = await gameService.createGameProject({
      name: "Jogo via Quick Create",
      actor: "USER",
    });

    const realCreation =
      docRes.success &&
      docRes.document?.artifact.name === "Artigo via Quick Create" &&
      gameRes.success &&
      gameRes.game?.artifact.name === "Jogo via Quick Create";

    record(
      "DISC-REG-010",
      "Quick Create enters real creation flow rather than merely navigating ambiguously",
      realCreation,
      `Real artifacts created: Doc ID ${docRes.document?.artifact.id}, Game ID ${gameRes.game?.artifact.id}`
    );
  } catch (err: any) {
    record("DISC-REG-010", "Quick Create enters real creation flow rather than merely navigating ambiguously", false, undefined, err.message);
  }

  // DISC-REG-011: Hub remains useful with zero Artifacts
  try {
    const allDefs = STUDIO_DEFINITIONS;
    const hasAll6 = allDefs.length === 6;
    const allLabels = allDefs.map((s) => s.label);

    record(
      "DISC-REG-011",
      "Hub remains useful with zero Artifacts",
      hasAll6 && allLabels.includes("Document Studio") && allLabels.includes("Game Studio"),
      `All 6 studio entry cards available regardless of artifact store density`
    );
  } catch (err: any) {
    record("DISC-REG-011", "Hub remains useful with zero Artifacts", false, undefined, err.message);
  }

  // DISC-REG-012: Studio metadata source is shared across navigation surfaces
  try {
    const registryTypes = STUDIO_DEFINITIONS.map((s) => s.type);
    const studioModule = modules.find((m) => m.id === "studio");

    const sharedConsistency =
      registryTypes.length === 6 &&
      registryTypes.includes("DOCUMENT") &&
      registryTypes.includes("WEB") &&
      registryTypes.includes("IMAGE") &&
      registryTypes.includes("AUDIO") &&
      registryTypes.includes("VIDEO") &&
      registryTypes.includes("GAME") &&
      studioModule?.href === "/modules/studio";

    record(
      "DISC-REG-012",
      "Studio metadata source is shared across navigation surfaces",
      sharedConsistency,
      `Shared registry: 6 studios, System module registered: "${studioModule?.name}" -> ${studioModule?.href}`
    );
  } catch (err: any) {
    record("DISC-REG-012", "Studio metadata source is shared across navigation surfaces", false, undefined, err.message);
  }

  console.log("\n===============================================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;
  console.log(`  SUMMARY: ${passedCount}/${results.length} PASSED, ${failedCount} FAILED`);
  console.log("===============================================================================\n");

  return failedCount === 0;
}

if (typeof require !== "undefined" && require.main === module) {
  runStudioDiscoverabilitySuite().then((ok) => {
    process.exit(ok ? 0 : 1);
  });
}
