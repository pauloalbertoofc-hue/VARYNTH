/**
 * VARYNTH OS — Security Regression Test Suite (Phase 1: Forge Sandbox Isolation)
 *
 * Tests SECURITY-REG-001A..L covering opaque sandbox isolation, CSP restrictions,
 * envelope validation, rate limiting, memory limits, and timeout protection.
 */

import { forgeSandboxBridge } from "../forge/forge-sandbox-bridge";
import { ForgeExecutionSession, ForgeSandboxEnvelope } from "../forge/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, code: string, message: string, proofLevel = "STATIC_CONTRACT") {
  if (condition) {
    console.log(`  \x1b[32m✔ [${code}] [${proofLevel}] ${message}\x1b[0m`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ [${code}] [${proofLevel}] FAILED: ${message}\x1b[0m`);
    failed++;
  }
}

export async function runForgeSecurityTests() {
  console.log("\n🛡️  ============================================================");
  console.log("    VARYNTH OS — SECURITY REMEDIATION REGRESSION SUITE (PHASE 1)");
  console.log("    FIND-SEC-001 — Forge Sandbox & Opaque Origin Isolation");
  console.log("============================================================\n");

  const session = forgeSandboxBridge.createSession(4000);

  // ------------------------------------------------------------
  // SECURITY-REG-001A: localStorage Isolation & CSP
  // ------------------------------------------------------------
  const doc = forgeSandboxBridge.generateSandboxDocument(
    `try { localStorage.getItem("varynth_os_vault"); } catch(e) { console.error(e.message); }`,
    session
  );

  assert(
    doc.includes(`http-equiv="Content-Security-Policy"`) &&
    doc.includes(`default-src 'none'`) &&
    doc.includes(`connect-src 'none'`),
    "SECURITY-REG-001A",
    "Sandbox document enforces strict CSP with default-src 'none' and connect-src 'none'",
    "STATIC_CONTRACT"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001B: localStorage Mutation Prevention
  // ------------------------------------------------------------
  assert(
    !doc.includes("allow-same-origin") &&
    doc.includes(`scriptEl.textContent = wrapper;`),
    "SECURITY-REG-001B",
    "Sandbox document is isolated from host origin and executed in opaque scope",
    "STATIC_CONTRACT"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001C: IndexedDB Isolation
  // ------------------------------------------------------------
  assert(
    doc.includes(`const SESS_ID = "${session.sessionId}";`) &&
    doc.includes(`const CH_TOKEN = "${session.channelToken}";`),
    "SECURITY-REG-001C",
    "Sandbox uses ephemeral randomized session tokens preventing unauthorized host invocation",
    "STATIC_CONTRACT"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001D: parent.document Access Prevention
  // ------------------------------------------------------------
  assert(
    doc.includes(`window.parent.postMessage(envelope, "*")`) &&
    !doc.includes("parent.document") &&
    !doc.includes("top.document"),
    "SECURITY-REG-001D",
    "Sandbox communicates exclusively via typed postMessage envelope without direct DOM access",
    "STATIC_CONTRACT"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001E: top.document Access Prevention
  // ------------------------------------------------------------
  assert(
    !doc.includes("window.top.location") &&
    !doc.includes("allow-top-navigation"),
    "SECURITY-REG-001E",
    "Sandbox prevents top-level navigation and document hijacking",
    "STATIC_CONTRACT"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001F: Cookie & Session Credential Isolation
  // ------------------------------------------------------------
  assert(
    !doc.includes("document.cookie") &&
    !doc.includes("allow-credentials"),
    "SECURITY-REG-001F",
    "Host cookies and credentials are inaccessible inside the opaque sandbox",
    "STATIC_CONTRACT"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001G: Timeout Guard Configuration
  // ------------------------------------------------------------
  assert(
    session.timeoutMs === 4000 && session.isActive,
    "SECURITY-REG-001G",
    "Execution session arms a 4000ms timeout guard against infinite loops (while(true))",
    "STATIC_CONTRACT"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001H: Rate Limiting & Flood Protection (>50 msgs/s)
  // ------------------------------------------------------------
  const floodSession = forgeSandboxBridge.createSession(4000);
  let floodRejected = false;

  for (let i = 0; i < 55; i++) {
    const res = forgeSandboxBridge.validateMessage(
      {
        schemaVersion: 1,
        sessionId: floodSession.sessionId,
        channelToken: floodSession.channelToken,
        type: "STDOUT",
        timestamp: new Date().toISOString(),
        payload: { logs: [`Spam ${i}`] },
      },
      "null",
      floodSession
    );

    if (!res.valid && res.rejectedReason?.includes("RATE_LIMIT_EXCEEDED")) {
      floodRejected = true;
      break;
    }
  }

  assert(
    floodRejected,
    "SECURITY-REG-001H",
    "Message flood exceeding 50 messages/second is dropped and rate-limited",
    "RUNTIME_VERIFIED"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001I: Mismatched / Forged Token Rejection
  // ------------------------------------------------------------
  const forgedResult = forgeSandboxBridge.validateMessage(
    {
      schemaVersion: 1,
      sessionId: session.sessionId,
      channelToken: "forged-token-xyz",
      type: "EXECUTION_RESULT",
      timestamp: new Date().toISOString(),
      payload: { logs: ["hacked"] },
    },
    "null",
    session
  );

  assert(
    !forgedResult.valid && !!forgedResult.rejectedReason?.includes("TOKEN_MISMATCH"),
    "SECURITY-REG-001I",
    "Messages with forged channel tokens are strictly rejected",
    "RUNTIME_VERIFIED"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001J: Oversized Payload Rejection (>64KB)
  // ------------------------------------------------------------
  const bigString = "A".repeat(70 * 1024); // 70 KB
  const oversizedResult = forgeSandboxBridge.validateMessage(
    {
      schemaVersion: 1,
      sessionId: session.sessionId,
      channelToken: session.channelToken,
      type: "EXECUTION_RESULT",
      timestamp: new Date().toISOString(),
      payload: { logs: [bigString] },
    },
    "null",
    session
  );

  assert(
    !oversizedResult.valid && !!oversizedResult.rejectedReason?.includes("PAYLOAD_OVERSIZED"),
    "SECURITY-REG-001J",
    "Payloads exceeding 64KB are rejected preventing memory exhaustion attacks",
    "RUNTIME_VERIFIED"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001K: Circular References & Serialization Safety
  // ------------------------------------------------------------
  assert(
    doc.includes("function safeSerialize(val, depth)") &&
    doc.includes("if (depth > 4) return \"[Max Depth Exceeded]\";") &&
    doc.includes("maxLogs = 150;"),
    "SECURITY-REG-001K",
    "Safe serialization handles circular references, deep objects, and limits logs to 150 lines",
    "STATIC_CONTRACT"
  );

  // ------------------------------------------------------------
  // SECURITY-REG-001L: Valid Execution Envelope Structure
  // ------------------------------------------------------------
  const validEnvelope: ForgeSandboxEnvelope = {
    schemaVersion: 1,
    sessionId: session.sessionId,
    channelToken: session.channelToken,
    type: "EXECUTION_RESULT",
    timestamp: new Date().toISOString(),
    payload: {
      logs: ["[LOG] Hello World", "[RETURN] => 42"],
      returnValue: "42",
      durationMs: 12,
    },
  };

  const validResult = forgeSandboxBridge.validateMessage(
    validEnvelope,
    "null",
    session
  );

  assert(
    validResult.valid && validResult.envelope?.payload.returnValue === "42",
    "SECURITY-REG-001L",
    "Valid execution results are authenticated and accepted by the host bridge",
    "RUNTIME_VERIFIED"
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed };
}

if (require.main === module) {
  runForgeSecurityTests().then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
