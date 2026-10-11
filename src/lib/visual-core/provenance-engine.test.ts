import { strict as assert } from "node:assert";
import { provenanceSummary, validateProvenance } from "./provenance-engine";

const entries = [{ id: "a", operation: "CAPTURE" as const, description: "camera", actor: "DEVICE" as const, createdAt: "2026-01-01T00:00:00.000Z" }];
assert.equal(validateProvenance(entries).valid, true);
assert.equal(provenanceSummary(entries).total, 1);
assert.equal(validateProvenance([...entries, { ...entries[0] }]).error, "DUPLICATE_PROVENANCE_ID");
console.log("Provenance engine tests passed: chain ordering and summaries.");

