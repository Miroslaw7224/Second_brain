import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeMouseHandler,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from "d3-force";
import { ArrowLeft, RefreshCw } from "lucide-react";
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

const NODE_RADIUS = 38;

// Custom circular node
function CircleNode({ data }: NodeProps) {
  const node = data.node as KnowledgeNode;
  const color = TYPE_COLORS[node.type] ?? "#6b7280";
  const label = node.title.length > 14 ? node.title.slice(0, 13) + "…" : node.title;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          width: NODE_RADIUS * 2,
          height: NODE_RADIUS * 2,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 12px ${color}88, 0 0 24px ${color}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          border: "2px solid rgba(255,255,255,0.15)",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: "10px",
            fontWeight: 700,
            textAlign: "center",
            padding: "0 6px",
            lineHeight: 1.2,
            wordBreak: "break-word",
          }}
        >
          {label}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

const nodeTypes = { circle: CircleNode };

interface SimNode extends SimulationNodeDatum {
  id: string;
}

function runForceLayout(
  knNodes: KnowledgeNode[],
  edges: KnowledgeEdge[]
): Promise<Map<string, { x: number; y: number }>> {
  return new Promise((resolve) => {
    const simNodes: SimNode[] = knNodes.map((n) => ({ id: n.id }));
    const idSet = new Set(knNodes.map((n) => n.id));
    const simLinks: SimulationLinkDatum<SimNode>[] = edges
      .filter((e) => idSet.has(e.fromNodeId) && idSet.has(e.toNodeId))
      .map((e) => ({ source: e.fromNodeId, target: e.toNodeId }));

    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
          .id((d) => d.id)
          .distance(240)
          .strength(0.3)
      )
      .force("charge", forceManyBody().strength(-800))
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide(NODE_RADIUS + 40))
      .stop();

    // Run synchronously for enough ticks to stabilise
    for (let i = 0; i < 300; i++) sim.tick();

    const positions = new Map<string, { x: number; y: number }>();
    simNodes.forEach((n) => positions.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 }));
    resolve(positions);
  });
}

function toRFEdges(edges: KnowledgeEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.fromNodeId,
    target: e.toNodeId,
    style: { stroke: "rgba(148,163,184,0.2)", strokeWidth: 1 },
    animated: false,
  }));
}

interface Props {
  apiFetch: ApiFetch;
  lang: "pl" | "en";
  onClose: () => void;
}

export function KnowledgeGraphView({ apiFetch, lang, onClose }: Props) {
  const { nodes: knNodes, loading, refetch } = useKnowledgeNodes(apiFetch);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const edgesRef = useRef<KnowledgeEdge[]>([]);

  useEffect(() => {
    if (knNodes.length === 0) return;
    setLayoutReady(false);

    const nodeIds = knNodes.slice(0, 80).map((n) => n.id);
    Promise.all(nodeIds.map((id) => fetchNodeEdges(apiFetch, id))).then(async (edgeArrays) => {
      const allEdges = edgeArrays.flat();
      const unique = Array.from(new Map(allEdges.map((e) => [e.id, e])).values());
      edgesRef.current = unique;

      const positions = await runForceLayout(knNodes, unique);

      const nodes: Node[] = knNodes.map((n) => ({
        id: n.id,
        type: "circle",
        position: positions.get(n.id) ?? { x: 0, y: 0 },
        data: { node: n, label: n.title },
        style: { width: NODE_RADIUS * 2, height: NODE_RADIUS * 2 },
      }));

      setRfNodes(nodes);
      setRfEdges(toRFEdges(unique));
      setLayoutReady(true);
    });
  }, [knNodes, apiFetch]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, rfNode) => {
    const node = rfNode.data?.node as KnowledgeNode | undefined;
    if (node) setSelectedNode(node);
  }, []);

  const handleRebuildConnections = async () => {
    setRebuilding(true);
    try {
      await apiFetch("/api/knowledge/rebuild-connections", { method: "POST" });
      await refetch();
    } finally {
      setRebuilding(false);
    }
  };

  const isReady = !loading && layoutReady;

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
          {knNodes.length} {lang === "pl" ? "węzłów" : "nodes"}
        </span>
        <button
          onClick={handleRebuildConnections}
          disabled={rebuilding || loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)] transition-colors disabled:opacity-50"
          title={
            lang === "pl"
              ? "Przebuduj połączenia między węzłami"
              : "Rebuild connections between nodes"
          }
        >
          <RefreshCw size={13} className={rebuilding ? "animate-spin" : ""} />
          {rebuilding
            ? lang === "pl"
              ? "Budowanie..."
              : "Building..."
            : lang === "pl"
              ? "Przebuduj połączenia"
              : "Rebuild connections"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--text3)] text-sm z-10 bg-[var(--bg)]">
              {lang === "pl" ? "Obliczanie layoutu..." : "Computing layout..."}
            </div>
          )}
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            style={{ background: "#0d1117" }}
            minZoom={0.2}
            maxZoom={3}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="rgba(255,255,255,0.06)"
            />
            <Controls
              style={{
                background: "rgba(30,30,40,0.8)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <MiniMap
              style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}
              nodeColor={(n) => TYPE_COLORS[(n.data?.node as KnowledgeNode)?.type] ?? "#6b7280"}
              maskColor="rgba(0,0,0,0.6)"
            />
          </ReactFlow>
        </div>

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
