import assert from "node:assert/strict";
import { evaluateProceduralGraph, normalizeProceduralGraph, validateProceduralGraph } from "./procedural-graph";
const graph = normalizeProceduralGraph({ nodes: [{ id: "input", type: "input" }, { id: "output", type: "output" }], connections: [{ from: "input", to: "output" }] });
assert.deepEqual(validateProceduralGraph(graph), []);
assert.deepEqual(validateProceduralGraph({ ...graph, connections: [{ from: "input", to: "missing" }] }), ["UNKNOWN_NODE:input->missing"]);
assert.deepEqual(validateProceduralGraph({ ...graph, connections: [{ from: "input", to: "output" }, { from: "output", to: "input" }] }), ["CYCLE_DETECTED"]);
assert.deepEqual(evaluateProceduralGraph(graph), { color: "#000000", errors: [], values: { input: "#000000", output: "#000000" } });
assert.deepEqual(evaluateProceduralGraph(normalizeProceduralGraph({ nodes: [{ id: "color", type: "color", parameters: { value: "#ABCDEF" } }, { id: "output", type: "output" }], connections: [{ from: "color", to: "output" }] })), { color: "#abcdef", errors: [], values: { color: "#abcdef", output: "#abcdef" } });
assert.deepEqual(evaluateProceduralGraph(normalizeProceduralGraph({ nodes: [{ id: "a", type: "color", parameters: { value: "#000000" } }, { id: "b", type: "color", parameters: { value: "#ffffff" } }, { id: "mix", type: "blend", parameters: {} }, { id: "output", type: "output", parameters: {} }], connections: [{ from: "a", to: "mix" }, { from: "b", to: "mix" }, { from: "mix", to: "output" }] })), { color: "#808080", errors: [], values: { a: "#000000", b: "#ffffff", mix: "#808080", output: "#808080" } });
console.log("Procedural graph contract tests passed.");

