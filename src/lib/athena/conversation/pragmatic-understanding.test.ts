import assert from "node:assert/strict";
import { understandPragmatics } from "./pragmatic-understanding";

assert.equal(understandPragmatics("Voltando ao projeto, revise a tese").intent, "SUBSTANTIVE", "returning to a topic is not the same as switching away");
assert.equal(understandPragmatics("Mudando de assunto: e essa proposta?").intent, "TOPIC_SWITCH");
assert.equal(understandPragmatics("Poderia explicar melhor?").intent, "CLARIFICATION_REQUEST");
for (const followUp of ["E aí?", "Mas como?", "Desenvolve", "Pode detalhar?", "Detalhe melhor", "Expanda isso"]) {
  const understood = understandPragmatics(followUp);
  assert.equal(understood.intent, "FOLLOW_UP", `${followUp} should be identified as a contextual continuation`);
  assert.equal(understood.likelyFollowUp, true);
}
assert.equal(understandPragmatics("E aí, tudo bem?").intent, "SUBSTANTIVE", "a greeting must not be mistaken for a contextual continuation");
assert.equal(understandPragmatics("Vc pode explicar melhor?").register, "informal");
assert.equal(understandPragmatics("Poderia, por gentileza, explicar?",).register, "formal");
assert.equal(understandPragmatics("Responda em registro formal.").register, "formal", "an explicit formal style request must set the requested register");
assert.equal(understandPragmatics("Responda de forma informal, por favor.").register, "informal", "an explicit informal style request must set the requested register despite courtesy");
assert.equal(understandPragmatics("Responda em registro formal e informal.").register, undefined, "conflicting explicit register requests remain neutral");
assert.equal(understandPragmatics("Não foi isso; eu quis dizer o prazo").intent, "CORRECTION");
assert.equal(understandPragmatics("Não, eu quis dizer o prazo").intent, "CORRECTION", "natural Portuguese correction phrasing should be recognized");
assert.equal(understandPragmatics("Não, na verdade eu falei da Pesquisa CNJ").intent, "CORRECTION");
for (const correctionText of [
  "Você interpretou como prazo; eu estava falando do período de vigência",
  "Vc leu como uma tarefa, mas era sobre uma recomendação",
  "O senhor tomou isso como pedido de execução, mas eu queria só uma análise",
  "Essa parte ficou invertida: compare os dois cenários",
  "A resposta ficou confusa; eu falava sobre o projeto Rios Vivos",
]) assert.equal(understandPragmatics(correctionText).intent, "CORRECTION", `${correctionText} should be recognized as a correction`);
assert.equal(understandPragmatics("A resposta ficou confusa").intent, "SUBSTANTIVE", "a complaint without a corrected meaning is not enough to infer the user's intent");
assert.equal(understandPragmatics("Na verdade, gostei do resultado").intent, "SUBSTANTIVE", "a discourse marker alone should not be mistaken for a correction");
assert.equal(understandPragmatics("Resuma em poucas palavras").requestedVerbosity, "concise");
assert.equal(understandPragmatics("Explique passo a passo").requestedVerbosity, "detailed");
assert.ok(understandPragmatics("isso").confidence < 0.5, "underspecified fragments must remain explicitly uncertain");
console.log("Athena pragmatic-understanding tests passed: intent, colloquial/formal register, corrections, brevity and uncertainty.");
