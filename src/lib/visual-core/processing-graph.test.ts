import { strict as assert } from "node:assert";
import { topologicalOrder, validateProcessingGraph, type VisualProcessingGraph } from "./processing-graph";

const graph: VisualProcessingGraph = {
  id: "graph-1", version: 1,
  nodes: ["capture", "enhance", "analyze"].map((id) => ({ id, type: id, version: "1", inputs: [], outputs: [], parameters: {}, deterministic: true, cancellable: true, cachePolicy: "memory" })),
  edges: [{ from: "capture", to: "enhance" }, { from: "enhance", to: "analyze" }],
};
assert.deepEqual(topologicalOrder(graph), ["capture", "enhance", "analyze"]);
assert.equal(validateProcessingGraph({ ...graph, edges: [...graph.edges, { from: "analyze", to: "capture" }] }).error, "PROCESSING_GRAPH_CYCLE");
console.log("Processing graph tests passed: ordering and cycle rejection.");

