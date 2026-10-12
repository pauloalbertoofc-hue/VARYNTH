import assert from "node:assert/strict";
import { appendPictorConsultation, normalizePictorHistory, parsePictorHistory, PICTOR_HISTORY_LIMIT } from "./pictor-history";

const entry = { id: "1", prompt: "p", response: "r", createdAt: "2026-10-12T00:00:00.000Z" };
assert.equal(normalizePictorHistory([entry, { invalid: true }]).length, 1);
assert.deepEqual(parsePictorHistory("not-json"), []);
assert.equal(appendPictorConsultation(Array.from({ length: PICTOR_HISTORY_LIMIT }, (_, index) => ({ ...entry, id: String(index) })), entry).length, PICTOR_HISTORY_LIMIT);
console.log("Pictor history tests passed: invalid drafts are rejected and retention is bounded.");

