import assert from "node:assert/strict";
import { getPublicKnowledgeProfile } from "./protocol";

const profile = getPublicKnowledgeProfile("music");
assert.equal(profile?.contract.sensitivityPolicy, "PUBLIC_ONLY");
assert.ok(profile?.capabilities.some((capability) => capability.id === "music.explainTheory"));
assert.equal(getPublicKnowledgeProfile("unknown.domain"), undefined);
console.log("Knowledge public profile tests passed");
