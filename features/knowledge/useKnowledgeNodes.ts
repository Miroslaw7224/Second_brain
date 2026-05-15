import { useState, useEffect, useCallback } from "react";
import { KnowledgeNode, KnowledgeEdge, KnowledgeNodeType } from "@/types/knowledge";

export type ApiFetch = (url: string, options?: RequestInit) => Promise<Response>;

export function useKnowledgeNodes(apiFetch: ApiFetch, type?: KnowledgeNodeType) {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = type ? `/api/knowledge/nodes?type=${type}` : "/api/knowledge/nodes";
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Błąd pobierania węzłów");
      const data = await res.json();
      setNodes(data.nodes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nieznany błąd");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, type]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  return { nodes, loading, error, refetch: fetchNodes };
}

export async function searchKnowledgeNodes(
  apiFetch: ApiFetch,
  query: string
): Promise<
  Array<{
    id: string;
    type: KnowledgeNodeType;
    title: string;
    content: string;
    tags: string[];
    score: number;
  }>
> {
  const res = await apiFetch(`/api/knowledge/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Błąd wyszukiwania");
  const data = await res.json();
  return data.results;
}

export async function fetchNodeEdges(apiFetch: ApiFetch, nodeId: string): Promise<KnowledgeEdge[]> {
  const res = await apiFetch(`/api/knowledge/edges?nodeId=${nodeId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.edges ?? [];
}

export async function deleteKnowledgeNode(apiFetch: ApiFetch, nodeId: string): Promise<void> {
  const res = await apiFetch(`/api/knowledge/nodes/${nodeId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Błąd usuwania węzła");
}
