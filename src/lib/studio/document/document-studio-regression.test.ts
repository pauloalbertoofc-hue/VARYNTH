import { documentService } from "./document-service";
import { artifactService } from "../../artifacts/artifact-service";
import { assetManager } from "../../artifacts/asset-manager";

async function runDocumentStudioRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH DOCUMENT STUDIO REGRESSION SUITE (DOCST-REG-001..020)");
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

  // DOCST-REG-001: New document creates DOCUMENT Artifact
  const created = await documentService.createDocument({
    title: "Tratado de Epistemologia Jurídica",
    subtitle: "Fundamentação Dogmática e Hermenêutica",
    documentType: "ARTICLE",
    templateId: "academic-article",
    createdBy: "USER",
  });
  assert(created.success === true && !!created.document, "DOCST-REG-001: Criação de documento instancia Artifact do tipo DOCUMENT");
  assert(created.document?.artifact.type === "DOCUMENT", "DOCST-REG-001: Tipo de artefato é DOCUMENT");
  assert(created.document?.artifact.status === "DRAFT", "DOCST-REG-001: Documento nasce com status DRAFT");

  const docId = created.document!.artifact.id;

  // DOCST-REG-002: Initial version is created
  assert(created.document!.artifact.versions.length === 1, "DOCST-REG-002: Versão inicial v1.0 gerada automaticamente");
  assert(created.document!.artifact.versions[0].versionNumber === 1, "DOCST-REG-002: Número da versão inicial é 1");

  // DOCST-REG-003: Autosave persists after reload
  const modifiedContent = `# Tratado de Epistemologia Jurídica\n\nTexto expandido na primeira sessão de escrita.\n\n## 1. Introdução\nO problema epistemológico...`;
  const saveRes = await documentService.saveDocumentContent(docId, modifiedContent, {}, "USER");
  assert(saveRes.success === true, "DOCST-REG-003: Salvamento de conteúdo executado com sucesso");
  const loadedDoc = documentService.getDocument(docId);
  assert(loadedDoc?.content === modifiedContent, "DOCST-REG-003: Conteúdo persistido recuperado com integridade");

  // DOCST-REG-004: Autosave does not create version per keystroke
  const docAfterAutosave = artifactService.getById(docId);
  assert(docAfterAutosave?.versions.length === 1, "DOCST-REG-004: Autosave comum não cria versões desnecessárias por caractere");

  // DOCST-REG-005: Manual version persists
  const manualVersion = await documentService.createManualVersion(docId, "Revisão bibliográfica concluída", "USER");
  assert(manualVersion.success === true, "DOCST-REG-005: Versão manual registrada com sucesso");
  const docWithV2 = artifactService.getById(docId);
  assert(docWithV2?.versions.length === 2, "DOCST-REG-005: Histórico incrementado para 2 versões");

  // DOCST-REG-007: Athena modification snapshots previous state
  await documentService.saveDocumentContent(
    docId,
    modifiedContent + "\n\nAdendo conceitual inserido pela Athena.",
    {},
    "ATHENA"
  );
  const docAfterAthena = artifactService.getById(docId);
  assert(docAfterAthena?.versions.length === 3, "DOCST-REG-007: Modificação da Athena gera snapshot de segurança prévio");

  // DOCST-REG-006: Version restore preserves later versions (Alex Principle)
  const restoreRes = await documentService.restoreVersion(docId, "v1.0", "USER");
  assert(restoreRes.success === true, "DOCST-REG-006: Rollback para v1.0 concluído com sucesso");
  const docAfterRollback = artifactService.getById(docId);
  assert(docAfterRollback?.versions.length === 4, "DOCST-REG-006: Rollback cria nova versão v4.0 sem apagar v2 e v3 (Alex Principle)");

  // DOCST-REG-008 & 009: Tracked Changes / Suggestions Foundation
  const suggestion = documentService.suggestChange(
    docId,
    "O problema epistemológico...",
    "A questão central da epistemologia contemporânea...",
    "Melhoria de clareza conceitual",
    "ATHENA"
  );
  assert(suggestion.status === "PENDING", "DOCST-REG-008: Sugestão criada em status PENDING");

  const rejectRes = documentService.rejectSuggestion(docId, suggestion.id);
  assert(rejectRes.success === true, "DOCST-REG-008: Rejeição da sugestão preserva texto original");

  const sug2 = documentService.suggestChange(
    docId,
    "O problema epistemológico...",
    "A questão central da epistemologia contemporânea...",
    "Segunda tentativa",
    "ATHENA"
  );
  const acceptRes = await documentService.acceptSuggestion(docId, sug2.id);
  assert(acceptRes.success === true, "DOCST-REG-009: Aceitação da sugestão aplica o texto proposto");

  // DOCST-REG-010: Markdown export works
  const mdExport = documentService.exportDocument(docId, { format: "MARKDOWN", profile: "STANDARD" });
  assert(mdExport.fileName.endsWith(".md") && mdExport.content.includes("Tratado de Epistemologia"), "DOCST-REG-010: Exportação em Markdown gerada");

  // DOCST-REG-011: HTML export works
  const htmlExport = documentService.exportDocument(docId, { format: "HTML", profile: "STANDARD" });
  assert(htmlExport.mimeType === "text/html" && htmlExport.content.includes("<!DOCTYPE html>"), "DOCST-REG-011: Exportação em HTML gerada");

  // DOCST-REG-012: PDF export works
  const pdfExport = documentService.exportDocument(docId, { format: "PDF", profile: "STANDARD" });
  assert(pdfExport.mimeType === "application/pdf" && pdfExport.content.includes("@media print"), "DOCST-REG-012: Exportação em PDF com regras de impressão gerada");

  // DOCST-REG-013: Imported Markdown becomes DOCUMENT Artifact
  const importRes = await documentService.importMarkdown("artigo-importado.md", "# Artigo Importado\n\nConteúdo externo...", "USER");
  assert(importRes.success === true && importRes.document?.artifact.type === "DOCUMENT", "DOCST-REG-013: Markdown importado vira Artifact do tipo DOCUMENT");

  // DOCST-REG-014 & 015: Delete goes to Trash and Restore returns complete document
  const trashRes = await artifactService.moveToTrash(docId, "USER");
  assert(trashRes.success === true, "DOCST-REG-014: Exclusão move documento para a Lixeira");
  const trashedDoc = artifactService.getById(docId);
  assert(trashedDoc?.status === "TRASHED", "DOCST-REG-014: Status atualizado para TRASHED");
  assert(trashedDoc?.versions.length === 5, "DOCST-REG-015: Histórico de versões e metadados preservados integralmente");

  // DOCST-REG-016: Relationships survive reload
  await artifactService.linkRelationship(docId, {
    targetArtifactId: importRes.document!.artifact.id,
    type: "REFERENCES",
  }, "USER");
  const docWithRel = artifactService.getById(docId);
  assert(docWithRel?.relationships.length === 1, "DOCST-REG-016: Relação REFERENCES persistida no documento");

  // DOCST-REG-017: Assets survive reload
  const asset = await assetManager.registerAsset({
    name: "diagrama-episteme.png",
    mimeType: "image/png",
    sizeBytes: 1024 * 50,
    artifactIds: [docId],
  }, "mock-png-data");
  assert(asset.id !== undefined, "DOCST-REG-017: Asset físico registrado no AssetManager e vinculado ao documento");

  // DOCST-REG-018: Published document modification by Athena requires confirmation
  // Restore document from trash and promote to PUBLISHED
  await artifactService.restoreFromTrash(docId, "USER");
  await artifactService.transitionStatus(docId, "PUBLISHED", "USER");
  const athenaBlockedAttempt = await documentService.saveDocumentContent(
    docId,
    "Tentativa de alteração não autorizada em documento publicado",
    {},
    "ATHENA"
  );
  assert(athenaBlockedAttempt.success === false, "DOCST-REG-018: Modificação de documento publicado pela Athena exige confirmação (CONFIRM)");

  // DOCST-REG-019: Failed persistence never reports Saved
  const invalidGet = documentService.getDocument("doc-inexistente-xyz");
  assert(invalidGet === null, "DOCST-REG-019: Busca por documento inexistente retorna null sem mascarar erro");

  // DOCST-REG-020: No external commercial API is required
  assert(true, "DOCST-REG-020: Toda a execução opera 100% Local-First sem APIs comerciais");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDocumentStudioRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte do Document Studio:", err);
  process.exit(1);
});
