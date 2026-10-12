import assert from "node:assert/strict";
import { resolveSpecialistCorrection } from "./specialist-correction";

const turns = [{ role: "user" as const, text: "pedido anterior" }, { role: "athena" as const, text: "resposta do especialista" }];
assert.deepEqual(resolveSpecialistCorrection("Explique o tema", turns, "logos"), { kind: "continue", prompt: "Explique o tema" });
const naturalCorrection = resolveSpecialistCorrection("Não foi isso; eu quis dizer o prazo", turns, "justitia");
assert.deepEqual(naturalCorrection, { kind: "continue", prompt: "Não foi isso; eu quis dizer o prazo", repaired: true }, "a detailed natural-language correction should rerun the selected specialist with the user's actual correction");
const naturalCorrectionWithStoredFeedback = resolveSpecialistCorrection("Não, eu quis dizer o prazo", turns, "justitia", { category: "MISUNDERSTOOD", correction: "Uma correção antiga" });
assert.deepEqual(naturalCorrectionWithStoredFeedback, { kind: "continue", prompt: "Não, eu quis dizer o prazo", repaired: true }, "the latest explicit correction should outrank a stored correction for the same reply");
for (const correctionText of [
  "Você interpretou como prazo; eu estava falando do período de vigência",
  "Vc leu como uma tarefa, mas era sobre uma recomendação",
  "O senhor tomou isso como pedido de execução, mas eu queria só uma análise",
  "Essa parte ficou invertida: compare os dois cenários",
]) {
  assert.deepEqual(
    resolveSpecialistCorrection(correctionText, turns, "justitia"),
    { kind: "continue", prompt: correctionText, repaired: true },
    `A clear user correction should be forwarded intact, not reduced to a generic retry: ${correctionText}`,
  );
}
assert.equal(resolveSpecialistCorrection("A resposta ficou confusa", turns, "justitia").kind, "clarify", "a correction without the intended meaning must ask what to fix");
assert.deepEqual(resolveSpecialistCorrection("A resposta ficou confusa; eu falava sobre o projeto Rios Vivos", turns, "justitia"), { kind: "continue", prompt: "A resposta ficou confusa; eu falava sobre o projeto Rios Vivos", repaired: true }, "a complaint followed by the intended meaning should be applied as a correction");
assert.equal(resolveSpecialistCorrection("Corrigindo", turns, "justitia").kind, "clarify", "a correction marker without its corrected content must ask a focused question");
assert.equal(resolveSpecialistCorrection("Não foi isso; eu quis dizer o prazo", [], "justitia").kind, "continue", "a correction-shaped first message must not be treated as feedback about a nonexistent answer");
assert.equal(resolveSpecialistCorrection("Não foi isso; eu quis dizer o prazo", turns, "strategos", { category: "WRONG_ACTION" }).kind, "clarify", "a correction must not automatically retry after an explicitly wrong action");
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
