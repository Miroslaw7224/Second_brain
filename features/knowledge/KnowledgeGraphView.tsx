import React, { useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft } from "lucide-react";
import { KnowledgeEdge, KnowledgeNode } from "@/types/knowledge";
import { ApiFetch, useKnowledgeNodes, fetchNodeEdges } from "./useKnowledgeNodes";
import { KnowledgeNodePanel } from "./KnowledgeNodePanel";

const TYPE_COLORS: Record<string, string> = {
  note: "#3b82f6",
  task: "#f97316",
  resource: "#22c55e",
  chat: "#a855f7",
  document: "#6b7280",
  event: "#ef4444",
};

function toRFNodes(nodes: KnowledgeNode[]): Node[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const SPACING_X = 220;
  const SPACING_Y = 140;

  return nodes.map((node, i) => ({
    id: node.id,
    position: {
      x: (i % cols) * SPACING_X + (Math.floor(i / cols) % 2 === 0 ? 0 : SPACING_X / 2),
      y: Math.floor(i / cols) * SPACING_Y,
    },
    data: { node, label: node.title },
    style: {
      background: TYPE_COLORS[node.type] ?? "#6b7280",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      padding: "8px 14px",
      fontSize: "12px",
      fontWeight: 600,
      maxWidth: 180,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      cursor: "pointer",
    },
  }));
}

function toRFEdges(edges: KnowledgeEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.fromNodeId,
    target: e.toNodeId,
    label: e.relation,
    style: { stroke: "#94a3b8" },
    labelStyle: { fontSize: 10, fill: "#94a3b8" },
  }));
}

interface Props {
  apiFetch: ApiFetch;
  lang: "pl" | "en";
  onClose: () => void;
}

export function KnowledgeGraphView({ apiFetch, lang, onClose }: Props) {
  const { nodes, loading, refetch } = useKnowledgeNodes(apiFetch);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);

  useEffect(() => {
    if (nodes.length === 0) return;
    const nodeIds = nodes.slice(0, 50).map((n) => n.id);
    Promise.all(nodeIds.map((id) => fetchNodeEdges(apiFetch, id))).then((edgeArrays) => {
      const allEdges = edgeArrays.flat();
      const unique = Array.from(new Map(allEdges.map((e) => [e.id, e])).values());
      setRfEdges(toRFEdges(unique));
    });
  }, [nodes, apiFetch]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, rfNode) => {
    const node = rfNode.data?.node as KnowledgeNode | undefined;
    if (node) setSelectedNode(node);
  }, []);

  const rfNodes = toRFNodes(nodes);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-[var(--text2)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft size={16} />
          Wróć do listy
        </button>
        <span className="text-[var(--text3)] text-sm">
          {nodes.length} {lang === "pl" ? "węzłów" : "nodes"}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Graph */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[var(--text3)] text-sm">
              {lang === "pl" ? "Ładowanie grafu..." : "Loading graph..."}
            </div>
          ) : (
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background />
              <Controls />
              <MiniMap
                nodeColor={(n) => TYPE_COLORS[(n.data?.node as KnowledgeNode)?.type] ?? "#6b7280"}
              />
            </ReactFlow>
          )}
        </div>

        {/* Side panel */}
        {selectedNode && (
          <KnowledgeNodePanel
            node={selectedNode}
            apiFetch={apiFetch}
            onClose={() => setSelectedNode(null)}
            onDeleted={() => {
              setSelectedNode(null);
              refetch();
            }}
          />
        )}
      </div>
    </div>
  );
}
