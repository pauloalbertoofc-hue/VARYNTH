import { runConversationalTestSuite } from "./conversational-suite";

console.log("==================================================");
console.log("  VARYNTH OS — ATHENA CONVERSATIONAL TEST SUITE   ");
console.log("==================================================\n");

const results = runConversationalTestSuite();
let passed = 0;
let failed = 0;

for (const res of results) {
  if (res.passed) {
    console.log(`✅ [PASS] ${res.name}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${res.name} -> ${res.details}`);
    failed++;
  }
}

console.log("\n==================================================");
console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

