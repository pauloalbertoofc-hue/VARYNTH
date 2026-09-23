import assert from "node:assert/strict";
import { getPublicKnowledgeProfile } from "./protocol";

const profile = getPublicKnowledgeProfile("music");
assert.ok(profile?.contracts.length);
assert.ok(profile?.contracts.every((contract) => contract.sensitivityPolicy === "PUBLIC_ONLY" && contract.capabilities.length === 1 && contract.allowedConsumers.length > 0));
assert.ok(profile?.capabilities.some((capability) => capability.id === "music.explainTheory"));
assert.equal(getPublicKnowledgeProfile("unknown.domain"), undefined);
console.log("Knowledge public profile tests passed");
