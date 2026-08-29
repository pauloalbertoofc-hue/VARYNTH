import { documentationGuardian } from "./documentation-guardian";

async function runReviewCenterTests() {
  console.log("\n===============================================================");
  console.log("  TEST SUITE: VARYNTH DOCUMENTATION REVIEW CENTER & AUDIT     ");
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

  // 1. Initial State
  const { reviewStore } = await import("./review-store");
  reviewStore.resetToDemo();

  const allReviews = documentationGuardian.listAllReviews();
  assert(allReviews.length >= 2, "Review Center possui drafts interpretativos cadastrados");

  const pending = documentationGuardian.listPendingReviews();
  assert(pending.length >= 2, "Existem propostas pendentes de revisão humana");

  // 2. Draft Structure and Interactive Evidences
  const rev1 = allReviews[0];
  assert(rev1.fullDraftContent.length > 50, "Draft contém o texto integral do documento");
  assert(rev1.interactiveEvidences.length > 0, "Draft possui evidências interativas vinculadas");
  assert(!rev1.hasBeenRead, "Draft inicia como não lido (hasBeenRead = false)");

  // 3. Mark As Read & Audit Tracking
  documentationGuardian.markAsRead(rev1.id, "Paulo");
  const readRev1 = documentationGuardian.getReviewItem(rev1.id)!;
  assert(readRev1.hasBeenRead, "Draft marcado como lido após inspeção no Review Viewer");
  assert(
    readRev1.auditTrail.some((a) => a.action === "VIEWED"),
    "Trilha de auditoria registrou ação VIEWED do revisor humano"
  );

  // 4. Edit Draft Content
  const modifiedText = rev1.fullDraftContent + "\n\n<!-- Revisado e validado por Paulo -->";
  documentationGuardian.updateDraftContent(rev1.id, modifiedText, "Paulo");
  const editedRev1 = documentationGuardian.getReviewItem(rev1.id)!;
  assert(editedRev1.editedContent === modifiedText, "Conteúdo editado armazenado com sucesso");
  assert(
    editedRev1.auditTrail.some((a) => a.action === "EDITED"),
    "Trilha de auditoria registrou ação EDITED"
  );

  // 5. Approve Review with Edited Content
  documentationGuardian.approveReview(rev1.id, "Paulo", modifiedText);
  const approvedRev1 = documentationGuardian.getReviewItem(rev1.id)!;
  assert(approvedRev1.status === "APPROVED", "Status do draft atualizado para APPROVED");
  assert(approvedRev1.reviewedBy === "Paulo", "Revisor humano registrado no documento");

  const auditLog = documentationGuardian.listAuditLog();
  assert(
    auditLog.some((l) => l.type === "HUMAN_APPROVED" && l.affectedDocuments.includes(rev1.targetDocument)),
    "Log de auditoria registrou evento HUMAN_APPROVED com documento alvo"
  );

  // 6. Reject Review with Explicit Reason
  const rev2 = allReviews[1];
  const rejectReason = "Ajustar premissas do workspace antes de incorporar.";
  documentationGuardian.rejectReview(rev2.id, "Paulo", rejectReason);
  const rejectedRev2 = documentationGuardian.getReviewItem(rev2.id)!;
  assert(rejectedRev2.status === "REJECTED", "Status do draft atualizado para REJECTED");
  assert(rejectedRev2.rejectionReason === rejectReason, "Motivo da rejeição gravado permanentemente");
  const updatedAuditLog = documentationGuardian.listAuditLog();
  assert(
    updatedAuditLog.some((l) => l.type === "HUMAN_REJECTED"),
    "Log de auditoria registrou evento HUMAN_REJECTED"
  );

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runReviewCenterTests().catch((err) => {
  console.error("Erro fatal nos testes do Review Center:", err);
  process.exit(1);
});
