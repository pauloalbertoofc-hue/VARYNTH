import assert from "node:assert/strict";
import { DomainRegistry } from "./domain-registry";

const registry = new DomainRegistry();
registry.register({ id: "music", label: "Music", specialists: [], capabilities: [], relatedDomains: [], enabled: true });
registry.register({ id: "music.game-audio", label: "Game Audio", parentId: "music", specialists: [], capabilities: [], relatedDomains: [], enabled: true });
registry.registerOwner("music", "euterpe");
registry.transferOwnership("music", "future-euterpe");
registry.registerSpecialist("music.game-audio", "game-agent");
registry.registerCapability("music", "music.explainTheory");
assert.equal(registry.resolveOwner("music.game-audio"), "future-euterpe");
assert.equal(registry.getDomain("music")?.ownershipHistory?.[0]?.agentId, "euterpe");
assert.deepEqual(registry.resolveKnowledgePolicy("music")?.allowedVisibility, ["DOMAIN", "CROSS_DOMAIN", "PUBLIC_TO_AGENTS"]);
assert.equal(registry.getAwarenessIndex().contentLoaded, false);
assert.deepEqual(registry.resolveSpecialists("music.game-audio"), ["game-agent", "future-euterpe", "euterpe"]);
assert.ok(registry.resolveRelatedDomains("music").includes("music.game-audio"));
assert.equal(registry.listHierarchy("music").length, 2);
console.log("Domain registry tests passed");
