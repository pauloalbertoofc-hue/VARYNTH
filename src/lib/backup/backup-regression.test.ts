import { backupService } from "./backup-service";

async function runBackupRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH UNIVERSAL BACKUP REGRESSION SUITE (BAK-REG-001..006) ");
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

  // Test BAK-REG-001: Export produces valid manifest and entity counts
  const backup = backupService.exportVarynthBackup("Test Suite Environment");
  assert(backup.manifest.varynthVersion === "4.0.0", "BAK-REG-001: Versão do VARYNTH no manifesto é 4.0.0");
  assert(backup.manifest.schemaVersion === 2, "BAK-REG-001: Versão de esquema é 2");
  assert(typeof backup.manifest.entitiesCount.artifacts === "number", "BAK-REG-001: Contagem de artefatos presente");
  assert(Array.isArray(backup.data.artifacts), "BAK-REG-001: Coleção de artefatos exportada como array");

  // Test BAK-REG-002: Zero tokens or secrets exported
  const rawString = JSON.stringify(backup);
  assert(!rawString.includes("OPENAI_API_KEY"), "BAK-REG-002: Sem chaves de API externas no backup");
  assert(!rawString.includes("secret_key"), "BAK-REG-002: Sem segredos no arquivo exportado");

  // Test BAK-REG-003: Validation rejects malformed JSON
  const invalidValidation = backupService.validateBackup({ foo: "bar" });
  assert(invalidValidation.valid === false, "BAK-REG-003: JSON malformado rejeitado na validação");
  assert(invalidValidation.errors.length > 0, "BAK-REG-003: Lista de erros emitida na validação");

  // Test BAK-REG-004: Validation accepts compliant schema
  const validValidation = backupService.validateBackup(backup);
  assert(validValidation.valid === true, "BAK-REG-004: Esquema em conformidade aprovado na validação");
  assert(validValidation.errors.length === 0, "BAK-REG-004: Zero erros em backup válido");

  // Test BAK-REG-005: Restore in Merge mode
  const mergeResult = backupService.restoreVarynthBackup(backup, "MERGE");
  assert(mergeResult.success === true, "BAK-REG-005: Restauração em modo MERGE concluída com sucesso");

  // Test BAK-REG-006: Restore in Replace mode
  const replaceResult = backupService.restoreVarynthBackup(backup, "REPLACE");
  assert(replaceResult.success === true, "BAK-REG-006: Restauração em modo REPLACE concluída com sucesso");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runBackupRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte de backup:", err);
  process.exit(1);
});
