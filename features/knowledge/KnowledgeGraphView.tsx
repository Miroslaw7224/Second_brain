import React, { useState, useEffect, useCallback, useRef, useContext, createContext } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  EdgeProps,
  NodeMouseHandler,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
  useInternalNode,
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

const GRAPH_BACK_LABEL = { en: "Back to list", pl: "Wróć do listy" } as const;

function graphBackLabel(lang: "pl" | "en"): string {
  return GRAPH_BACK_LABEL[lang] ?? GRAPH_BACK_LABEL.en;
}

// Context for hover state — edge components read this to highlight themselves
const HoverContext = createContext<string | null>(null);

// Custom circular node with a single centered handle for 360° connections
function CircleNode({ data, id }: NodeProps) {
  const node = data.node as KnowledgeNode;
  const color = TYPE_COLORS[node.type] ?? "#6b7280";
  const label = node.title.length > 14 ? node.title.slice(0, 13) + "…" : node.title;
  const hoveredId = useContext(HoverContext);
  const isHovered = hoveredId === id;

  const handleStyle = {
    opacity: 0,
    width: 1,
    height: 1,
    background: "transparent",
    border: "none",
  };

  return (
    <>
      {/* Single centered handles — actual connection point computed by CircleEdge */}
      <Handle
        type="target"
        position={Position.Top}
        id="center"
        style={{ ...handleStyle, top: "50%", left: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="center"
        style={{ ...handleStyle, top: "50%", left: "50%" }}
      />
      <div
        style={{
          width: NODE_RADIUS * 2,
          height: NODE_RADIUS * 2,
          borderRadius: "50%",
          background: color,
          boxShadow: isHovered
            ? `0 0 20px ${color}cc, 0 0 40px ${color}66, 0 0 2px #fff`
            : `0 0 12px ${color}88, 0 0 24px ${color}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          border: isHovered
            ? "2px solid rgba(255,255,255,0.5)"
            : "2px solid rgba(255,255,255,0.15)",
          transition: "box-shadow 0.15s ease, border-color 0.15s ease",
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
    </>
  );
}

// Custom edge that computes circumference intersection point for 360° connections
function CircleEdge({ id, source, target, sourceX, sourceY, targetX, targetY }: EdgeProps) {
  const hoveredId = useContext(HoverContext);
  const isHighlighted = hoveredId === source || hoveredId === target;

  // Get actual node center positions from the internal node state
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  let x1 = sourceX;
  let y1 = sourceY;
  let x2 = targetX;
  let y2 = targetY;

  if (sourceNode && targetNode) {
    // Node position is top-left corner; center = position + NODE_RADIUS
    const sx = sourceNode.internals.positionAbsolute.x + NODE_RADIUS;
    const sy = sourceNode.internals.positionAbsolute.y + NODE_RADIUS;
    const tx = targetNode.internals.positionAbsolute.x + NODE_RADIUS;
    const ty = targetNode.internals.positionAbsolute.y + NODE_RADIUS;

    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 0) {
      const ux = dx / len;
      const uy = dy / len;
      // Start at circumference of source node, end at circumference of target node
      x1 = sx + ux * NODE_RADIUS;
      y1 = sy + uy * NODE_RADIUS;
      x2 = tx - ux * NODE_RADIUS;
      y2 = ty - uy * NODE_RADIUS;
    }
  }

  const strokeColor = isHighlighted ? "rgba(248,210,100,0.85)" : "rgba(148,163,184,0.22)";
  const strokeWidth = isHighlighted ? 2 : 1;

  return (
    <path
      id={id}
      d={`M ${x1} ${y1} L ${x2} ${y2}`}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      fill="none"
      style={{ transition: "stroke 0.15s ease, stroke-width 0.15s ease" }}
    />
  );
}

const nodeTypes = { circle: CircleNode };
const edgeTypes = { circle: CircleEdge };

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
    type: "circle",
    data: {},
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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
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

  const handleNodeMouseEnter: NodeMouseHandler = useCallback((_event, rfNode) => {
    setHoveredNodeId(rfNode.id);
  }, []);

  const handleNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setHoveredNodeId(null);
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
    <HoverContext.Provider value={hoveredNodeId}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-[var(--text2)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft size={16} />
            {graphBackLabel(lang)}
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
              onNodeMouseEnter={handleNodeMouseEnter}
              onNodeMouseLeave={handleNodeMouseLeave}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
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
    </HoverContext.Provider>
  );
}
