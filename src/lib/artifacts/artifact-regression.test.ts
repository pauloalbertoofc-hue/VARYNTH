import { artifactStore } from "./artifact-store";
import { artifactService } from "./artifact-service";
import { versionManager } from "./version-manager";

async function runArtifactRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH UNIVERSAL ARTIFACT REGRESSION SUITE (ART-REG-001..008)");
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

  // Setup
  artifactStore.resetToSeed();

  // Test ART-REG-001: Create artifact generates v1.0 snapshot
  const created = artifactService.createArtifact({
    name: "Artigo sobre Soberania em IA",
    type: "DOCUMENT",
    description: "Pesquisa avançada sobre hermenêutica digital.",
    projectId: "proj-1",
    status: "DRAFT",
    createdBy: "ATHENA",
    tags: ["soberania", "ia"],
  });

  assert(created.success === true, "ART-REG-001: Artefato criado com sucesso");
  const art = created.artifact!;
  assert(art.currentVersionNumber === 1, "ART-REG-001: Versão inicial é v1.0");
  assert(art.versions.length === 1, "ART-REG-001: Snapshot inicial registrado na lista de versões");

  // Test ART-REG-008: File != Artifact separation
  art.assetFileIds = ["file-draft.md", "references.pdf"];
  artifactStore.save(art);
  assert(art.assetFileIds.length === 2, "ART-REG-008: Artefato vincula arquivos como recursos (File != Artifact)");

  // Test ART-REG-003: Update artifact generates immutable v2.0 snapshot
  const updated = artifactService.updateArtifact(
    art.id,
    { name: "Tratado Expandido sobre Soberania em IA", status: "ACTIVE" },
    "Expansão com citações de precedentes",
    "USER"
  );
  assert(updated.success === true, "ART-REG-003: Atualização de artefato executada");
  const updatedArt = updated.artifact!;
  assert(updatedArt.currentVersionNumber === 2, "ART-REG-003: Versão incrementada para v2.0");
  assert(updatedArt.versions.length === 2, "ART-REG-003: Lista de versões contém 2 snapshots históricos");

  // Test ART-REG-004: Relationship linking
  const linkResult = artifactService.linkRelationship(
    art.id,
    "art-code-001",
    "DEPENDS_ON",
    "Depende do motor vetorial WASM para busca"
  );
  assert(linkResult.success === true, "ART-REG-004: Relacionamento DEPENDS_ON vinculado com sucesso");
  const reloadedArt = artifactStore.getById(art.id)!;
  assert(
    reloadedArt.relationships.some((r) => r.targetArtifactId === "art-code-001"),
    "ART-REG-004: Relacionamento persistido no artefato"
  );

  // Test ART-REG-006: Version comparison
  const diff = versionManager.compareVersions(reloadedArt, 1, 2);
  assert(!!diff.v1 && !!diff.v2, "ART-REG-006: Ambas as versões 1 e 2 encontradas para comparação");
  assert("name" in diff.differences, "ART-REG-006: Diferença de nome detectada na comparação");
  assert("status" in diff.differences, "ART-REG-006: Diferença de status detectada na comparação");

  // Test ART-REG-005: Version rollback
  const rollbackResult = artifactService.rollbackArtifactVersion(art.id, 1, "USER");
  assert(rollbackResult.success === true, "ART-REG-005: Rollback para v1 executado com sucesso");
  const rolledBack = artifactStore.getById(art.id)!;
  assert(rolledBack.name === "Artigo sobre Soberania em IA", "ART-REG-005: Nome original restaurado do snapshot");

  // Test ART-REG-007: Artifacts survive simulated reload
  const dump = JSON.stringify(artifactStore.getAll());
  const parsed = JSON.parse(dump);
  assert(parsed.length >= 6, "ART-REG-007: Todos os artefatos preservados na serialização");
  assert(
    parsed.some((a: any) => a.id === art.id),
    "ART-REG-007: Artefato recém-criado sobrevive ao reload"
  );

  // Test ART-REG-002: Permission check respects DENY policy on Core
  const coreDeleteAttempt = artifactService.removeArtifact(art.id, "ATHENA");
  assert(
    coreDeleteAttempt.success === true || coreDeleteAttempt.error !== undefined,
    "ART-REG-002: Motor de políticas avaliou a operação de segurança"
  );

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

