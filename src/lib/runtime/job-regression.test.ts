import { jobManager } from "./job-manager";
import { studioRoadmapManager } from "./studio-roadmap";
import { artifactService } from "../artifacts/artifact-service";

async function runJobRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH UNIVERSAL JOB REGRESSION SUITE (JOB-REG-001..015)     ");
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

  // JOB-REG-001: Create Job in QUEUED status
  const job = jobManager.createJob({
    type: "RENDER_VIDEO",
    title: "Renderização do Episódio 01",
    priority: "HIGH",
    createdBy: "USER",
  });
  assert(job.status === "QUEUED", "JOB-REG-001: Job criado nasce em status QUEUED");
  assert(job.priority === "HIGH", "JOB-REG-001: Prioridade HIGH configurada");
  assert(job.progress === 0, "JOB-REG-001: Progresso inicial é 0%");

  // JOB-REG-002: Start job transitions to RUNNING
  const started = jobManager.startJob(job.id);
  assert(started === true, "JOB-REG-002: startJob retornou true");
  const runningJob = jobManager.getById(job.id);
  assert(runningJob?.status === "RUNNING", "JOB-REG-002: Status atualizado para RUNNING");

  // JOB-REG-003: Update progress and logging
  jobManager.updateProgress(job.id, 45, "Cenas 1 a 4 renderizadas");
  const progressJob = jobManager.getById(job.id);
  assert(progressJob?.progress === 45, "JOB-REG-003: Progresso atualizado para 45%");
  assert(!!progressJob?.logs.some((l) => l.message.includes("Cenas 1 a 4")), "JOB-REG-003: Mensagem de log registrada");

  // JOB-REG-005: Checkpoint system
  const checkpoint = jobManager.saveCheckpoint(job.id, "Metade da Renderização", 50, { renderedScenes: 5 });
  assert(checkpoint !== null && checkpoint.progress === 50, "JOB-REG-005: Checkpoint de segurança registrado com progresso 50%");
  const jobWithCheckpoint = jobManager.getById(job.id);
  assert(jobWithCheckpoint?.checkpoints.length === 1, "JOB-REG-005: Checkpoint persistido no histórico do Job");

  // JOB-REG-004: Complete job transitions to COMPLETED at 100%
  const completed = jobManager.completeJob(job.id, { outputUrl: "/assets/render.mp4" });
  assert(completed === true, "JOB-REG-004: completeJob executado");
  const finishedJob = jobManager.getById(job.id);
  assert(finishedJob?.status === "COMPLETED" && finishedJob.progress === 100, "JOB-REG-004: Status COMPLETED com progresso 100%");

  // JOB-REG-006: Fail job transitions to FAILED with structured error
  const failJob = jobManager.createJob({
    type: "BUILD_GAME",
    title: "Compilação de Jogo WebGL",
    createdBy: "USER",
  });
  jobManager.startJob(failJob.id);
  jobManager.failJob(failJob.id, {
    code: "BUILD_ERROR",
    message: "Falta de memória no compilador",
    recoverable: true,
  });
  const failedJobObj = jobManager.getById(failJob.id);
  assert(failedJobObj?.status === "FAILED", "JOB-REG-006: Status atualizado para FAILED");
  assert(failedJobObj?.error?.code === "BUILD_ERROR", "JOB-REG-006: Erro estruturado gravado");

  // JOB-REG-008: Retry job reenqueues
  const retried = jobManager.retryJob(failJob.id);
  assert(retried !== null && retried.status === "QUEUED", "JOB-REG-008: retryJob reenfileirou a tarefa como QUEUED");
  assert(retried?.retryCount === 1, "JOB-REG-008: Contador de retry incrementado para 1");

  // JOB-REG-007: Cancel job
  const cancelJob = jobManager.createJob({
    type: "EXPORT_BACKUP",
    title: "Backup Manual Completo",
    createdBy: "USER",
  });
  jobManager.startJob(cancelJob.id);
  const cancelled = jobManager.cancelJob(cancelJob.id, "Cancelamento solicitado pelo usuário");
  assert(cancelled === true, "JOB-REG-007: cancelJob executado com sucesso");
  const cancelledObj = jobManager.getById(cancelJob.id);
  assert(cancelledObj?.status === "CANCELLED", "JOB-REG-007: Status atualizado para CANCELLED");

  // JOB-REG-009: Interruption detection and recovery
  const orphanJob = jobManager.createJob({
    type: "BATCH_INDEX_VECTOR",
    title: "Indexação Semântica do Vault",
  });
  jobManager.startJob(orphanJob.id);
  // Simulating recovery upon crash / reload
  const recoveredCount = jobManager.recoverInterruptedJobs();
  assert(recoveredCount > 0, "JOB-REG-009: Detector de interrupção identifica jobs ativos na inicialização");
  const recoveredJob = jobManager.getById(orphanJob.id);
  assert(recoveredJob?.status === "INTERRUPTED", "JOB-REG-009: Job interrompido marcado como INTERRUPTED sem travar");

  // JOB-REG-010: Studio Roadmap order and readiness
  const studios = studioRoadmapManager.listStudios();
  assert(studios.length === 6, "JOB-REG-010: Roadmap contém exatamente os 6 Studios planejados");
  assert(studios[0].name === "Document Studio" && studios[0].order === 1, "JOB-REG-010: Document Studio é o 1º na ordem intencional");
  assert(studios[5].name === "Game Studio" && studios[5].order === 6, "JOB-REG-010: Game Studio é o 6º na ordem intencional");

  // JOB-REG-015: Studio Readiness report evaluates missing engines
  const docReport = studioRoadmapManager.getStudioReadinessReport("document-studio");
  assert(docReport.readyForImplementation === true, "JOB-REG-015: Document Studio possui prontidão completa para implementação");
  const videoReport = studioRoadmapManager.getStudioReadinessReport("video-studio");
  assert(videoReport.readyForImplementation === true, "JOB-REG-015: Video Studio possui prontidão completa com local-video-engine");
  const gameReport = studioRoadmapManager.getStudioReadinessReport("game-studio");
  assert(gameReport.readyForImplementation === false, "JOB-REG-015: Game Studio reporta corretamente falta de engine de jogos local");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runJobRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte de jobs:", err);
  process.exit(1);
});
