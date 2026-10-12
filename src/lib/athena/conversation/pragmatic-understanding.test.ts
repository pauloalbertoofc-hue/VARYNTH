import assert from "node:assert/strict";
import { understandPragmatics } from "./pragmatic-understanding";

assert.equal(understandPragmatics("Voltando ao projeto, revise a tese").intent, "SUBSTANTIVE", "returning to a topic is not the same as switching away");
assert.equal(understandPragmatics("Mudando de assunto: e essa proposta?").intent, "TOPIC_SWITCH");
for (const switchPhrase of [
  "Deixa eu mudar de assunto: como funciona o Music?",
  "Vamos mudar de assunto rapidinho: preciso revisar um contrato",
  "Passando para outro assunto, explique o projeto VARYNTH",
  "Tratemos de outro tema: literatura brasileira",
  "Agora vamos falar de planejamento semanal",
  "Mudando de tópico: quero entender o Vault",
]) {
  const understood = understandPragmatics(switchPhrase);
  assert.equal(understood.intent, "TOPIC_SWITCH", `${switchPhrase} should explicitly detach the new request from the prior topic`);
  assert.equal(understood.explicitTopicSwitch, true);
  assert.equal(understood.likelyFollowUp, false);
}
assert.equal(understandPragmatics("Falando nisso, quais os riscos?").intent, "SUBSTANTIVE", "a related transition must not be mistaken for an explicit topic switch");
assert.equal(understandPragmatics("Poderia explicar melhor?").intent, "CLARIFICATION_REQUEST");
for (const followUp of ["E aí?", "Mas como?", "Desenvolve", "Pode detalhar?", "Detalhe melhor", "Expanda isso"]) {
  const understood = understandPragmatics(followUp);
  assert.equal(understood.intent, "FOLLOW_UP", `${followUp} should be identified as a contextual continuation`);
  assert.equal(understood.likelyFollowUp, true);
}
for (const followUp of ["E os riscos?", "Mas e o custo estimado?", "E os critérios de avaliação?"]) {
  const understood = understandPragmatics(followUp);
  assert.equal(understood.intent, "FOLLOW_UP", `${followUp} should preserve the prior subject while introducing an elliptical detail question`);
  assert.equal(understood.likelyFollowUp, true);
}
for (const followUp of ["E aí, como ficou?", "E aí, como saiu?", "E no meu caso?", "Como ficaria isso para mim?", "Na prática, como fica isso?", "Deu certo?"]) {
  const understood = understandPragmatics(followUp);
  assert.equal(understood.intent, "FOLLOW_UP", `${followUp} should preserve the active task as its referent`);
  assert.equal(understood.likelyFollowUp, true);
}
assert.equal(understandPragmatics("E se falarmos de literatura brasileira?").likelyFollowUp, false, "a named new subject introduced after 'E se' remains independent");
for (const followUp of ["E se o prazo mudar?", "Mas e se houver atraso?", "No caso de uma revisão, o que muda?", "Como fica no caso de dados incompletos?", "Isso também se aplica ao segundo cenário?", "Isso vale para os outros módulos?"]) {
  const understood = understandPragmatics(followUp);
  assert.equal(understood.intent, "FOLLOW_UP", `${followUp} should be recognized as a conditional or applicability continuation`);
  assert.equal(understood.likelyFollowUp, true);
}
for (const newTopic of ["E literatura brasileira?", "E o projeto Rios Vivos?", "Mas e Athena?", "E a música clássica?"]) {
  assert.equal(understandPragmatics(newTopic).intent, "SUBSTANTIVE", `${newTopic} names a new subject and must not inherit the previous topic`);
}
assert.equal(understandPragmatics("E aí, tudo bem?").intent, "SUBSTANTIVE", "a greeting must not be mistaken for a contextual continuation");
assert.equal(understandPragmatics("Vc pode explicar melhor?").register, "informal");
assert.equal(understandPragmatics("Poderia, por gentileza, explicar?",).register, "formal");
assert.equal(understandPragmatics("Responda em registro formal.").register, "formal", "an explicit formal style request must set the requested register");
assert.equal(understandPragmatics("Responda de forma informal, por favor.").register, "informal", "an explicit informal style request must set the requested register despite courtesy");
assert.equal(understandPragmatics("Responda em registro formal e informal.").register, undefined, "conflicting explicit register requests remain neutral");
assert.equal(understandPragmatics("Não foi isso; eu quis dizer o prazo").intent, "CORRECTION");
for (const correction of [
  "Não pedi para você executar; pedi uma análise",
  "Não quero que edite o arquivo, só explique o que mudaria",
  "Não foi isso, eu queria saber o prazo, mas você respondeu sobre o custo",
  "Não solicitei uma revisão; solicitei uma comparação",
]) assert.equal(understandPragmatics(correction).intent, "CORRECTION", `${correction} should be recognized as an explicit contrastive correction`);
for (const negation of ["Não quero que você execute", "Não, obrigado", "Não gostei do resultado"]) {
  assert.notEqual(understandPragmatics(negation).intent, "CORRECTION", `${negation} is not by itself a correction with a replacement intent`);
}
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
