import { useEffect, useState } from "react";

export interface RawKnowledgeNode {
  id: string;
  type: "note" | "task" | "resource" | "chat" | "document" | "event";
  title: string;
  content: string;
  tags: string[];
  dueDate?: string;
  createdBy: "user" | "ai";
}

export interface RawKnowledgeEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relation: "related" | "supports" | "contradicts" | "part-of" | "derived-from";
  strength: number;
}

interface UseKnowledgeGraphResult {
  nodes: RawKnowledgeNode[];
  edges: RawKnowledgeEdge[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useKnowledgeGraph(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
): UseKnowledgeGraphResult {
  const [nodes, setNodes] = useState<RawKnowledgeNode[]>([]);
  const [edges, setEdges] = useState<RawKnowledgeEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch("/api/knowledge/nodes")
      .then((r) => r.json())
      .then(async (nodesData) => {
        if (cancelled) return;
        const loadedNodes: RawKnowledgeNode[] = nodesData.nodes ?? [];
        setNodes(loadedNodes);

        // Fetch edges per node (up to 80), then deduplicate
        const nodeIds = loadedNodes.slice(0, 80).map((n) => n.id);
        const edgeArrays = await Promise.all(
          nodeIds.map((id) =>
            apiFetch(`/api/knowledge/edges?nodeId=${id}`)
              .then((r) => r.json())
              .then((d) => (d.edges ?? []) as RawKnowledgeEdge[])
              .catch(() => [] as RawKnowledgeEdge[])
          )
        );
        if (cancelled) return;
        const edgeMap = new Map<string, RawKnowledgeEdge>();
        edgeArrays.flat().forEach((e) => edgeMap.set(e.id, e));
        setEdges(Array.from(edgeMap.values()));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load graph");
        setNodes([]);
        setEdges([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiFetch, tick]);

  return { nodes, edges, loading, error, refetch: () => setTick((t) => t + 1) };
}
