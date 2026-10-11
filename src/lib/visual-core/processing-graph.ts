export interface VisualProcessingNode {
  id: string;
  type: string;
  version: string;
  inputs: string[];
  outputs: string[];
  parameters: Record<string, unknown>;
  deterministic: boolean;
  cancellable: boolean;
  cachePolicy: "none" | "memory" | "persistent";
}

export interface VisualProcessingGraph {
  id: string;
  version: 1;
  nodes: VisualProcessingNode[];
  edges: Array<{ from: string; to: string }>;
}

export function validateProcessingGraph(graph: VisualProcessingGraph): { valid: boolean; error?: string } {
  const ids = new Set(graph.nodes.map((node) => node.id));
  if (ids.size !== graph.nodes.length) return { valid: false, error: "DUPLICATE_PROCESSING_NODE" };
  for (const edge of graph.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) return { valid: false, error: "PROCESSING_EDGE_NODE_NOT_FOUND" };
    if (edge.from === edge.to) return { valid: false, error: "PROCESSING_GRAPH_CYCLE" };
  }
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    for (const next of outgoing.get(id) ?? []) if (!visit(next)) return false;
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  for (const id of ids) if (!visit(id)) return { valid: false, error: "PROCESSING_GRAPH_CYCLE" };
  return { valid: true };
}

export function topologicalOrder(graph: VisualProcessingGraph): string[] {
  const validation = validateProcessingGraph(graph);
  if (!validation.valid) throw new Error(validation.error);
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  const queue = [...incoming].filter(([, count]) => count === 0).map(([id]) => id);
  const result: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    result.push(id);
    for (const edge of graph.edges.filter((item) => item.from === id)) {
      const next = (incoming.get(edge.to) ?? 1) - 1;
      incoming.set(edge.to, next);
      if (next === 0) queue.push(edge.to);
    }
  }
  return result;
}

