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
console.log("Euterpe identity, context, structured proposals, and confirmation policy passed.");
