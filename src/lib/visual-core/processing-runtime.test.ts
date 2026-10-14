import { strict as assert } from "node:assert";
import { executeProcessingGraph } from "./processing-runtime";
import type { VisualProcessingGraph } from "./processing-graph";

const graph: VisualProcessingGraph = {
  id: "runtime", version: 1,
  nodes: [
    { id: "source", type: "SOURCE", version: "1", inputs: [], outputs: [], parameters: { value: 2 }, deterministic: true, cancellable: true, cachePolicy: "memory" },
    { id: "double", type: "DOUBLE", version: "1", inputs: ["source"], outputs: [], parameters: {}, deterministic: true, cancellable: true, cachePolicy: "none" },
  ], edges: [{ from: "source", to: "double" }],
};
void (async () => {
  const values = await executeProcessingGraph(graph, { SOURCE: (node) => node.parameters.value, DOUBLE: (_node, inputs) => Number(inputs.source) * 2 });
  assert.equal(values.get("double"), 4);
  const cache = new Map<string, unknown>();
  const first = await executeProcessingGraph(graph, { SOURCE: (node) => node.parameters.value, DOUBLE: (_node, inputs) => Number(inputs.source) * 2 }, { cache });
  assert.equal(first.get("double"), 4);
  const changedGraph = { ...graph, nodes: graph.nodes.map((node) => node.id === "source" ? { ...node, parameters: { value: 3 } } : node) };
  const changed = await executeProcessingGraph(changedGraph, { SOURCE: (node) => node.parameters.value, DOUBLE: (_node, inputs) => Number(inputs.source) * 2 }, { cache });
  assert.equal(changed.get("double"), 6);
  await assert.rejects(() => executeProcessingGraph(graph, {}, { signal: AbortSignal.abort() }), /PROCESSING_CANCELLED/);
  console.log("Processing runtime tests passed: execution, inputs, cache invalidation and cancellation.");
})();

