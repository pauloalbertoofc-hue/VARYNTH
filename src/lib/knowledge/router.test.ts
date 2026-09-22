import assert from "node:assert/strict";
import { routeKnowledgeIntent } from "./router";

const route = routeKnowledgeIntent({ task: "verifique o copyright da trilha do jogo" });
assert.equal(route.primaryDomain, "legal");
assert.deepEqual(route.relatedDomains, ["music"]);
assert.equal(route.owner, "justitia");
assert.equal(route.recommendedDelegation, true);
assert.equal(routeKnowledgeIntent({ task: "algo sem domínio conhecido" }).recommendedDelegation, false);
console.log("Knowledge router tests passed");
