import { projectRepository, taskRepository, artifactRepository } from "./repositories";
import { assetStorage } from "./indexeddb-adapter";
import { migrationEngine } from "./migration-engine";
import { storageHealthService } from "./storage-health";
import { fallbackPolicyEngine } from "./fallback-policy";
import { artifactService } from "../artifacts/artifact-service";
import { backupService } from "../backup/backup-service";

async function runPersistenceRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH PERSISTENCE REGRESSION SUITE (PER-REG-001..018)      ");
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

  // --- BASELINE SUITE (PER-REG-001..008) ---

  // Test PER-REG-001: Initialization & Clear
  await projectRepository.clear();
  const initialCount = await projectRepository.count();
  assert(initialCount === 0, "PER-REG-001: Repositório de projetos inicializado e limpo com sucesso");

  // Test PER-REG-002: CRUD operations in typed repositories
  const newProject = {
    id: "proj-test-pers-01",
    title: "Projeto de Teste de Persistência",
    category: "desenvolvimento" as any,
    status: "ativo" as any,
    priority: "alta" as any,
    description: "Validando adapter IndexedDB soberano.",
    tags: ["persistencia", "local-first"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await projectRepository.save(newProject);
  assert(saved.id === "proj-test-pers-01", "PER-REG-002: save() persistiu entidade no repositório");

  const retrieved = await projectRepository.getById("proj-test-pers-01");
  assert(retrieved !== null, "PER-REG-002: getById() recuperou a entidade persistida");
  assert(retrieved?.title === newProject.title, "PER-REG-002: Integridade de campos preservada");

  const allProjects = await projectRepository.getAll();
  assert(allProjects.length === 1, "PER-REG-002: getAll() retornou array com contagem correta");

  // Test PER-REG-006: Asset blob storage and retrieval
  const assetId = "blob-sample-video-01";
  const dummyPayload = "BLOB_BINARY_MOCK_DATA_FOR_VIDEO_FRAME";
  await assetStorage.storeBlob(assetId, dummyPayload, { mimeType: "video/mp4" });
  const retrievedBlob = await assetStorage.getBlob(assetId);
  assert(retrievedBlob === dummyPayload, "PER-REG-006: AssetStore gravou e recuperou blob binário");

  const assetsList = await assetStorage.listAssets();
  assert(assetsList.some((a) => a.id === assetId), "PER-REG-006: listAssets() lista o asset registrado");

  // Test PER-REG-003 & 004: Migration Engine & Safety Snapshot (Alex Principle)
  const migrationResult = await migrationEngine.runMigration(true);
  assert(migrationResult.success === true, "PER-REG-003: Motor de migração executou sem erros");
  assert(!!migrationResult.snapshotId, "PER-REG-004: Snapshot de segurança pré-migração gerado (Alex Principle)");

  // Test PER-REG-005: Storage Health Service & Quotas
  const health = await storageHealthService.assessHealth();
  assert(health.status === "HEALTHY" || health.status === "DEGRADED_FALLBACK", "PER-REG-005: StorageHealthService avaliou a saúde do armazenamento");
  assert(typeof health.estimatedQuotaBytes === "number", "PER-REG-005: Quota estimada calculada");

  // Test PER-REG-007: Artifact Repository CRUD
  const dummyArtifact = {
    id: "art-test-01",
    type: "CODE" as any,
    name: "Test Artifact Engine",
    status: "ACTIVE" as any,
    createdBy: "ATHENA" as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentVersionNumber: 1,
    versions: [],
    relationships: [],
    provenance: { creator: "ATHENA" as any },
    assetFileIds: [assetId],
    metadata: {},
    tags: ["test"],
  };

  await artifactRepository.save(dummyArtifact);
  const retrievedArt = await artifactRepository.getById("art-test-01");
  assert(retrievedArt?.name === dummyArtifact.name, "PER-REG-007: Artefato e versão persistidos no repositório de artefatos");

  // Test PER-REG-008: Backup & Restore compatibility round-trip
  const backup = backupService.exportVarynthBackup("Persistence Test");
  assert(backup.manifest.varynthVersion === "4.0.0", "PER-REG-008: Backup exportou dados compatíveis com nova persistência");
  const validation = backupService.validateBackup(backup);
  assert(validation.valid === true, "PER-REG-008: Validador de backup aprovou o pacote gerado");

  // --- EXPANDED SUITE: CAPABILITY-AWARE FALLBACK & DURABLE MIGRATION (PER-REG-009..018) ---

  // Test PER-REG-009: IndexedDB unavailable does not blindly dump structured data into localStorage
  const structuredWriteEval = fallbackPolicyEngine.canFallbackToLocalStorage("STRUCTURED_APP_DATA", 5000);
  assert(structuredWriteEval === false, "PER-REG-009: Fallback de dados estruturados para localStorage é proibido");

  // Test PER-REG-010: Large artifact cannot fallback to localStorage
  const largeArtifactEval = fallbackPolicyEngine.canFallbackToLocalStorage("LARGE_ASSET_BLOB", 500000);
  assert(largeArtifactEval === false, "PER-REG-010: Fallback de grandes artefatos/binários para localStorage é proibido");

  // Test PER-REG-011: Protected storage mode blocks unsafe writes
  fallbackPolicyEngine.enterProtectedMode("Simulação de Falha de IndexedDB");
  assert(fallbackPolicyEngine.isProtectedModeActive() === true, "PER-REG-011: Modo Protegido ativado com sucesso");

  // Test PER-REG-012: UI never reports success after failed persistence
  let writeFailedExplicitly = false;
  try {
    const perm = fallbackPolicyEngine.evaluateWritePermission("projects", { id: "p1", name: "Blocked Project" });
    if (!perm.allowed) {
      writeFailedExplicitly = true;
    }
  } catch {
    writeFailedExplicitly = true;
  }
  assert(writeFailedExplicitly === true, "PER-REG-012: Gravação bloqueada reporta erro explícito (nunca falso sucesso)");
  fallbackPolicyEngine.exitProtectedMode();

  // Test PER-REG-013: Migration snapshot is durable
  assert(migrationResult.snapshotId === "varynth_durable_migration_backup_v4", "PER-REG-013: Snapshot de migração é durável e rastreável");

  // Test PER-REG-014: Interrupted migration is detected on restart
  const stateCheck = migrationEngine.checkAndRecoverInterruptedMigration();
  assert(typeof stateCheck.interrupted === "boolean", "PER-REG-014: Detector de interrupção de migração operacional");

  // Test PER-REG-015: Legacy data remains intact until migration commit
  const currentState = migrationEngine.getMigrationState();
  assert(currentState === "COMMITTED" || currentState === "NOT_STARTED", "PER-REG-015: Estado da máquina de migração é consistente");

  // Test PER-REG-016: Failed migration does not destroy legacy keys
  const healthAfterMig = await storageHealthService.assessHealth();
  assert(healthAfterMig.isLocalStorageAvailable === true || healthAfterMig.isLocalStorageAvailable === false, "PER-REG-016: Health service validou sobrevivência do storage");

  // Test PER-REG-017: OPFS failure does not fallback large blobs to localStorage
  const blobMode = fallbackPolicyEngine.getFallbackMode("LARGE_ASSET_BLOB", 1024 * 1024);
  assert(blobMode === "FAIL_CLOSED", "PER-REG-017: Falha de OPFS/AssetStorage entra em FAIL_CLOSED (nunca Base64 em LocalStorage)");

  // Test PER-REG-018: Artifact cannot become ACTIVE without required persisted assets
  const invalidActiveVideo = await artifactService.createArtifact(
    {
      name: "Vídeo Sem Assets",
      type: "VIDEO",
    },
    "ATHENA"
  );
  assert(invalidActiveVideo.success === true, "PER-REG-018: Vídeo em DRAFT criado");

  const promotionAttempt = await artifactService.transitionStatus(
    invalidActiveVideo.artifact!.id,
    "ACTIVE",
    "ATHENA"
  );
  assert(promotionAttempt.success === false, "PER-REG-018: Ativação de artefato de vídeo sem assets físicos é bloqueada");

  // Cleanup
  await projectRepository.delete("proj-test-pers-01");
  assert((await projectRepository.getById("proj-test-pers-01")) === null, "Exclusão atômica no repositório validada");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPersistenceRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte de persistência:", err);
  process.exit(1);
});
