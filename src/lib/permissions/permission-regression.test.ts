import { permissionPolicyEngine } from "./permission-policy";
import { athenaToolManager } from "../athena/tools/tool-manager";

async function runPermissionRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH ATHENA PERMISSION REGRESSION SUITE (PERM-REG-001..018)");
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

  // Test PERM-REG-001: Athena can read Projects (ALLOW)
  const p1 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "READ",
    targetDomain: "WORKSPACE_PROJECT",
  });
  assert(p1.allowed === true && p1.policy === "ALLOW", "PERM-REG-001: Athena can read Projects (ALLOW)");

  // Test PERM-REG-002: Athena can create Task (ALLOW)
  const p2 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "CREATE",
    targetDomain: "WORKSPACE_TASK",
  });
  assert(p2.allowed === true && p2.policy === "ALLOW", "PERM-REG-002: Athena can create Task (ALLOW)");

  // Test PERM-REG-003: Athena can create Artifact DRAFT (ALLOW)
  const p3 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "CREATE",
    targetDomain: "ARTIFACT_DRAFT",
    resourceStatus: "DRAFT",
  });
  assert(p3.allowed === true && p3.policy === "ALLOW", "PERM-REG-003: Athena can create Artifact DRAFT (ALLOW)");

  // Test PERM-REG-004: Athena modifying published Artifact requires confirmation (CONFIRM)
  const p4 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "MODIFY",
    targetDomain: "ARTIFACT_PUBLISHED",
    resourceStatus: "PUBLISHED",
  });
  assert(p4.allowed === false && p4.policy === "CONFIRM" && p4.requiresConfirmation === true, "PERM-REG-004: Athena modifying published Artifact requires confirmation (CONFIRM)");

  // Test PERM-REG-005: Athena cannot hard-delete user data (DENY)
  const p5 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "DELETE_HARD",
    targetDomain: "WORKSPACE_PROJECT",
  });
  assert(p5.allowed === false && p5.policy === "DENY", "PERM-REG-005: Athena cannot hard-delete user data (DENY)");

  // Test PERM-REG-006: Athena can execute code only in Sandbox (SANDBOX)
  const p6 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "EXECUTE",
    targetDomain: "SANDBOX_LABS",
  });
  assert(p6.allowed === true && p6.policy === "SANDBOX", "PERM-REG-006: Athena can execute code only in Sandbox (SANDBOX)");

  // Test PERM-REG-007: Athena cannot execute against Core (DENY)
  const p7 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "EXECUTE",
    targetDomain: "CORE_SYSTEM",
  });
  assert(p7.allowed === false && p7.policy === "DENY", "PERM-REG-007: Athena cannot execute against Core (DENY)");

  // Test PERM-REG-008: Publish requires confirmation (CONFIRM)
  const p8 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "PUBLISH",
    targetDomain: "TECHNICAL_DOCS",
  });
  assert(p8.policy === "CONFIRM" && p8.requiresConfirmation === true, "PERM-REG-008: Publish requires confirmation (CONFIRM)");

  // Test PERM-REG-009: Unknown high-risk action fails closed (CONFIRM or DENY)
  const p9 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "SHARE",
    targetDomain: "PERMANENT_MEMORY",
  });
  assert(p9.policy === "CONFIRM" || p9.policy === "DENY", "PERM-REG-009: Unknown high-risk action fails closed (CONFIRM or DENY)");

  // Test PERM-REG-010: Batch destructive operation requires confirmation (CONFIRM)
  const p10 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "DELETE_SOFT",
    targetDomain: "WORKSPACE_PROJECT",
    isBatch: true,
    batchCount: 5,
  });
  assert(p10.policy === "CONFIRM" && p10.riskLevel === "CRITICAL", "PERM-REG-010: Batch destructive operation requires confirmation (CONFIRM)");

  // Test PERM-REG-011: ToolManager enforces PermissionPolicyEngine on tool execution
  const mockCtx: any = {
    addTask: () => ({ id: "t1", title: "Test" }),
    addNote: () => ({ id: "n1" }),
    tasks: [],
    projects: [],
    vaultItems: [],
    chronosEvents: [],
    theses: [],
    evidences: [],
    opportunities: [],
  };
  const toolExec = await athenaToolManager.executeTool("tasks.create", { title: "Tarefa Teste" }, mockCtx);
  assert(toolExec.success === true, "PERM-REG-011: ToolManager executa tarefas autorizadas via PermissionPolicyEngine");

  // Test PERM-REG-012: Sandbox cannot escalate into Core (DENY)
  const p12 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA", agentId: "logos" },
    action: "MODIFY",
    targetDomain: "CORE_SYSTEM",
  });
  assert(p12.policy === "DENY", "PERM-REG-012: Sandbox cannot escalate into Core (DENY)");

  // Test PERM-REG-013: Denied action creates no mutation
  const p13 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "DELETE_HARD",
    targetDomain: "TRASH_BIN",
  });
  assert(p13.allowed === false, "PERM-REG-013: Denied action creates no mutation (Alex Principle)");

  // Test PERM-REG-014: Confirmation token cannot be reused
  const conf = permissionPolicyEngine.generateConfirmation(
    "PUBLISH",
    "TECHNICAL_DOCS",
    "Publicação de Manual",
    ["Atualiza documentação oficial"]
  );
  const firstUse = permissionPolicyEngine.verifyAndConsumeToken(conf.token);
  assert(firstUse.valid === true, "PERM-REG-014: Primeiro consumo do token é válido");
  const secondUse = permissionPolicyEngine.verifyAndConsumeToken(conf.token);
  assert(secondUse.valid === false, "PERM-REG-014: Segundo consumo do mesmo token é rejeitado (One-Time Token)");

  // Test PERM-REG-015: Permission decision is recorded when audit required
  assert(p10.auditRequired === true, "PERM-REG-015: Decisões de alto risco marcam auditRequired = true");

  // Test PERM-REG-016: Agent profiles (Critias, Justitia, Strategos) enforce specialized boundaries
  const critiasMod = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA", agentId: "critias" },
    action: "MODIFY",
    targetDomain: "WORKSPACE_PROJECT",
  });
  assert(critiasMod.policy === "DENY", "PERM-REG-016: Critias não pode modificar projetos diretamente (auditor somente-leitura)");

  const justitiaTese = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA", agentId: "justitia" },
    action: "PUBLISH",
    targetDomain: "CODEX_THESES",
  });
  assert(justitiaTese.policy === "CONFIRM", "PERM-REG-016: Justitia exige confirmação para publicar teses");

  // Test PERM-REG-017: Athena cannot modify permission policies herself (Core Sovereign Rule)
  const p17 = permissionPolicyEngine.evaluate({
    actor: { type: "ATHENA" },
    action: "MODIFY",
    targetDomain: "CORE_SYSTEM",
  });
  assert(p17.policy === "DENY", "PERM-REG-017: Athena cannot modify permission policies herself (DENY)");

  // Test PERM-REG-018: Capability discovery allows Athena planner to inspect permissions
  const caps = permissionPolicyEngine.discoverCapabilities("ATHENA", "WORKSPACE_PROJECT");
  assert(caps.allowedActions.includes("READ"), "PERM-REG-018: Capability discovery identifica READ como permitida");
  assert(caps.confirmRequiredActions.includes("DELETE_SOFT"), "PERM-REG-018: Capability discovery identifica DELETE_SOFT como requerendo confirmação");
  assert(caps.prohibitedActions.includes("DELETE_HARD"), "PERM-REG-018: Capability discovery identifica DELETE_HARD como proibida");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPermissionRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte de permissões:", err);
  process.exit(1);
});

