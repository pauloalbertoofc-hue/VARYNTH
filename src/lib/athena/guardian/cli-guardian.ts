import { documentationGuardian } from "./documentation-guardian";

async function runGuardianCli() {
  console.log("\n===============================================================");
  console.log("  VARYNTH OS — DOCUMENTATION GUARDIAN & DRIFT INSPECTOR        ");
  console.log("===============================================================\n");

  const report = documentationGuardian.assessHealth();

  console.log(`📊 DOCUMENTATION HEALTH SCORE: ${report.score}% [${report.status}]`);
  console.log(`⏰ Timestamp da Auditoria:     ${report.timestamp}\n`);

  console.log("---------------------------------------------------------------");
  console.log("  SUBSISTEMAS AUDITADOS                                        ");
  console.log("---------------------------------------------------------------");

  Object.entries(report.subsystems).forEach(([key, sub]) => {
    const icon = sub.status === "SYNCED" ? "✅" : "⚠️";
    console.log(`  ${icon} [${sub.status}] ${sub.name.padEnd(38)} (${sub.totalDocumented}/${sub.totalActual} docs)`);
    if (sub.issues.length > 0) {
      sub.issues.forEach((issue) => console.log(`     └─ Alerta: ${issue}`));
    }
  });

  console.log("\n---------------------------------------------------------------");
  console.log("  CONTRATOS DE RUNTIME VERIFICADOS                             ");
  console.log("---------------------------------------------------------------");
  console.log(`  • Rotas Next.js 16 (App Router):  ${report.runtimeAudits.totalRoutes} rotas ativas`);
  console.log(`  • Action Layer Determinística:     ${report.runtimeAudits.totalTools} ferramentas registradas`);
  console.log(`  • Conselho de Especialistas:      ${report.runtimeAudits.totalAgents} agentes autônomos`);
  console.log(`  • Módulos Especializados:         ${report.runtimeAudits.totalModules} módulos no ecossistema`);
  console.log(`  • Architecture Decision Records:  ${report.runtimeAudits.totalADRs} ADRs aceitos`);
  console.log(`  • Suíte Histórica de Regressão:   ${report.runtimeAudits.totalRegressionTests} testes automatizados`);
  console.log(`  • Lições de Engenharia:           ${report.runtimeAudits.totalLessons} lições auditadas`);

  const pending = documentationGuardian.listPendingReviews();
  console.log("\n---------------------------------------------------------------");
  console.log(`  FILA DE REVISÃO HUMANA (PENDING REVIEWS): ${pending.length} itens`);
  console.log("---------------------------------------------------------------");

  if (pending.length === 0) {
    console.log("  Zero itens pendentes de revisão.");
  } else {
    pending.forEach((p) => {
      console.log(`  ⏳ [${p.type}] ${p.title}`);
      console.log(`     └─ Alvo: ${p.targetDocument} | Evidência: ${p.sourceEvidence}`);
    });
  }

  console.log("\n===============================================================");
  if (report.score === 100) {
    console.log("🎉 DOCUMENTAÇÃO 100% SINCRONIZADA: Zero drift detectado.");
  } else {
    console.log("⚠️ ATENÇÃO: Foram identificadas divergências documentais.");
  }
  console.log("===============================================================\n");
}

runGuardianCli().catch((err) => {
  console.error("Erro fatal no Documentation Guardian:", err);
  process.exit(1);
});
