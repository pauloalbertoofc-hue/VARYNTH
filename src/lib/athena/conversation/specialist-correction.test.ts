import assert from "node:assert/strict";
import { resolveSpecialistCorrection } from "./specialist-correction";

const turns = [{ role: "user" as const, text: "pedido anterior" }, { role: "athena" as const, text: "resposta do especialista" }];
assert.deepEqual(resolveSpecialistCorrection("Explique o tema", turns, "logos"), { kind: "continue", prompt: "Explique o tema" });
assert.equal(resolveSpecialistCorrection("corrija a resposta", turns, "logos").kind, "clarify", "A retry without feedback must not invent a correction");
const correction = resolveSpecialistCorrection("tente novamente", turns, "logos", { category: "MISUNDERSTOOD", correction: "Separe evidência, inferência e hipótese" });
assert.deepEqual(correction, { kind: "continue", prompt: "Separe evidência, inferência e hipótese", repaired: true });
const wrongAction = resolveSpecialistCorrection("refaça", turns, "strategos", { category: "WRONG_ACTION" });
assert.equal(wrongAction.kind, "clarify");
if (wrongAction.kind === "clarify") assert.match(wrongAction.response, /não vou repeti-la nem executá-la/);
const noFeedback = resolveSpecialistCorrection("não foi isso", turns, "justitia");
assert.equal(noFeedback.kind, "clarify");
if (noFeedback.kind === "clarify") assert.match(noFeedback.response, /Qual parte/);
console.log("Specialist repair requires agent-scoped explicit feedback and never retries a wrong action blindly.");
