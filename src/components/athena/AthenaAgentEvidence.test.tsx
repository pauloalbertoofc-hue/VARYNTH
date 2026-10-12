import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { AthenaAgentEvidence } from "./AthenaAgentEvidence";

const accepted = renderToStaticMarkup(<AthenaAgentEvidence metadata={{
  agentExecution: {
    agentId: "logos", agentName: "Logos", success: true, confidence: 0.58,
    sources: ["Evidence Board · estudo 12"],
    limitations: ["A busca externa não foi realizada."],
    persona: { identity: "Sou Logos; analiso evidências.", approach: "Separo afirmação, fonte e inferência.", evidenceBoundary: "Uso somente as fontes recebidas.", authorityBoundary: "Não conduzo busca externa nesta execução." },
  },
  specialistResponseValidation: { accepted: true },
}} />);
assert.match(accepted, /Base e limites · Logos/);
assert.match(accepted, /Evidence Board · estudo 12/);
assert.match(accepted, /A busca externa não foi realizada/);
assert.match(accepted, /Como este agente trabalha/);
assert.match(accepted, /Uso somente as fontes recebidas/);
assert.match(accepted.toLocaleLowerCase(), /não é probabilidade calibrada/);

const rejected = renderToStaticMarkup(<AthenaAgentEvidence metadata={{
  agentExecution: { agentId: "critias", agentName: "Critias", success: true, sources: ["fonte interna não validada"] },
  specialistResponseValidation: { accepted: false },
}} />);
assert.match(rejected, /não foi incorporado após a validação/);
assert.doesNotMatch(rejected, /fonte interna não validada/);
assert.doesNotMatch(rejected, /Como este agente trabalha/);

const incomplete = renderToStaticMarkup(<AthenaAgentEvidence metadata={{
  agentExecution: { agentId: "critias", agentName: "Critias", success: false, sources: ["conclusão parcial"] },
  specialistResponseValidation: { accepted: false },
}} />);
assert.match(incomplete, /não concluiu a análise/);
assert.doesNotMatch(incomplete, /conclusão parcial/);
assert.equal(renderToStaticMarkup(<AthenaAgentEvidence metadata={{ engine: "deterministic-core" }} />), "");

console.log("Athena agent evidence disclosure shows accepted sources and limits, labels heuristic confidence, and hides blocked/partial material.");
