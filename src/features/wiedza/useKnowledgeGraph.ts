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

    Promise.all([
      apiFetch("/api/knowledge/nodes").then((r) => r.json()),
      apiFetch("/api/knowledge/edges").then((r) => r.json()),
    ])
      .then(([nodesData, edgesData]) => {
        if (cancelled) return;
        setNodes(Array.isArray(nodesData) ? nodesData : []);
        setEdges(Array.isArray(edgesData) ? edgesData : []);
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
