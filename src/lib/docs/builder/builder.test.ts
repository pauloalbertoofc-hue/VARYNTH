import { documentationBuilder } from "./documentation-builder";

async function runBuilderTests() {
  console.log("\n===============================================================");
  console.log("  TEST SUITE: VARYNTH DOCUMENTATION BUILDER & EXPORTER        ");
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

  // 1. COMPLETE_HANDBOOK Generation
  const handbook = documentationBuilder.buildPublication("COMPLETE_HANDBOOK", "PUBLIC_SAFE");
  assert(handbook.chapters.length > 0, "Handbook possui capítulos estruturados");
  assert(handbook.tableOfContents.length === handbook.chapters.length, "TOC possui o mesmo número de capítulos");
  assert(handbook.metadata.healthScore === 100, "Metadata registra saúde documental de 100%");
  assert(handbook.metadata.profile === "PUBLIC_SAFE", "Perfil configurado para PUBLIC_SAFE");

  // 2. ATHENA_MANUAL Generation
  const athenaManual = documentationBuilder.buildPublication("ATHENA_MANUAL", "PUBLIC_SAFE");
  assert(athenaManual.chapters.length > 0, "Manual da Athena gerado com sucesso");
  assert(athenaManual.metadata.title.includes("Athena"), "Título do Manual da Athena está correto");

  // 3. ADRS_COMPENDIUM Generation
  const adrPub = documentationBuilder.buildPublication("ADRS_COMPENDIUM", "INTERNAL");
  assert(adrPub.chapters.length === 6, "Compêndio de ADRs contém todos os 6 ADRs aceitos");
  assert(adrPub.metadata.profile === "INTERNAL", "Perfil INTERNAL configurado no Compêndio de ADRs");

  // 4. HISTORY_AND_LESSONS Generation
  const historyPub = documentationBuilder.buildPublication("HISTORY_AND_LESSONS", "PUBLIC_SAFE");
  assert(historyPub.chapters.length === 4, "Compêndio de Lições contém as 4 lições documentadas");

  // 5. CURRENT_COMPONENT Generation
  const compPub = documentationBuilder.buildPublication("CURRENT_COMPONENT", "PUBLIC_SAFE", "ath-conv-mgr");
  assert(compPub.chapters.length === 1, "Exportação de componente único gera 1 capítulo");
  assert(compPub.chapters[0].title.includes("ConversationManager"), "Título do componente corresponde ao selecionado");

  // 6. Markdown Export
  const md = documentationBuilder.exportToMarkdown(handbook);
  assert(md.includes("# VARYNTH OS"), "Markdown exportado contém título principal");
  assert(md.includes("## 📑 Sumário Executivo"), "Markdown exportado contém sumário");
  assert(md.includes("## 1."), "Markdown exportado possui capítulos numerados");

  // 7. HTML / Print-ready PDF Export
  const html = documentationBuilder.exportToHtml(handbook);
  assert(html.includes("<!DOCTYPE html>"), "HTML exportado é um documento autossuficiente completo");
  assert(html.includes("@media print"), "HTML exportado contém regras de estilo para PDF/Impressão");
  assert(html.includes('class="cover"'), "HTML exportado possui capa editorial estruturada");
  assert(html.includes('class="toc"'), "HTML exportado possui sumário visual estruturado");

  // 8. Public-Safe Sanitization Check
  const sampleWithWindowsPath = "Ref: C:\\Users\\paulo\\new\\varynth\\src\\lib\\athena";
  const sanitized = (documentationBuilder as any).sanitizeContent(sampleWithWindowsPath, "PUBLIC_SAFE");
  assert(!sanitized.includes("C:\\Users\\paulo"), "Sanitização PUBLIC-SAFE removeu caminhos locais absolutos");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runBuilderTests().catch((err) => {
  console.error("Erro fatal nos testes do DocumentationBuilder:", err);
  process.exit(1);
});

