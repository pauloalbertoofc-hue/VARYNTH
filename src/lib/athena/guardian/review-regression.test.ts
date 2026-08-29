import { ReviewStore } from "./review-store";
import { DocumentationGuardian } from "./documentation-guardian";

async function runDocRegressionTests() {
  console.log("\n===============================================================");
  console.log("  ATHENA DOCUMENTATION REGRESSION SUITE (DOC-REG-001..008)     ");
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

  // Set up an isolated test instance of ReviewStore
  const store = new ReviewStore();
  store.resetToDemo();

  // Test DOC-REG-008: Dashboard review count matches Review Registry
  const initialPending = store.getPendingReviews();
  assert(initialPending.length === 2, "DOC-REG-008: Total de pendências inicial é exatamente 2");

  // Test DOC-REG-002: Approval updates pending count
  const itemToApprove = initialPending[0]; // REV-001
  const approveRes = store.approveAndPublish(itemToApprove.id, "Paulo");
  assert(approveRes.success, "DOC-REG-002: Aprovação executada com sucesso");

  const pendingAfterApprove = store.getPendingReviews();
  assert(
    pendingAfterApprove.length === 1,
    `DOC-REG-002: Contagem de pendências decrementou para 1 (atual: ${pendingAfterApprove.length})`
  );

  // Test DOC-REG-003: Approved review leaves pending queue
  const isStillInPending = pendingAfterApprove.some((r) => r.id === itemToApprove.id);
  assert(!isStillInPending, "DOC-REG-003: REV-001 saiu completamente da fila de pendentes");

  // Test DOC-REG-004: Approved review appears in approved history
  const approvedList = store.getApprovedReviews();
  const approvedItem = approvedList.find((r) => r.id === itemToApprove.id);
  assert(!!approvedItem, "DOC-REG-004: REV-001 está presente na lista de aprovados");
  assert(approvedItem?.status === "APPROVED", "DOC-REG-004: Status de REV-001 é APPROVED");

  // Test DOC-REG-005: Approved review cannot be approved twice (idempotency)
  const doubleApproveRes = store.approveAndPublish(itemToApprove.id, "Paulo");
  assert(!doubleApproveRes.success, "DOC-REG-005: Segunda tentativa de aprovação foi bloqueada");
  assert(
    doubleApproveRes.error?.includes("já foi aprovada") || false,
    "DOC-REG-005: Mensagem de idempotência retornada corretamente"
  );

  // Test DOC-REG-006: Published document matches reviewed draft
  assert(
    !!approvedItem && (approvedItem.editedContent === itemToApprove.fullDraftContent || approvedItem.fullDraftContent === itemToApprove.fullDraftContent),
    "DOC-REG-006: Conteúdo publicado corresponde exatamente ao draft inspecionado"
  );

  // Test DOC-REG-007: Rejection test
  const itemToReject = pendingAfterApprove[0]; // REV-002
  const rejectReason = "Necessário validar teste de regressão ATH-CONV-004 antes de unificar.";
  const rejectRes = store.rejectReview(itemToReject.id, "Paulo", rejectReason);
  assert(rejectRes.success, "DOC-REG-007: Rejeição executada com sucesso");

  const rejectedList = store.getRejectedReviews();
  const rejectedItem = rejectedList.find((r) => r.id === itemToReject.id);
  assert(!!rejectedItem, "DOC-REG-007: REV-002 presente na lista de rejeitados");
  assert(rejectedItem?.rejectionReason === rejectReason, "DOC-REG-007: Motivo da rejeição preservado");

  // Test DOC-REG-001: Approval and Rejection survive simulated reload / rehydration
  // Simulate browser restart / new store instance loading the persisted memory
  const memoryDump = (store as any).reviews;
  const newHydratedStore = new ReviewStore();
  (newHydratedStore as any).reviews = JSON.parse(JSON.stringify(memoryDump));

  const hydratedApproved = newHydratedStore.getApprovedReviews();
  const hydratedRejected = newHydratedStore.getRejectedReviews();
  const hydratedPending = newHydratedStore.getPendingReviews();

  assert(
    hydratedApproved.length === 1 && hydratedApproved[0].id === "REV-001",
    "DOC-REG-001: REV-001 continua aprovado após simulação de reload"
  );
  assert(
    hydratedRejected.length === 1 && hydratedRejected[0].id === "REV-002",
    "DOC-REG-001: REV-002 continua rejeitado após simulação de reload"
  );
  assert(
    hydratedPending.length === 0,
    "DOC-REG-001: Fila de pendências permanece com 0 itens após reload"
  );

  // Health report reflection
  const guardian = new DocumentationGuardian();
  const health = guardian.assessHealth();
  assert(health.score === 100, "Documentation Guardian reflete saúde 100% (SYNCED) com itens aprovados");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDocRegressionTests().catch((err) => {
  console.error("Erro fatal nos testes de regressão documental:", err);
  process.exit(1);
});
