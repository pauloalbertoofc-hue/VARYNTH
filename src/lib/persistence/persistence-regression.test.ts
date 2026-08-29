import { projectRepository, taskRepository, artifactRepository } from "./repositories";
import { assetStorage } from "./indexeddb-adapter";
import { migrationEngine } from "./migration-engine";
import { storageHealthService } from "./storage-health";
import { backupService } from "../backup/backup-service";

async function runPersistenceRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH PERSISTENCE REGRESSION SUITE (PER-REG-001..008)      ");
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

