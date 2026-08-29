import { jobManager } from "./job-manager";
import { sandboxRuntime } from "./sandbox-runtime";

async function runJobRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH JOB RUNTIME & SANDBOX REGRESSION (JOB-REG-001..005)  ");
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

  jobManager.resetToSeed();

  // Test JOB-REG-001: Create Job enqueues with QUEUED
  const job = jobManager.createJob({
    type: "RENDER_VIDEO",
    title: "Renderização de Vídeo Educativo #01",
    createdBy: "ATHENA",
    relatedArtifactId: "art-video-001",
  });
  assert(job.status === "QUEUED", "JOB-REG-001: Job criado com status inicial QUEUED");
  assert(job.progress === 0, "JOB-REG-001: Progresso inicial é 0%");
  assert(job.logs.length === 1, "JOB-REG-001: Log inicial registrado");

  // Test JOB-REG-002: Update progress transitions to RUNNING
  jobManager.updateProgress(job.id, 45, "Compilando cenas 1 a 3...");
  const runningJob = jobManager.getById(job.id)!;
  assert(runningJob.status === "RUNNING", "JOB-REG-002: Status transicionou para RUNNING");
  assert(runningJob.progress === 45, "JOB-REG-002: Progresso atualizado para 45%");
  assert(runningJob.logs.length === 2, "JOB-REG-002: Segundo log registrado");

  // Test JOB-REG-003: Complete job
  jobManager.completeJob(job.id, { durationMs: 32000, videoUrl: "/renders/scene.mp4" });
  const completedJob = jobManager.getById(job.id)!;
  assert(completedJob.status === "COMPLETED", "JOB-REG-003: Status finalizado como COMPLETED");
  assert(completedJob.progress === 100, "JOB-REG-003: Progresso é 100%");
  assert(!!completedJob.completedAt, "JOB-REG-003: Data de conclusão registrada");

  // Test JOB-REG-004: Cancel job
  const jobToCancel = jobManager.createJob({
    type: "BUILD_GAME",
    title: "Build de Jogo Experimental",
    createdBy: "USER",
  });
  const cancelSuccess = jobManager.cancelJob(jobToCancel.id);
  assert(cancelSuccess === true, "JOB-REG-004: cancelJob retornou true");
  const cancelledJob = jobManager.getById(jobToCancel.id)!;
  assert(cancelledJob.status === "CANCELLED", "JOB-REG-004: Status atualizado para CANCELLED");

  // Test JOB-REG-005: Sandbox Core Protection Guard
  const safeRun = await sandboxRuntime.executeCodeInSandbox("const x = 10 + 20;", "javascript", "ATHENA");
  assert(safeRun.status === "SUCCESS", "JOB-REG-005: Código seguro executado com sucesso na sandbox");

  const unsafeRun = await sandboxRuntime.executeCodeInSandbox("localStorage.clear();", "javascript", "ATHENA");
  assert(unsafeRun.status === "ERROR", "JOB-REG-005: Tentativa de violação do Core foi bloqueada na Sandbox");
  assert(Boolean(unsafeRun.error?.includes("recursos restritos")), "JOB-REG-005: Mensagem de erro de violação emitida");

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

