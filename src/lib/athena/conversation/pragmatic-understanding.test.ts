import assert from "node:assert/strict";
import { understandPragmatics } from "./pragmatic-understanding";

assert.equal(understandPragmatics("Voltando ao projeto, revise a tese").intent, "SUBSTANTIVE", "returning to a topic is not the same as switching away");
assert.equal(understandPragmatics("Mudando de assunto: e essa proposta?").intent, "TOPIC_SWITCH");
assert.equal(understandPragmatics("Poderia explicar melhor?").intent, "CLARIFICATION_REQUEST");
assert.equal(understandPragmatics("Vc pode explicar melhor?").register, "informal");
assert.equal(understandPragmatics("Poderia, por gentileza, explicar?",).register, "formal");
assert.equal(understandPragmatics("Não foi isso; eu quis dizer o prazo").intent, "CORRECTION");
assert.equal(understandPragmatics("Resuma em poucas palavras").requestedVerbosity, "concise");
assert.equal(understandPragmatics("Explique passo a passo").requestedVerbosity, "detailed");
assert.ok(understandPragmatics("isso").confidence < 0.5, "underspecified fragments must remain explicitly uncertain");
console.log("Athena pragmatic-understanding tests passed: intent, colloquial/formal register, corrections, brevity and uncertainty.");
