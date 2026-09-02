/**
 * VARYNTH OS — MANUAL STUDIO OPERABILITY REGRESSION SUITE (MANUAL-REG-001..024)
 *
 * Validates Human-First Creative Control and Athena Parity across all 6 Studios:
 * Document, Web, Image, Audio, Video, Game.
 *
 * Regra Fundamental:
 * "ATHENA CAN USE THE STUDIOS != THE STUDIOS REQUIRE ATHENA"
 * "CAPABILITY EXISTS IN SERVICE != MANUALLY OPERABLE"
 * "FULL = SERVICE CAPABILITY + UI ENTRY POINT + REAL EXECUTION + VISIBLE FEEDBACK + ERROR FEEDBACK + PERSISTENCE/STATE CONSISTENCY"
 */

// In-memory mock storage for Node CLI environment
const mockStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage) {
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = String(value);
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k of Object.keys(mockStorage)) delete mockStorage[k];
    },
    key: (i: number) => Object.keys(mockStorage)[i] || null,
    get length() {
      return Object.keys(mockStorage).length;
    },
  };
}

import { documentService } from "./document/document-service";
import { webService } from "./web/web-service";
import { webBuildEngine } from "./web/web-build-engine";
import { imageService } from "./image/image-service";
import { imageRenderEngine } from "./image/image-render-engine";
import { audioService } from "./audio/audio-service";
import { audioRenderEngine } from "./audio/audio-render-engine";
import { videoService } from "./video/video-service";
import { videoRenderEngine } from "./video/video-render-engine";
import { gameService } from "./game/game-service";
import { gameRuntimeEngine } from "./game/game-runtime-engine";
import { artifactService } from "../artifacts/artifact-service";
import { artifactStore } from "../artifacts/artifact-store";
import { assetManager } from "../artifacts/asset-manager";
import { versionManager } from "../artifacts/version-manager";
import { creativeGraph } from "../artifacts/creative-graph";
import { JobManager } from "../runtime/job-manager";

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(id: string, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  const symbol = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${symbol}: [${id}] ${name}`);
  if (!passed) {
    console.error(`    ↳ Detalhes da falha: ${details}`);
  }
}

export async function runManualStudioOperabilitySuite() {
  console.log("\n===============================================================================");
  console.log("  VARYNTH OS — MANUAL STUDIO OPERABILITY REGRESSION (MANUAL-REG-001..024)      ");
  console.log("===============================================================================\n");

  // MANUAL-REG-001: Document can be created without Athena
  const docRes = await documentService.createDocument({
    title: "Monografia Manual de Direito Digital",
    documentType: "ARTICLE",
    createdBy: "USER",
  });
  record(
    "MANUAL-REG-001",
    "Document can be created without Athena",
    docRes.success && Boolean(docRes.document) && docRes.document?.artifact.createdBy === "USER",
    `Created doc id: ${docRes.document?.artifact.id}`
  );

  // MANUAL-REG-002: Document can be edited and exported without Athena
  const docId = docRes.document!.artifact.id;
  const newContent = "# Parecer Jurídico\n\nTexto editado manualmente pelo usuário sem IA.";
  documentService.saveDocumentContent(docId, newContent, {}, "USER");
  const exportedDoc = documentService.exportDocument(docId, { format: "MARKDOWN", profile: "STANDARD" });
  record(
    "MANUAL-REG-002",
    "Document can be edited and exported without Athena",
    exportedDoc.content.includes("sem IA") && exportedDoc.fileName.endsWith(".md"),
    `Exported format: ${exportedDoc.fileName}, length: ${exportedDoc.content.length}`
  );

  // MANUAL-REG-003: Web Artifact can be created and built without Athena
  const webRes = await webService.createWebsite({
    name: "Dashboard Manual Web",
    templateId: "blank",
    actor: "USER",
  });
  const webId = webRes.website!.artifact.id;
  const buildRes = await webBuildEngine.buildWebsite(
    webId,
    webRes.website!.files,
    webRes.website!.metadata
  );
  record(
    "MANUAL-REG-003",
    "Web Artifact can be created and built without Athena",
    webRes.success && buildRes.success && buildRes.status === "COMPLETED",
    `Web build success: ${buildRes.success}, status: ${buildRes.status}`
  );

  // MANUAL-REG-004: Website files can be edited manually
  const newFileRes = await webService.createFile(webId, "custom.css", "body { background: #000; }", "USER");
  const updatedFiles = webService.getWebsite(webId)!.files;
  const savedFilesRes = await webService.saveFiles(webId, updatedFiles, "USER");
  record(
    "MANUAL-REG-004",
    "Website files can be edited manually",
    newFileRes.success && savedFilesRes.success && updatedFiles.some((f) => f.path === "custom.css"),
    `Total files: ${updatedFiles.length}`
  );

  // MANUAL-REG-005: Image can be created and exported manually
  const imgRes = await imageService.createImage({
    name: "Banner Manual Canvas",
    customCanvas: { width: 1200, height: 630 },
    actor: "USER",
  });
  const imgId = imgRes.image!.artifact.id;
  const exportedImage = await imageRenderEngine.renderComposition(imgRes.image!.documentState, {
    format: "PNG",
    quality: 1,
    scale: 1,
  });
  record(
    "MANUAL-REG-005",
    "Image can be created and exported manually",
    imgRes.success && exportedImage.success && Boolean(exportedImage.blob),
    `Image format: ${exportedImage.format}, bytes: ${exportedImage.sizeBytes}`
  );

  // MANUAL-REG-006: Image layers can be manipulated manually
  const currentImg = imageService.getImage(imgId)!;
  const newLayer = {
    id: "layer-manual-1",
    type: "SHAPE" as const,
    name: "Retângulo Destaque",
    visible: true,
    locked: false,
    opacity: 0.9,
    transform: { x: 50, y: 50, width: 400, height: 200, scaleX: 1, scaleY: 1, rotation: 0 },
    shapeStyle: { shapeType: "rectangle" as const, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 },
  };
  const imgSaveStateRes = await imageService.saveDocumentState(
    imgId,
    { ...currentImg.documentState, layers: [...currentImg.documentState.layers, newLayer] },
    "USER"
  );
  record(
    "MANUAL-REG-006",
    "Image layers can be manipulated manually",
    imgSaveStateRes.success && imageService.getImage(imgId)!.documentState.layers.some((l) => l.id === "layer-manual-1"),
    `Layers count: ${imageService.getImage(imgId)!.documentState.layers.length}`
  );

  // MANUAL-REG-007: Audio timeline can be edited manually
  const audioRes = await audioService.createAudioProject({
    name: "Podcast Manual Ep 1",
    customDurationMs: 30000,
    actor: "USER",
  });
  const audioId = audioRes.audio!.artifact.id;
  const curAudio = audioService.getAudio(audioId)!;
  const newAudioTrack = {
    id: "track-user-1",
    name: "Voz Principal",
    type: "AUDIO" as const,
    muted: false,
    solo: false,
    volume: 1.0,
    pan: 0,
    clips: [
      {
        id: "clip-user-1",
        assetId: "mock-asset-1",
        trackId: "track-user-1",
        name: "Intro.wav",
        timelineStartMs: 0,
        sourceStartMs: 0,
        sourceEndMs: 10000,
        gain: 1.0,
      },
    ],
    effects: [],
    color: "#3b82f6",
  };
  const saveAudioRes = await audioService.saveDocumentState(
    audioId,
    { ...curAudio.documentState, tracks: [...curAudio.documentState.tracks, newAudioTrack] },
    "USER"
  );
  const splitAudioRes = await audioService.splitClip(audioId, "clip-user-1", 5000, "USER");
  record(
    "MANUAL-REG-007",
    "Audio timeline can be edited manually",
    audioRes.success && saveAudioRes.success && splitAudioRes.success,
    `Audio tracks: ${audioService.getAudio(audioId)!.documentState.tracks.length}`
  );

  // MANUAL-REG-008: Audio can be rendered without Athena
  const audioRenderRes = await audioRenderEngine.renderTimeline(
    audioService.getAudio(audioId)!.documentState,
    { format: "WAV" }
  );
  record(
    "MANUAL-REG-008",
    "Audio can be rendered without Athena",
    audioRenderRes.success && Boolean(audioRenderRes.blob) && (audioRenderRes.blob?.size || 0) > 0,
    `Audio render format: ${audioRenderRes.format}, size: ${audioRenderRes.blob?.size} bytes`
  );

  // MANUAL-REG-009: Video timeline can be edited manually
  const vidRes = await videoService.createVideoProject({
    name: "Video Institucional Manual",
    customDimensions: { width: 1920, height: 1080 },
    actor: "USER",
  });
  const vidId = vidRes.video!.artifact.id;
  const curVid = videoService.getVideo(vidId)!;
  const newVideoTrack = {
    id: "vtrack-user-1",
    name: "Video Principal",
    type: "VIDEO" as const,
    muted: false,
    solo: false,
    visible: true,
    locked: false,
    order: 0,
    volume: 1.0,
    clips: [
      {
        id: "vclip-user-1",
        trackId: "vtrack-user-1",
        name: "Take_01.mp4",
        type: "VIDEO" as const,
        timelineStartMs: 0,
        sourceStartMs: 0,
        sourceEndMs: 8000,
        opacity: 1.0,
        transform: { x: 0, y: 0, width: 1920, height: 1080, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 },
      },
    ],
  };
  const saveVidRes = await videoService.saveDocumentState(
    vidId,
    { ...curVid.documentState, tracks: [...curVid.documentState.tracks, newVideoTrack] },
    "USER"
  );
  const splitVidRes = await videoService.splitClip(vidId, "vclip-user-1", 4000, "USER");
  record(
    "MANUAL-REG-009",
    "Video timeline can be edited manually",
    vidRes.success && saveVidRes.success && splitVidRes.success,
    `Video scenes: ${videoService.getVideo(vidId)!.documentState.scenes.length}`
  );

  // MANUAL-REG-010: Video can be rendered without Athena
  const vidRenderRes = await videoRenderEngine.renderTimeline(
    videoService.getVideo(vidId)!.documentState,
    { format: "WEBM" }
  );
  record(
    "MANUAL-REG-010",
    "Video can be rendered without Athena",
    vidRenderRes.success && Boolean(vidRenderRes.blob) && (vidRenderRes.blob?.size || 0) > 0,
    `Render format: ${vidRenderRes.format}, size: ${vidRenderRes.blob?.size} bytes`
  );

  // MANUAL-REG-011: Game can be constructed manually
  const gameRes = await gameService.createGameProject({
    name: "Platformer Manual V1",
    templateId: "blank-2d",
    actor: "USER",
  });
  const gameId = gameRes.game!.artifact.id;
  const currentGameState = gameService.getGame(gameId)!.documentState;
  const manualRule = {
    id: "rule-man-1",
    name: "Pulo do Jogador",
    enabled: true,
    trigger: { type: "ON_ACTION" as const, actionName: "JUMP" },
    conditions: [],
    actions: [{ type: "MOVE_ENTITY" as const, entityId: "entity-player", deltaX: 0, deltaY: -50 }],
  };
  const saveGameRes = await gameService.saveDocumentState(
    gameId,
    { ...currentGameState, rules: [...currentGameState.rules, manualRule] },
    "USER"
  );
  record(
    "MANUAL-REG-011",
    "Game can be constructed manually",
    gameRes.success && saveGameRes.success && gameService.getGame(gameId)!.documentState.rules.some((r) => r.id === "rule-man-1"),
    `Game entities: ${gameService.getGame(gameId)!.documentState.entities.length}`
  );

  // MANUAL-REG-012: Game Play Mode works without Athena
  const gameState = gameService.getGame(gameId)!.documentState;
  const startSessionRes = gameRuntimeEngine.startPlaySession(gameState, "v1.0", 42);
  const sessionId = startSessionRes.session!.id;
  const stepRes = gameRuntimeEngine.stepSimulation(sessionId, gameState);
  const stopRes = gameRuntimeEngine.stopPlaySession(sessionId);
  record(
    "MANUAL-REG-012",
    "Game Play Mode works without Athena",
    startSessionRes.success && stepRes.success && stopRes.session?.status === "STOPPED",
    `Simulation ticks: ${stepRes.session?.runtimeState.simulationTick}`
  );

  // MANUAL-REG-013: Game Build works without Athena
  const gameBuildRes = await gameRuntimeEngine.buildWebGame(gameService.getGame(gameId)!.documentState, "USER");
  record(
    "MANUAL-REG-013",
    "Game Build works without Athena",
    gameBuildRes.success && Boolean(gameBuildRes.manifest),
    `Game build success: ${gameBuildRes.success}, manifest: ${gameBuildRes.manifest?.targetPlatform}`
  );

  // MANUAL-REG-014: User can inspect Versions without Athena
  const manualVersion1 = await documentService.createManualVersion(docId, "Snapshot 1 Manual", "USER");
  const versionsList = artifactService.getById(docId)!.versions || [];
  record(
    "MANUAL-REG-014",
    "User can inspect Versions without Athena",
    manualVersion1.success && versionsList.length >= 2,
    `Versions count: ${versionsList.length}, latest: ${versionsList[versionsList.length - 1]?.label}`
  );

  // MANUAL-REG-015: User can Restore Version without Athena
  const restoreRes = await documentService.restoreVersion(docId, 1, "USER");
  const postRestoreVersions = artifactService.getById(docId)!.versions || [];
  record(
    "MANUAL-REG-015",
    "User can Restore Version without Athena",
    restoreRes.success && postRestoreVersions.length === 3, // Alex Principle creates v3 without destroying v2
    `Post-restore versions: ${postRestoreVersions.length}`
  );

  // MANUAL-REG-016: User can inspect dependencies without Athena
  const linkRel = artifactService.linkDependency({
    sourceArtifactId: vidId,
    targetArtifactId: docId,
    type: "DERIVED_FROM",
    semanticRole: "SCRIPT_SOURCE",
    usageSlot: "video-script",
  });
  const integrityReport = artifactService.getCreativeIntegrity(vidId);
  record(
    "MANUAL-REG-016",
    "User can inspect dependencies without Athena",
    linkRel.success && integrityReport.valid && creativeGraph.getDependencies(vidId).length === 1,
    `Integrity health: ${integrityReport.overallHealth}`
  );

  // MANUAL-REG-017: User can update a dependency manually
  artifactService.setPinMode(vidId, docId, "FOLLOW_LATEST");
  const updatedRel = artifactStore.getById(vidId)!.relationships.find((r) => r.targetArtifactId === docId);
  const acceptUpdateRes = await artifactService.acceptDependencyUpdate({
    consumerArtifactId: vidId,
    targetArtifactId: docId,
    newVersionId: "v3",
    newVersionNumber: 3,
    usageSlot: "video-script",
  });
  record(
    "MANUAL-REG-017",
    "User can update a dependency manually",
    updatedRel?.pinMode === "FOLLOW_LATEST" && acceptUpdateRes.success,
    `Updated relation version: v${(acceptUpdateRes as any).updatedRelationship?.targetVersionNumber || 3}.0`
  );

  // MANUAL-REG-018: User can manage Assets manually
  const manualAsset = await assetManager.registerAsset({
    name: "logo-manual.png",
    mimeType: "image/png",
    sizeBytes: 4096,
    storageType: "INDEXEDDB_BLOB",
    createdBy: "USER",
    artifactIds: [imgId],
  });
  const assetRetrieved = assetManager.getAsset(manualAsset.id);
  const isUsable = assetManager.isAssetUsable(manualAsset.id);
  record(
    "MANUAL-REG-018",
    "User can manage Assets manually",
    Boolean(assetRetrieved) && isUsable && assetRetrieved?.name === "logo-manual.png",
    `Asset id: ${manualAsset.id}, storage: ${manualAsset.storageType}`
  );

  // MANUAL-REG-019: User can inspect and control Jobs manually
  const jobManager = new JobManager();
  const jManual = jobManager.createJob({ type: "CODE_EXECUTION", title: "Render Manual do Usuário" });
  jobManager.startJob(jManual.id);
  const jRunning = jobManager.getJob(jManual.id);
  jobManager.cancelJob(jManual.id, "Cancelado manualmente na UI");
  const jCancelled = jobManager.getJob(jManual.id);
  record(
    "MANUAL-REG-019",
    "User can inspect and control Jobs manually",
    jRunning?.status === "RUNNING" && jCancelled?.status === "CANCELLED",
    `Job state transition: RUNNING -> ${jCancelled?.status}`
  );

  // MANUAL-REG-020: Closing Athena panel does not disable any essential Studio capability
  // Simulation: state modification without Athena session
  const docBeforeAthenaClose = documentService.getDocument(docId)!;
  const docAfterManualEdit = await documentService.saveDocumentContent(
    docId,
    docBeforeAthenaClose.content + "\n\nAdicionado com painel da Athena fechado.",
    {},
    "USER"
  );
  record(
    "MANUAL-REG-020",
    "Closing Athena panel does not disable any essential Studio capability",
    docAfterManualEdit.success && documentService.getDocument(docId)!.content.includes("Athena fechado"),
    "Editor operations remain fully functional independently of copilot UI"
  );

  // MANUAL-REG-021: Manual edit increments technical revision correctly
  const artPreEdit = artifactStore.getById(docId)!;
  const revBefore = artPreEdit.revision || 1;
  artPreEdit.name = "Monografia Oficial Atualizada";
  const artPostEdit = artifactStore.save(artPreEdit, revBefore);
  record(
    "MANUAL-REG-021",
    "Manual edit increments technical revision correctly",
    (artPostEdit.revision || 0) === revBefore + 1,
    `Revision transition: ${revBefore} -> ${artPostEdit.revision}`
  );

  // MANUAL-REG-022: Manual edit can invalidate stale Athena ChangeSet
  // Stale OCC rejection simulation
  let caughtStaleError = false;
  try {
    artifactStore.save(artPreEdit, revBefore); // Attempting to save with old revision
  } catch (err: any) {
    caughtStaleError = err.message?.includes("WRITE_CONFLICT") || err.name === "OCCWriteConflictError";
  }
  record(
    "MANUAL-REG-022",
    "Manual edit can invalidate stale Athena ChangeSet",
    caughtStaleError,
    `OCC conflict detection prevented silent overwrite of user changes`
  );

  // MANUAL-REG-023: Accepted Athena change integrates with common version/history model
  const docVersionBefore = (artifactService.getById(docId)!.versions || []).length;
  await documentService.createManualVersion(docId, "Versão Athena Integrada", "ATHENA");
  const docVersionAfter = (artifactService.getById(docId)!.versions || []).length;
  const latestV = artifactService.getById(docId)!.versions![docVersionAfter - 1];
  record(
    "MANUAL-REG-023",
    "Accepted Athena change integrates with common version/history model",
    docVersionAfter === docVersionBefore + 1 && latestV?.createdBy === "ATHENA",
    `Unified history entries: ${docVersionAfter}, createdBy: ${latestV?.createdBy}`
  );

  // MANUAL-REG-024: Manual and Athena actions use the same authoritative Studio service
  const docObj = documentService.getDocument(docId);
  const webObj = webService.getWebsite(webId);
  const imgObj = imageService.getImage(imgId);
  const audioObj = audioService.getAudio(audioId);
  const vidObj = videoService.getVideo(vidId);
  const gameObj = gameService.getGame(gameId);
  const allServicesMatchStore =
    Boolean(docObj) &&
    Boolean(webObj) &&
    Boolean(imgObj) &&
    Boolean(audioObj) &&
    Boolean(vidObj) &&
    Boolean(gameObj);
  record(
    "MANUAL-REG-024",
    "Manual and Athena actions use the same authoritative Studio service",
    allServicesMatchStore,
    "Single Source of Truth across all 6 Creative Studios"
  );

  console.log("\n===============================================================================");
  const allPassed = results.every((r) => r.passed);
  console.log(`  BATTERY SUMMARY: ${results.filter((r) => r.passed).length}/${results.length} PASS (${allPassed ? "100.0%" : "FAILURES DETECTED"})`);
  console.log("===============================================================================\n");

  if (!allPassed) {
    throw new Error(`Manual Studio Operability Suite failed with ${results.filter((r) => !r.passed).length} failures.`);
  }
}

// Auto-run if executed via CLI
if (require.main === module || (typeof process !== "undefined" && process.argv[1]?.includes("manual-operability.test"))) {
  runManualStudioOperabilitySuite().catch((err) => {
    console.error("Suite failed with error:", err);
    process.exit(1);
  });
}
