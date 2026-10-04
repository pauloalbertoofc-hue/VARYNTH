import assert from "node:assert/strict";
import { buildKnowledgeTaxonomy } from "./taxonomy";
import type { DomainDefinition } from "./domain-registry";

const domain = (id: string, parentId?: string): DomainDefinition => ({ id, label: id, parentId, specialists: [], capabilities: [], relatedDomains: [], enabled: true });
const taxonomy = buildKnowledgeTaxonomy([
  domain("music"),
  domain("music.theory", "music"),
  domain("music.theory.harmony", "music.theory"),
  domain("legal"),
], [
  { primaryDomain: "music.theory.harmony" },
  { primaryDomain: "music.theory.harmony" },
  { primaryDomain: "music" },
  { primaryDomain: "removed-domain" },
]);
assert.equal(taxonomy.roots.length, 2);
const music = taxonomy.roots.find((node) => node.domain.id === "music")!;
assert.equal(music.directItemCount, 1);
assert.equal(music.subtreeItemCount, 3);
assert.equal(music.children[0].children[0].directItemCount, 2);
assert.equal(taxonomy.unmappedItemCount, 1);

const cyclic = buildKnowledgeTaxonomy([domain("alpha", "beta"), domain("beta", "alpha")], []);
assert.equal(cyclic.roots.length, 2, "malformed cycles must not create recursive tree nodes");
assert.equal(cyclic.roots.reduce((sum, node) => sum + node.subtreeItemCount, 0), 0);
console.log("Knowledge taxonomy tests passed");
