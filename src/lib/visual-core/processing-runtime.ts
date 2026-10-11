import { topologicalOrder, type VisualProcessingGraph } from "./processing-graph";

export interface ProcessingExecutionContext {
  signal?: AbortSignal;
  cache?: Map<string, unknown>;
}

export type ProcessingHandler = (node: VisualProcessingGraph["nodes"][number], inputs: Record<string, unknown>, context: ProcessingExecutionContext) => Promise<unknown> | unknown;

export async function executeProcessingGraph(graph: VisualProcessingGraph, handlers: Record<string, ProcessingHandler>, context: ProcessingExecutionContext = {}): Promise<Map<string, unknown>> {
  const order = topologicalOrder(graph);
  const values = new Map<string, unknown>();
  const cache = context.cache ?? new Map<string, unknown>();
  for (const nodeId of order) {
    if (context.signal?.aborted) throw new Error("PROCESSING_CANCELLED");
    const node = graph.nodes.find((candidate) => candidate.id === nodeId)!;
    const cacheKey = `${node.type}@${node.version}:${JSON.stringify(node.parameters)}`;
    if (node.cachePolicy !== "none" && cache.has(cacheKey)) {
      values.set(nodeId, cache.get(cacheKey));
      continue;
    }
    const handler = handlers[node.type];
    if (!handler) throw new Error(`PROCESSING_HANDLER_NOT_FOUND:${node.type}`);
    const inputs: Record<string, unknown> = {};
    for (const edge of graph.edges.filter((candidate) => candidate.to === nodeId)) inputs[edge.from] = values.get(edge.from);
    const value = await handler(node, inputs, context);
    values.set(nodeId, value);
    if (node.cachePolicy !== "none") cache.set(cacheKey, value);
  }
  return values;
}

