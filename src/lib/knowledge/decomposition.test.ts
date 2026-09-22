import assert from "node:assert/strict";
import { decomposeKnowledgeTask } from "./router";

const decomposition = decomposeKnowledgeTask({ task: "verifique o copyright da trilha do jogo" });
assert.equal(decomposition.primaryDomain, "legal");
assert.deepEqual(decomposition.relatedDomains, ["music"]);
assert.ok(decomposition.requiredCapabilities.includes("legal.explainConcept"));
console.log("Knowledge decomposition tests passed");
