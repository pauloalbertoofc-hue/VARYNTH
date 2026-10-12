import assert from "node:assert/strict";
import { PermissionPolicyEngine } from "@/lib/permissions/permission-policy";
import { authorizeEuterpeProposal, euterpeManifest, interpretEuterpeRequest } from "./euterpe";

const context = { track: { id: "t1", name: "Noite", artist: "X" }, dna: { trackId: "t1", schemaVersion: 2 as const, status: "PARTIAL" as const, visualTags: ["dark"], intensity: 0.2, calmness: 0.8 }, preferences: [], memories: [] };
const proposal = interpretEuterpeRequest("Faça o visual da faixa escuro", context);
assert.equal(proposal.proposal?.kind, "visual-profile");
assert.equal(euterpeManifest.id, "euterpe");
const policy = new PermissionPolicyEngine();
const decision = authorizeEuterpeProposal(policy, proposal.proposal!);
assert.equal(decision.policy, "CONFIRM");
assert.equal(authorizeEuterpeProposal(policy, { kind: "preference", key: "x", value: "jazz" }).policy, "CONFIRM");
const answer = interpretEuterpeRequest("Oi", context).response;
assert.match(answer, /Euterpe/); assert.match(answer, /Noite/);
const broadVisual = interpretEuterpeRequest("Quero uma atmosfera cinematográfica quente", context);
assert.equal(broadVisual.proposal?.kind, "visual-profile", "Broader visual language should create a reviewable proposal");
const memoryAware = interpretEuterpeRequest("Que estilo combina comigo?", { ...context, preferences: [{ id: "p1", key: "style", value: "jazz", confidence: 1, source: "explicit", updatedAt: "2026-09-22" }], memories: [{ id: "m1", kind: "favorite", value: "trilhas instrumentais", createdAt: "2026-09-22" }] });
assert.match(memoryAware.response, /jazz, trilhas instrumentais/, "Euterpe should use both scoped preference and music-memory context");
const conversational = interpretEuterpeRequest("Por quê?", context, [{ sender: "user", text: "Analise a faixa" }, { sender: "curator", text: "A faixa Noite tem tags dark no Music DNA." }, { sender: "user", text: "Por quê?" }]);
assert.match(conversational.response, /retomando|Music DNA/, "Follow-ups should use the immediate conversation rather than generic boilerplate");
assert.doesNotMatch(conversational.response, /A faixa Noite tem tags dark no Music DNA\./, "A follow-up must explain rather than repeat the prior answer");
const hypotheticalTrackFollowUp = interpretEuterpeRequest("E se a faixa fosse mais lenta?", context, [
  { sender: "user", text: "O que acha dessa faixa?" },
  { sender: "curator", text: "O Music DNA registra tags dark, intensidade 20% e calmaria 80%." },
  { sender: "user", text: "E se a faixa fosse mais lenta?" },
]);
assert.match(hypotheticalTrackFollowUp.response, /como hipótese, não como algo que observei ou testei/i);
assert.match(hypotheticalTrackFollowUp.response, /intensidade 20% e calmaria 80%/i, "A hypothetical must preserve the actual current-track evidence separately");
assert.match(hypotheticalTrackFollowUp.response, /previsão, não um resultado/i, "An untested musical change must not be presented as an observed outcome");
for (const question of ["E aí, como ficou?", "Deu certo?"]) {
  const outcome = interpretEuterpeRequest(question, context, [
    { sender: "user", text: "Faça uma capa escura" },
    { sender: "curator", text: "Posso preparar uma proposta visual revisável." },
    { sender: "user", text: question },
  ]);
  assert.match(outcome.response, /não consigo confirmar.*proposta anterior foi aplicada/i, `${question} must not imply a proposal was applied`);
  assert.match(outcome.response, /não são uma comparação antes\/depois/i, "Current DNA must not be presented as causal evidence");
}
const whyVisual = interpretEuterpeRequest("Por quê?", context, [{ sender: "user", text: "Faça uma capa escura" }, { sender: "curator", text: "Posso preparar uma proposta visual." }, { sender: "user", text: "Por quê?" }]);
assert.match(whyVisual.response, /Faça uma capa escura/, "Why questions should cite the preceding user request, not themselves");
assert.doesNotMatch(whyVisual.response, /Por quê\?/i);
const unsupportedFollowUp = interpretEuterpeRequest("Fala mais", { ...context, dna: undefined }, [{ sender: "user", text: "Descreva a faixa" }, { sender: "curator", text: "Ainda não há dados." }, { sender: "user", text: "Fala mais" }]);
assert.match(unsupportedFollowUp.response, /não recebi Music DNA/i, "Continuation without evidence must preserve the acoustic knowledge boundary");
const unsupportedListening = interpretEuterpeRequest("Analise a faixa", { ...context, dna: undefined });
assert.match(unsupportedListening.response, /não vou fingir que ouvi/i, "No acoustic facts should be fabricated without analysis data");
const colloquialTrackFollowUp = interpretEuterpeRequest("E essa? O que acha?", context);
assert.match(colloquialTrackFollowUp.response, /Noite.*X/);
assert.match(colloquialTrackFollowUp.response, /parcial.*dark.*20%.*80%/i, "A response should use the current track's provided DNA with its limitations");
assert.match(colloquialTrackFollowUp.response, /não identificam.*gênero.*instrumentos.*letra/i, "DNA intensity/tags must not be inflated into unsupported audio claims");
const casualTasteQuestion = interpretEuterpeRequest("Pô, curtiu essa? Fala real.", context);
assert.match(casualTasteQuestion.response, /não tenho gosto pessoal/i, "An informal request for Euterpe's taste should get an honest, direct answer");
assert.match(casualTasteQuestion.response, /Noite.*dark.*20%.*80%/i, "A direct response should still use the selected track's actual Music DNA");
assert.doesNotMatch(casualTasteQuestion.response, /eu (?:gostei|adorei|curti) essa faixa/i, "Euterpe must not fabricate subjective human taste");
const casualTrackQuestionWithoutDna = interpretEuterpeRequest("O que você acha dela?", { ...context, dna: undefined });
assert.match(casualTrackQuestionWithoutDna.response, /Não tenho gosto pessoal.*Noite.*não vou fingir que ouvi/i, "A casual anaphoric opinion question must be answered without pretending to hear the track");
const formalTrackQuestion = interpretEuterpeRequest("Poderia falar dessa faixa, por gentileza?", context);
assert.match(formalTrackQuestion.response, /A faixa selecionada é.*Noite/i, "A formal request to discuss the selected track should resolve to its provided context");
assert.match(formalTrackQuestion.response, /não identificam.*gênero.*instrumentos.*letra/i, "Formal phrasing must retain Euterpe's evidence boundary");
const staleDna = interpretEuterpeRequest("Qual o gênero desta faixa?", {
  ...context,
  track: { id: "t2", name: "Manhã", artist: "Y" },
});
assert.match(staleDna.response, /Manhã.*não recebi Music DNA/i, "DNA from the previously selected track must not be attributed to the current track");
assert.doesNotMatch(staleDna.response, /dark|intensidade \(20%\)/i, "stale track tags and measurements must be excluded");
const staleDnaFallback = interpretEuterpeRequest("Oi, Euterpe", { ...context, track: { id: "t2", name: "Manhã", artist: "Y" } });
assert.match(staleDnaFallback.response, /Manhã.*ainda sem Music DNA/i);
assert.doesNotMatch(staleDnaFallback.response, /dark/);
const asksLyrics = interpretEuterpeRequest("Sobre o que fala a letra?", { ...context, dna: undefined });
assert.match(asksLyrics.response, /não vou fingir que ouvi/i, "lyrics questions must state that no lyric or audio analysis was provided");
const asksInstruments = interpretEuterpeRequest("Quais instrumentos você percebe?", { ...context, dna: undefined });
assert.match(asksInstruments.response, /não vou fingir que ouvi/i, "instrument questions must state the acoustic evidence boundary");
const noDnaTrackOpinion = interpretEuterpeRequest("O que acha dessa faixa?", { ...context, dna: undefined });
assert.match(noDnaTrackOpinion.response, /Noite.*não recebi Music DNA/i);
const noTrackFollowUp = interpretEuterpeRequest("E essa?", { ...context, track: undefined, dna: undefined });
assert.match(noTrackFollowUp.response, /não tenho uma faixa selecionada/i);
const euterpeFormalityContext = { ...context, track: undefined, dna: undefined, experienceContext: {
  preferences: [{ id: "euterpe-formality", ownerId: "test-owner", subject: "test-owner", domain: "music", key: "formality", value: "formal", scope: "AGENT" as const, scopeId: "euterpe", confidence: 1, status: "CONFIRMED" as const, source: "MANUAL" as const, evidence: [], createdAt: "2026-10-01", updatedAt: "2026-10-01" }],
  experiences: [], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION" as const, generatedAt: "now", truncated: false,
} };
assert.match(interpretEuterpeRequest("O que acha dessa faixa?", euterpeFormalityContext).response, /Não há uma faixa selecionada nesta conversa/, "confirmed Euterpe-only formality should adapt her direct Music response");
assert.match(interpretEuterpeRequest("Fale de forma informal. O que acha dessa faixa?", euterpeFormalityContext).response, /Ainda não tenho uma faixa selecionada/, "the current informal instruction must override saved formality");
const savedTaste = interpretEuterpeRequest("Que estilo combina comigo?", { ...context, preferences: [{ id: "p1", key: "style", value: "jazz", confidence: 1, source: "explicit", updatedAt: "2026-09-22" }], memories: [{ id: "m1", kind: "favorite", value: "trilhas instrumentais", createdAt: "2026-09-22" }] });
assert.match(savedTaste.response, /jazz, trilhas instrumentais/);
assert.match(savedTaste.response, /não como certeza/);
const noSavedTaste = interpretEuterpeRequest("Que estilo combina comigo?", { ...context, preferences: [], memories: [] });
assert.match(noSavedTaste.response, /dois ou três artistas/);
const negatedTaste = interpretEuterpeRequest("Não gosto de jazz", { ...context, preferences: [], memories: [] });
assert.equal(negatedTaste.proposal, undefined, "A negated taste must not become a saved preference proposal");
assert.match(negatedTaste.response, /não é uma preferência/);
const refusedStorage = interpretEuterpeRequest("Gosto de jazz, mas não guarde isso", { ...context, preferences: [], memories: [] });
assert.equal(refusedStorage.proposal, undefined, "Explicit refusal to store must suppress proposals");
const politeRefusedStorage = interpretEuterpeRequest("Prefiro não guardar isso na memória", { ...context, preferences: [], memories: [] });
assert.equal(politeRefusedStorage.proposal, undefined, "Polite negative retention language must not be captured as a preference value");
const explicitRefusedStorage = interpretEuterpeRequest("Prefiro que você não registre que gosto de jazz", { ...context, preferences: [], memories: [] });
assert.equal(explicitRefusedStorage.proposal, undefined, "A polite refusal must outrank a positive preference clause in the same sentence");
const affirmativeTaste = interpretEuterpeRequest("Prefiro jazz", { ...context, preferences: [], memories: [] });
assert.equal(affirmativeTaste.proposal?.kind, "preference", "An affirmative preference without retention refusal should remain reviewable");
const ordinaryBecause = interpretEuterpeRequest("Eu gosto de jazz porque me lembra viagens", context, [{ sender: "user", text: "Analise a faixa" }, { sender: "curator", text: "A faixa não tem dados suficientes." }, { sender: "user", text: "Eu gosto de jazz porque me lembra viagens" }]);
assert.match(ordinaryBecause.response, /Entendi sua preferência/ , "A conjunction because in a statement is not a why follow-up");
const formalExplain = interpretEuterpeRequest("Poderia explicar?", context, [{ sender: "user", text: "Analise a faixa" }, { sender: "curator", text: "Music DNA registra tags dark." }, { sender: "user", text: "Poderia explicar?" }]);
assert.match(formalExplain.response, /Music DNA|tags/);
const groundedExplainWithoutDna = interpretEuterpeRequest("Pode explicar melhor?", { ...context, dna: undefined }, [
  { sender: "user", text: "O que acha dessa faixa?" },
  { sender: "curator", text: "A faixa Noite ainda não tem Music DNA; não vou inferir o gênero." },
  { sender: "user", text: "Pode explicar melhor?" },
]);
assert.match(groundedExplainWithoutDna.response, /Na resposta anterior, eu disse: “A faixa Noite ainda não tem Music DNA/);
assert.match(groundedExplainWithoutDna.response, /não vou inventar uma explicação/);
assert.doesNotMatch(groundedExplainWithoutDna.response, /Aponte a frase/, "A clarification should identify the actual preceding statement before asking what remains unclear");
const boundedPriorQuote = interpretEuterpeRequest("Explique melhor", { ...context, dna: undefined }, [
  { sender: "user", text: "Analise a faixa" },
  { sender: "curator", text: "x".repeat(500) },
  { sender: "user", text: "Explique melhor" },
]);
assert.equal(boundedPriorQuote.response.match(/“([^”]*)”/)?.[1].length, 180, "Quoted conversational context must remain bounded");
const expandedContinue = interpretEuterpeRequest("Me conta mais", context, [{ sender: "user", text: "Analise a faixa" }, { sender: "curator", text: "Music DNA registra tags dark." }, { sender: "user", text: "Me conta mais" }]);
assert.match(expandedContinue.response, /Music DNA|tags/);
for (const followUp of ["E aí?", "Mas como?", "Desenvolve", "Pode detalhar?"]) {
  const resolved = interpretEuterpeRequest(followUp, { ...context, dna: undefined }, [
    { sender: "user", text: "Descreva a faixa" },
    { sender: "curator", text: "Ainda não recebi Music DNA para descrever o áudio." },
    { sender: "user", text: followUp },
  ]);
  assert.match(resolved.response, /não recebi Music DNA/i, `${followUp} should continue the prior grounded music response`);
}
const preferenceBecause = interpretEuterpeRequest("Gosto de jazz porque me lembra viagens", context, [
  { sender: "user", text: "O que acha dessa faixa?" },
  { sender: "curator", text: "A faixa não tem Music DNA." },
  { sender: "user", text: "Gosto de jazz porque me lembra viagens" },
]);
assert.equal(preferenceBecause.proposal?.kind, "preference", "ordinary explanatory clauses must not be misread as conversational why-follow-ups");
console.log("Euterpe identity, context, structured proposals, and confirmation policy passed.");
