import { artifactService } from "./artifact-service";
import { versionManager } from "./version-manager";
import { assetManager } from "./asset-manager";
import { creationEngineRegistry } from "./creation-engine";
import { permissionPolicyEngine } from "../permissions/permission-policy";

async function runArtifactRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH UNIVERSAL ARTIFACT REGRESSION SUITE (ART-REG-001..022)");
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

  // ART-REG-001: List initial artifacts
  const initialList = artifactService.listAll();
  assert(initialList.length > 0, "ART-REG-001: listAll retorna lista de artefatos existentes");

  // ART-REG-002: Filter artifacts by status
  const drafts = artifactService.listAll("DRAFT");
  assert(Array.isArray(drafts), "ART-REG-002: Filtro por status DRAFT retorna array");

  // ART-REG-003 & 009: Create Artifact creates initial version v1.0
  const created = await artifactService.createArtifact(
    {
      type: "DOCUMENT",
      name: "Guia de Arquitetura Universal",
      description: "Documentação base do sistema",
      tags: ["arquitetura", "docs"],
      metadata: { chapters: 4 },
      provenance: { requestedBy: "Paulo", generationPrompt: "Crie o guia" },
    },
    "USER"
  );
  assert(created.success && !!created.artifact, "ART-REG-003: Artefato criado com sucesso");
  assert(created.artifact?.status === "DRAFT", "ART-REG-003: Artefato nasce com status DRAFT");
  assert(created.artifact?.currentVersionNumber === 1, "ART-REG-009: Criação inicial gera versão v1.0");
  assert(created.artifact?.versions.length === 1, "ART-REG-009: Histórico contém 1 versão inicial");

  const artId = created.artifact!.id;

  // ART-REG-011: Athena creates Artifact as DRAFT
  const athenaDraft = await artifactService.createArtifact(
    {
      type: "VIDEO",
      name: "Roteiro Criminologia Aula 1",
      description: "Estrutura do vídeo",
    },
    "ATHENA"
  );
  assert(athenaDraft.success && athenaDraft.artifact?.status === "DRAFT", "ART-REG-011: Athena cria artefatos em status DRAFT com sucesso");

  // ART-REG-010 & 015: Artifact cannot be ACTIVE without required physical assets
  const transitionWithoutAsset = await artifactService.transitionStatus(athenaDraft.artifact!.id, "ACTIVE", "USER");
  assert(transitionWithoutAsset.success === false, "ART-REG-010: Promoção de vídeo sem asset físico para ACTIVE é bloqueada");
  assert(transitionWithoutAsset.error !== undefined && transitionWithoutAsset.error.includes("CONSISTÊNCIA DE ASSETS"), "ART-REG-015: Diagnóstico de asset faltante emitido");

  // Register physical asset and link
  const sampleAsset = await assetManager.registerAsset(
    {
      name: "aula-01-criminologia.mp4",
      mimeType: "video/mp4",
      sizeBytes: 1024 * 1024 * 50, // 50 MB
      artifactIds: [athenaDraft.artifact!.id],
    },
    "mock-binary-data-stream"
  );
  assert(sampleAsset.id.startsWith("asset-"), "ART-REG-010: Asset físico registrado com sucesso no AssetManager");

  await artifactService.updateArtifact(athenaDraft.artifact!.id, { assetFileIds: [sampleAsset.id] }, "USER");
  const transitionWithAsset = await artifactService.transitionStatus(athenaDraft.artifact!.id, "ACTIVE", "USER");
  assert(transitionWithAsset.success === true, "ART-REG-010: Promoção para ACTIVE aprovada após vinculação de asset físico");

  // ART-REG-012: Published Artifact modification requires confirmation
  await artifactService.transitionStatus(transitionWithAsset.artifact!.id, "PUBLISHED", "USER");
  const athenaModPublished = await artifactService.updateArtifact(
    transitionWithAsset.artifact!.id,
    { name: "Tentativa de alteração sem autorização" },
    "ATHENA"
  );
  assert(athenaModPublished.success === false && athenaModPublished.requiresConfirmation === true, "ART-REG-012: Modificação de artefato publicado pela Athena exige confirmação");

  // ART-REG-013: Version snapshot occurs before modification
  const preModVersions = created.artifact!.versions.length;
  await artifactService.updateArtifact(artId, { name: "Guia de Arquitetura V2" }, "USER", "Atualização do título");
  const updatedArt = artifactService.getById(artId);
  assert(updatedArt!.versions.length === preModVersions + 1, "ART-REG-013: Snapshot de versão gerado antes da mutação");
  assert(updatedArt!.currentVersionNumber === 2, "ART-REG-013: Versão incrementada para v2.0");

  // ART-REG-005 & 014: Restore old version preserves newer history (Alex Principle)
  await artifactService.updateArtifact(artId, { name: "Guia de Arquitetura V3" }, "USER", "Terceira versão");
  const postV3Art = artifactService.getById(artId);
  assert(postV3Art!.currentVersionNumber === 3, "ART-REG-005: Versão atualizada para v3.0");

  const restored = artifactService.restoreVersion(artId, 1, "USER");
  assert(restored.success && !!restored.artifact, "ART-REG-014: Rollback para v1.0 executado");
  assert(restored.artifact?.name === "Guia de Arquitetura Universal", "ART-REG-014: Conteúdo da v1.0 restaurado");
  assert(restored.artifact?.currentVersionNumber === 4, "ART-REG-014: Versão restaurada cria nova entrada no histórico sem apagar v2 e v3 (Alex Principle)");

  // ART-REG-006: Compare versions
  const diff = versionManager.compareVersions(restored.artifact!, 1, 3);
  assert(diff.differences.name !== undefined, "ART-REG-006: Comparação detectou diferença de nome entre v1 e v3");

  // ART-REG-007 & 019: Link relationship between artifacts
  const relRes = artifactService.addRelationship(artId, athenaDraft.artifact!.id, "ADAPTED_TO", "Artigo adaptado para vídeo");
  assert(relRes.success, "ART-REG-007: Relação entre artefatos registrada com sucesso");
  const reloadedSource = artifactService.getById(artId);
  assert(reloadedSource!.relationships.length > 0, "ART-REG-019: Relação persistida no artefato");

  // ART-REG-008 & 020: Provenance tracking
  assert(reloadedSource!.provenance.requestedBy === "Paulo", "ART-REG-008: Proveniência preservada");
  assert(reloadedSource!.provenance.creator === "USER", "ART-REG-020: Criador preservado na proveniência");

  // ART-REG-016: Artifact Trash preserves version history and assets
  const trashRes = await artifactService.removeArtifact(artId, "USER");
  assert(trashRes.success, "ART-REG-016: Artefato movido para a Lixeira");
  const trashedArt = artifactService.getById(artId);
  assert(trashedArt!.status === "TRASHED", "ART-REG-016: Status atualizado para TRASHED");
  assert(trashedArt!.versions.length > 0, "ART-REG-016: Histórico de versões preservado integralmente na lixeira");

  // ART-REG-017: Shared asset is not deleted while still referenced
  const assetInUse = assetManager.listAssetsForArtifact(athenaDraft.artifact!.id);
  assert(assetInUse.length > 0, "ART-REG-017: Asset físico compartilhado permanece ativo");

  // ART-REG-018: Orphan asset is detected
  const unlinkedAsset = await assetManager.registerAsset(
    {
      name: "orphan-audio.wav",
      mimeType: "audio/wav",
      sizeBytes: 1024 * 1024 * 5,
      artifactIds: [],
    },
    "mock-audio-data"
  );
  const orphans = assetManager.detectOrphanAssets(artifactService.listAll());
  assert(orphans.some((o) => o.id === unlinkedAsset.id), "ART-REG-018: Asset órfão detectado pelo AssetManager");

  // ART-REG-021: Unsupported artifact types do not fake completion.
  // GAME is intentionally supported by the local declarative game engine.
  const datasetCreation = await creationEngineRegistry.executeCreation({
    artifactType: "DATASET",
    name: "Base Epistêmica",
    actor: "ATHENA",
  });
  assert(datasetCreation.success === false, "ART-REG-021: Tipo sem engine local não finge sucesso");
  assert(datasetCreation.capabilityStatus === "CAPABILITY_UNAVAILABLE", "ART-REG-021: Retorna explicitamente CAPABILITY_UNAVAILABLE");

  // ART-REG-022: Hard delete remains denied to Athena
  const athenaHardDelete = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "DELETE_HARD",
    targetDomain: "ARTIFACT_ACTIVE",
  });
  assert(athenaHardDelete.allowed === false && athenaHardDelete.policy === "DENY", "ART-REG-022: Hard delete permanece terminantemente negado para Athena");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runArtifactRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte de artefatos:", err);
  process.exit(1);
});
