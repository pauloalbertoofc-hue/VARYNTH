import assert from "node:assert/strict";
import { normalizeProceduralGraph, validateProceduralGraph } from "./procedural-graph";
const graph = normalizeProceduralGraph({ nodes: [{ id: "input", type: "input" }, { id: "output", type: "output" }], connections: [{ from: "input", to: "output" }] });
assert.deepEqual(validateProceduralGraph(graph), []);
assert.deepEqual(validateProceduralGraph({ ...graph, connections: [{ from: "input", to: "missing" }] }), ["UNKNOWN_NODE:input->missing"]);
assert.deepEqual(validateProceduralGraph({ ...graph, connections: [{ from: "input", to: "output" }, { from: "output", to: "input" }] }), ["CYCLE_DETECTED"]);
console.log("Procedural graph contract tests passed.");

