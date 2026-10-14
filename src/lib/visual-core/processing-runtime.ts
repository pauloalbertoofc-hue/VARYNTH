import { topologicalOrder, type VisualProcessingGraph } from "./processing-graph";

export interface ProcessingExecutionContext {
  signal?: AbortSignal;
  cache?: Map<string, unknown>;
}

export type ProcessingHandler = (node: VisualProcessingGraph["nodes"][number], inputs: Record<string, unknown>, context: ProcessingExecutionContext) => Promise<unknown> | unknown;

function fingerprint(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, nested) => {
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        return Object.fromEntries(Object.entries(nested as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)));
      }
      return nested;
    }) ?? String(value);
  } catch {
    return String(value);
  }
}

export async function executeProcessingGraph(graph: VisualProcessingGraph, handlers: Record<string, ProcessingHandler>, context: ProcessingExecutionContext = {}): Promise<Map<string, unknown>> {
  const order = topologicalOrder(graph);
  const values = new Map<string, unknown>();
  const cache = context.cache ?? new Map<string, unknown>();
  for (const nodeId of order) {
    if (context.signal?.aborted) throw new Error("PROCESSING_CANCELLED");
    const node = graph.nodes.find((candidate) => candidate.id === nodeId)!;
    const inputs: Record<string, unknown> = {};
    for (const edge of graph.edges.filter((candidate) => candidate.to === nodeId)) inputs[edge.from] = values.get(edge.from);
    const cacheKey = `${graph.id}@${graph.version}:${node.id}:${node.type}@${node.version}:${fingerprint(node.parameters)}:${fingerprint(inputs)}`;
    const cacheable = node.deterministic && node.cachePolicy !== "none";
    if (cacheable && cache.has(cacheKey)) {
      values.set(nodeId, cache.get(cacheKey));
      continue;
    }
    const handler = handlers[node.type];
    if (!handler) throw new Error(`PROCESSING_HANDLER_NOT_FOUND:${node.type}`);
    const value = await handler(node, inputs, context);
    if (context.signal?.aborted) throw new Error("PROCESSING_CANCELLED");
    values.set(nodeId, value);
    if (cacheable) cache.set(cacheKey, value);
  }
  return values;
}

