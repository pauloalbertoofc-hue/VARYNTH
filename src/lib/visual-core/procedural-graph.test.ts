import assert from "node:assert/strict";
import { evaluateProceduralGraph, normalizeProceduralGraph, validateProceduralGraph } from "./procedural-graph";
const graph = normalizeProceduralGraph({ nodes: [{ id: "input", type: "input" }, { id: "output", type: "output" }], connections: [{ from: "input", to: "output" }] });
assert.deepEqual(validateProceduralGraph(graph), []);
assert.deepEqual(validateProceduralGraph({ ...graph, connections: [{ from: "input", to: "missing" }] }), ["UNKNOWN_NODE:input->missing"]);
assert.deepEqual(validateProceduralGraph({ ...graph, connections: [{ from: "input", to: "output" }, { from: "output", to: "input" }] }), ["CYCLE_DETECTED"]);
assert.deepEqual(evaluateProceduralGraph(graph), { color: "#000000", errors: [] });
assert.deepEqual(evaluateProceduralGraph(normalizeProceduralGraph({ nodes: [{ id: "color", type: "color", parameters: { value: "#ABCDEF" } }, { id: "output", type: "output" }], connections: [{ from: "color", to: "output" }] })), { color: "#abcdef", errors: [] });
console.log("Procedural graph contract tests passed.");

