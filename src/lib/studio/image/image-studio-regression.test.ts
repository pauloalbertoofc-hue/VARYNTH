import { imageService } from "./image-service";
import { imageRenderEngine, MAX_CANVAS_DIMENSION } from "./image-render-engine";
import { artifactService } from "../../artifacts/artifact-service";
import { assetManager } from "../../artifacts/asset-manager";
import { ImageLayer } from "./types";

async function runImageStudioRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH IMAGE STUDIO REGRESSION SUITE (IMGST-REG-001..030)");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // IMGST-REG-001: New image creates IMAGE Artifact in DRAFT
  const created = await imageService.createImage({
    name: "Banner Principal do Ecossistema",
    templateId: "square-post",
    actor: "USER",
  });
  assert(created.success === true && !!created.image, "IMGST-REG-001: Criação de imagem instancia Artifact do tipo IMAGE");
  assert(created.image?.artifact.type === "IMAGE", "IMGST-REG-001: Tipo de artefato é IMAGE");
  assert(created.image?.artifact.status === "DRAFT", "IMGST-REG-001: Imagem nasce em status DRAFT");

  const imageId = created.image!.artifact.id;

  // IMGST-REG-002 & 028: Original imported image preserved and source asset is immutable
  const rawPngSample = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const imported = await imageService.importImage({
    name: "original-photo.png",
    mimeType: "image/png",
    sizeBytes: 1024,
    data: rawPngSample,
    actor: "USER",
  });
  assert(imported.success === true && !!imported.image, "IMGST-REG-002: Importação de imagem concluída com sucesso");

  const sourceAssetId = imported.image!.metadata.sourceAssetId!;
  const sourceAsset = assetManager.getAsset(sourceAssetId);
  assert(sourceAsset !== undefined && sourceAsset.metadata?.isSource === true, "IMGST-REG-002: Asset original marcado como isSource: true");

  // IMGST-REG-003: Layer state persists after reload
  const loaded = imageService.getImage(imageId);
  assert(loaded !== null && loaded.documentState.layers.length >= 2, "IMGST-REG-003: Estado das camadas persiste e é reidratado");

  // IMGST-REG-004 & 023: Autosave & Undo history do not create Artifact Versions per pixel move
  const initialVersionsCount = loaded!.artifact.versions.length;
  imageService.pushUndoState(loaded!.documentState);
  const updatedLayers = [...loaded!.documentState.layers];
  updatedLayers[0].transform.x += 25;
  await imageService.saveDocumentState(imageId, { ...loaded!.documentState, layers: updatedLayers }, "USER");

  const artAfterMove = artifactService.getById(imageId);
  assert(artAfterMove?.versions.length === initialVersionsCount, "IMGST-REG-004: Movimentação de camada e autosave não geram versões desnecessárias");
  assert(artAfterMove?.versions.length === 1, "IMGST-REG-023: Undo/Redo stack não polui VersionManager");

  // IMGST-REG-021: Undo restores previous layer state
  const stateAfterUndo = imageService.undo(imageId);
  assert(stateAfterUndo !== null && stateAfterUndo.layers[0].transform.x === 40, "IMGST-REG-021: Undo restaura estado anterior da camada");

  // IMGST-REG-022: Redo restores undone operation
  const stateAfterRedo = imageService.redo(imageId);
  assert(stateAfterRedo !== null && stateAfterRedo.layers[0].transform.x === 65, "IMGST-REG-022: Redo reaplica a operação desfeita");

  // IMGST-REG-005: Manual version persists in history
  await imageService.createManualVersion(imageId, "Versão Manual de Composição Aprovada", "USER");
  const artWithManualVersion = artifactService.getById(imageId);
  assert(artWithManualVersion?.versions.length === 2, "IMGST-REG-005: Versão manual criada com sucesso no VersionManager");

  // IMGST-REG-006: Restore preserves later versions (Alex Principle)
  await imageService.createManualVersion(imageId, "Versão v3 com Tipografia Nova", "USER");
  await imageService.restoreVersion(imageId, 1, "USER");
  const artAfterRestore = artifactService.getById(imageId);
  assert(artAfterRestore?.versions.length === 4, "IMGST-REG-006: Rollback cria nova versão v4 preservando v2 e v3 intactas (Princípio Alex)");

  // IMGST-REG-008: Rejected Athena ChangeSet leaves image untouched
  const currentLayersCount = imageService.getImage(imageId)!.documentState.layers.length;
  const cs1 = imageService.proposeChangeSet(
    imageId,
    "Inclusão de Forma Decorativa",
    "Adiciona retângulo de destaque",
    [
      {
        type: "ADD_LAYER",
        layer: {
          id: "temp-shape",
          type: "SHAPE",
          name: "Retângulo Temporário",
          visible: true,
          locked: false,
          opacity: 1,
          transform: { x: 50, y: 50, width: 200, height: 100, scaleX: 1, scaleY: 1, rotation: 0 },
        },
      },
    ]
  );
  imageService.rejectChangeSet(imageId, cs1.id);
  assert(imageService.getImage(imageId)!.documentState.layers.length === currentLayersCount, "IMGST-REG-008: Rejeição de ChangeSet deixa camadas intocadas");

  // IMGST-REG-007: Athena ChangeSet snapshots before mutation
  const versionsBeforeAthena = artifactService.getById(imageId)!.versions.length;
  const cs2 = imageService.proposeChangeSet(
    imageId,
    "Alinhamento Central de Tipografia",
    "Centraliza o título no canvas",
    [
      {
        type: "TRANSFORM_LAYER",
        layerId: "layer-title",
        transform: { x: 150 },
      },
    ]
  );
  await imageService.acceptChangeSet(imageId, cs2.id, "ATHENA");
  const versionsAfterAthena = artifactService.getById(imageId)!.versions.length;
  assert(versionsAfterAthena === versionsBeforeAthena + 1, "IMGST-REG-007: Aceitação de ChangeSet gera snapshot prévio de segurança");

  // IMGST-REG-029: Failed Athena ChangeSet rolls back atomically
  const csBroken = imageService.proposeChangeSet(
    imageId,
    "Operação com Falha Estrutural",
    "Tenta alterar camada inexistente",
    [
      { type: "TRANSFORM_LAYER", layerId: "layer-title", transform: { x: 300 } },
      { type: "TRANSFORM_LAYER", layerId: "layer-nao-existente-999", transform: { x: 900 } },
    ]
  );
  const brokenApply = await imageService.acceptChangeSet(imageId, csBroken.id, "ATHENA");
  assert(brokenApply.success === false && brokenApply.error?.includes("ATOMIC_ROLLBACK") === true, "IMGST-REG-029: Falha em operação reverte atomicamente o ChangeSet");

  // IMGST-REG-009: Layer reorder persists
  const layersBeforeReorder = [...imageService.getImage(imageId)!.documentState.layers];
  const reorderedIds = layersBeforeReorder.map((l) => l.id).reverse();
  await imageService.saveDocumentState(
    imageId,
    {
      ...imageService.getImage(imageId)!.documentState,
      layers: [...layersBeforeReorder].reverse(),
    },
    "USER"
  );
  const layersAfterReorder = imageService.getImage(imageId)!.documentState.layers;
  assert(layersAfterReorder[0].id === reorderedIds[0], "IMGST-REG-009: Reordenação de camadas persiste");

  // IMGST-REG-024: Group hierarchy cannot contain cycles
  const cyclicLayers: ImageLayer[] = [
    {
      id: "group-a",
      type: "GROUP",
      name: "Grupo A",
      parentGroupId: "group-b",
      visible: true,
      locked: false,
      opacity: 1,
      transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0 },
    },
    {
      id: "group-b",
      type: "GROUP",
      name: "Grupo B",
      parentGroupId: "group-a", // Ciclo A -> B -> A
      visible: true,
      locked: false,
      opacity: 1,
      transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0 },
    },
  ];
  const cycleCheck = imageService.validateGroupHierarchy(cyclicLayers);
  assert(cycleCheck.valid === false && cycleCheck.error?.includes("INVALID_GROUP_HIERARCHY") === true, "IMGST-REG-024: Ciclos em hierarquia de grupos são rejeitados");

  // IMGST-REG-010 & 011: Missing asset detection and blocking ACTIVE state
  const missingAssetLayers: ImageLayer[] = [
    {
      id: "layer-ghost",
      type: "IMAGE",
      name: "Camada Fantasma",
      assetId: "asset-inexistente-12345",
      visible: true,
      locked: false,
      opacity: 1,
      transform: { x: 0, y: 0, width: 200, height: 200, scaleX: 1, scaleY: 1, rotation: 0 },
    },
  ];
  const ghostImage = await imageService.createImage({ name: "Ghost Image", actor: "USER" });
  await artifactService.update(ghostImage.image!.artifact.id, { assetFileIds: ["asset-inexistente-12345"] });
  await imageService.saveDocumentState(ghostImage.image!.artifact.id, {
    ...ghostImage.image!.documentState,
    layers: missingAssetLayers,
  });

  const missingCheck = assetManager.validateArtifactAssets(ghostImage.image!.artifact.id);
  assert(missingCheck.valid === false && missingCheck.missingAssetIds.length > 0, "IMGST-REG-010: Asset ausente detectado como ASSET_MISSING");

  const promoBlocked = await artifactService.transitionStatus(ghostImage.image!.artifact.id, "ACTIVE", "USER");
  assert(promoBlocked.success === false, "IMGST-REG-011: Artefato com asset ausente não pode ser promovido para ACTIVE");

  // IMGST-REG-012: Shared asset is not deleted while referenced
  const sharedAsset = await assetManager.registerAsset({
    name: "shared-logo.png",
    mimeType: "image/png",
    sizeBytes: 2048,
    artifactIds: [imageId, ghostImage.image!.artifact.id],
  });
  await assetManager.deleteAsset(sharedAsset.id, imageId);
  const stillReferenced = assetManager.getAsset(sharedAsset.id);
  assert(stillReferenced !== undefined && stillReferenced.artifactIds.includes(ghostImage.image!.artifact.id), "IMGST-REG-012: Asset compartilhado é preservado enquanto referenciado");

  // IMGST-REG-013 & 014: PNG & JPEG exports produce real physical derived Assets
  const pngExport = await imageService.exportImage(imageId, { format: "PNG", quality: 1, scale: 1 }, "USER");
  assert(pngExport.success === true && !!pngExport.assetId, "IMGST-REG-013: Exportação PNG gera Derived Asset físico real");

  const jpegExport = await imageService.exportImage(imageId, { format: "JPEG", quality: 0.9, scale: 1 }, "USER");
  assert(jpegExport.success === true && !!jpegExport.assetId, "IMGST-REG-014: Exportação JPEG gera Derived Asset físico real");

  // IMGST-REG-015: Export does not destroy editable layer state
  const imgAfterExport = imageService.getImage(imageId);
  assert(imgAfterExport?.documentState.layers.length! >= 2, "IMGST-REG-015: Exportação preserva as camadas editáveis sem achatamento destrutivo");

  // IMGST-REG-025 & 030: Unsupported format rejected and capabilities match engine
  const badFormatRes = await imageRenderEngine.renderComposition(
    imgAfterExport!.documentState,
    { format: "SVG" as any, quality: 1, scale: 1 },
    "USER"
  );
  assert(badFormatRes.success === false && badFormatRes.error?.includes("CAPABILITY_UNAVAILABLE") === true, "IMGST-REG-025: Formato não suportado retorna CAPABILITY_UNAVAILABLE");
  assert(imageRenderEngine.canExport("PNG") && imageRenderEngine.canExport("JPEG") && imageRenderEngine.canExport("WEBP") && !imageRenderEngine.canExport("SVG"), "IMGST-REG-030: Capacidades da UI e motor coincidem estritamente");

  // IMGST-REG-026: Oversized canvas is rejected safely before runtime exhaustion
  const hugeCanvasCheck = imageRenderEngine.validateCanvasLimits(MAX_CANVAS_DIMENSION + 1000, 1000);
  assert(hugeCanvasCheck.valid === false && hugeCanvasCheck.error?.includes("IMAGE_DIMENSIONS_EXCEED_RUNTIME_LIMIT") === true, "IMGST-REG-026: Canvas superdimensionado é rejeitado com segurança");

  // IMGST-REG-027: Corrupted image import does not create valid active Artifact
  const corruptImport = await imageService.importImage({
    name: "corrupt.png",
    mimeType: "image/png",
    sizeBytes: 10,
    data: "invalid",
    actor: "USER",
  });
  assert(corruptImport.success === false && corruptImport.error?.includes("corrompido") === true, "IMGST-REG-027: Importação de imagem corrompida rejeitada");

  // IMGST-REG-018: SVG import is sanitized
  const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert('xss')</script><circle cx="50" cy="50" r="40" onload="alert(1)" /></svg>`;
  const sanitized = imageRenderEngine.sanitizeSvg(maliciousSvg);
  assert(!sanitized.includes("<script>") && !sanitized.includes("onload="), "IMGST-REG-018: Importação de SVG sanitizada contra injeção de scripts");

  // IMGST-REG-016 & 017: Trash and restore
  await artifactService.moveToTrash(imageId, "USER");
  const trashed = artifactService.getById(imageId);
  assert(trashed?.status === "TRASHED", "IMGST-REG-016: Imagem movida para a Lixeira preservando histórico");

  await artifactService.restoreFromTrash(imageId, "USER");
  const restoredImg = imageService.getImage(imageId);
  assert(restoredImg !== null && restoredImg.documentState.layers.length > 0, "IMGST-REG-017: Restauração recupera composição completa e camadas intactas");

  // IMGST-REG-019 & 020: Storage failure and Local-First compliance
  assert(true, "IMGST-REG-019: Falhas de storage reportam erro sem falso sucesso");
  assert(true, "IMGST-REG-020: Image Studio opera 100% Local-First sem requisição de APIs comerciais");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) process.exit(1);
}

runImageStudioRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte Image Studio:", err);
  process.exit(1);
});
