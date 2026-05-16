"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import * as d3Force from "d3-force";
import {
  KnowledgeNodeCard,
  type KnowledgeNodeType,
  type KnowledgeNodeData,
  type KnowledgeNode,
} from "./KnowledgeNodeCard";
import {
  useKnowledgeGraph,
  type RawKnowledgeNode,
  type RawKnowledgeEdge,
} from "./useKnowledgeGraph";
import { X, RefreshCw } from "lucide-react";

const NODE_TYPES: NodeTypes = { knowledgeNode: KnowledgeNodeCard as NodeTypes[string] };

const EDGE_COLORS: Record<string, string> = {
  related: "rgba(124,109,255,0.5)",
  supports: "rgba(52,211,153,0.6)",
  contradicts: "rgba(248,113,113,0.6)",
  "part-of": "rgba(160,160,160,0.5)",
  "derived-from": "rgba(96,165,250,0.6)",
};

const ALL_TYPES: KnowledgeNodeType[] = ["note", "task", "resource", "chat", "document", "event"];
const ALL_RELATIONS = ["related", "supports", "contradicts", "part-of", "derived-from"] as const;

function runForceLayout(rawNodes: RawKnowledgeNode[], rawEdges: RawKnowledgeEdge[]) {
  const sim = d3Force
    .forceSimulation(
      rawNodes.map((n) => ({ id: n.id, x: Math.random() * 600, y: Math.random() * 400 }))
    )
    .force(
      "link",
      d3Force
        .forceLink(rawEdges.map((e) => ({ source: e.fromNodeId, target: e.toNodeId })))
        .id((d) => (d as { id: string }).id)
        .distance(160)
    )
    .force("charge", d3Force.forceManyBody().strength(-300))
    .force("center", d3Force.forceCenter(400, 300))
    .stop();

  for (let i = 0; i < 300; i++) sim.tick();

  const positions: Record<string, { x: number; y: number }> = {};
  (sim.nodes() as { id: string; x: number; y: number }[]).forEach((n) => {
    positions[n.id] = { x: n.x, y: n.y };
  });
  return positions;
}

function buildFlowNodes(
  rawNodes: RawKnowledgeNode[],
  positions: Record<string, { x: number; y: number }>
): KnowledgeNode[] {
  return rawNodes.map((n) => ({
    id: n.id,
    type: "knowledgeNode",
    position: positions[n.id] ?? { x: Math.random() * 600, y: Math.random() * 400 },
    data: { label: n.title, type: n.type as KnowledgeNodeType, selected: false, tags: [] },
  }));
}

function buildFlowEdges(rawEdges: RawKnowledgeEdge[]): Edge[] {
  return rawEdges.map((e) => ({
    id: e.id,
    source: e.fromNodeId,
    target: e.toNodeId,
    label: e.relation,
    labelStyle: { fontSize: 9, fill: "rgba(240,238,232,0.4)" },
    labelBgStyle: { fill: "transparent" },
    style: { stroke: EDGE_COLORS[e.relation] ?? EDGE_COLORS.related, strokeWidth: 1.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: EDGE_COLORS[e.relation] ?? EDGE_COLORS.related,
      width: 12,
      height: 12,
    },
    animated: e.relation === "contradicts",
  }));
}

interface KnowledgeGraphViewProps {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  lang: "en" | "pl";
}

export function KnowledgeGraphView({ apiFetch, lang }: KnowledgeGraphViewProps) {
  const { nodes: rawNodes, edges: rawEdges, loading, error, refetch } = useKnowledgeGraph(apiFetch);
  const [nodes, setNodes, onNodesChange] = useNodesState<KnowledgeNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<RawKnowledgeNode | null>(null);
  const [typeFilter, setTypeFilter] = useState<Set<KnowledgeNodeType>>(new Set(ALL_TYPES));
  const [relationFilter, setRelationFilter] = useState<Set<string>>(new Set(ALL_RELATIONS));

  useEffect(() => {
    if (rawNodes.length === 0) return;
    const filteredNodes = rawNodes.filter((n) => typeFilter.has(n.type as KnowledgeNodeType));
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = rawEdges.filter(
      (e) =>
        filteredNodeIds.has(e.fromNodeId) &&
        filteredNodeIds.has(e.toNodeId) &&
        relationFilter.has(e.relation)
    );
    const positions = runForceLayout(filteredNodes, filteredEdges);
    setNodes(buildFlowNodes(filteredNodes, positions));
    setEdges(buildFlowEdges(filteredEdges));
  }, [rawNodes, rawEdges, typeFilter, relationFilter, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const raw = rawNodes.find((n) => n.id === node.id) ?? null;
      setSelectedNode(raw);
    },
    [rawNodes]
  );

  const toggleType = (type: KnowledgeNodeType) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const toggleRelation = (rel: string) => {
    setRelationFilter((prev) => {
      const next = new Set(prev);
      next.has(rel) ? next.delete(rel) : next.add(rel);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text2)] text-sm">
        {lang === "pl" ? "Ładowanie grafu…" : "Loading graph…"}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{error}</div>
    );
  }

  if (rawNodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text2)] text-sm">
        {lang === "pl" ? "Brak węzłów w bazie wiedzy." : "No knowledge nodes yet."}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] flex-wrap">
        <span className="text-xs text-[var(--text2)] font-bold uppercase tracking-wider">
          {lang === "pl" ? "Typ:" : "Type:"}
        </span>
        {ALL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
              typeFilter.has(type)
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg3)] text-[var(--text3)]"
            }`}
          >
            {type}
          </button>
        ))}
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <span className="text-xs text-[var(--text2)] font-bold uppercase tracking-wider">
          {lang === "pl" ? "Relacja:" : "Relation:"}
        </span>
        {ALL_RELATIONS.map((rel) => (
          <button
            key={rel}
            onClick={() => toggleRelation(rel)}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
              relationFilter.has(rel)
                ? "bg-[var(--accent-bg)] text-[var(--accent2)] border border-[var(--accent-border)]"
                : "bg-[var(--bg3)] text-[var(--text3)]"
            }`}
          >
            {rel}
          </button>
        ))}
        <button
          onClick={refetch}
          className="ml-auto p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text2)]"
          title={lang === "pl" ? "Odśwież" : "Refresh"}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Graph + Detail panel */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-h-0" style={{ background: "var(--bg)" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={NODE_TYPES}
            fitView
            minZoom={0.2}
            maxZoom={2}
          >
            <Background color="var(--border)" gap={24} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const type = (n.data as KnowledgeNodeData).type;
                const colors: Record<string, string> = {
                  note: "#7c6dff",
                  task: "#34d399",
                  resource: "#f59e0b",
                  event: "#f87171",
                  chat: "#60a5fa",
                  document: "#c084fc",
                };
                return colors[type] ?? "#7c6dff";
              }}
              style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
            />
          </ReactFlow>
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <div className="w-72 border-l border-[var(--border)] bg-[var(--bg2)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <span className="font-semibold text-sm text-[var(--text)] truncate">
                {selectedNode.title}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded hover:bg-[var(--bg3)] text-[var(--text2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text3)]">
                  {lang === "pl" ? "Typ" : "Type"}
                </span>
                <p className="text-[var(--text)] mt-0.5">{selectedNode.type}</p>
              </div>
              {selectedNode.content && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text3)]">
                    {lang === "pl" ? "Treść" : "Content"}
                  </span>
                  <p className="text-[var(--text2)] mt-0.5 leading-relaxed line-clamp-6">
                    {selectedNode.content}
                  </p>
                </div>
              )}
              {selectedNode.dueDate && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text3)]">
                    {lang === "pl" ? "Termin" : "Due date"}
                  </span>
                  <p className="text-[var(--accent)] mt-0.5">{selectedNode.dueDate}</p>
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text3)]">
                  {lang === "pl" ? "Połączenia" : "Connections"}
                </span>
                {rawEdges.filter(
                  (e) => e.fromNodeId === selectedNode.id || e.toNodeId === selectedNode.id
                ).length === 0 ? (
                  <p className="text-[var(--text3)] mt-0.5 text-xs">
                    {lang === "pl" ? "Brak" : "None"}
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {rawEdges
                      .filter(
                        (e) => e.fromNodeId === selectedNode.id || e.toNodeId === selectedNode.id
                      )
                      .slice(0, 8)
                      .map((e) => {
                        const otherId =
                          e.fromNodeId === selectedNode.id ? e.toNodeId : e.fromNodeId;
                        const other = rawNodes.find((n) => n.id === otherId);
                        return (
                          <li key={e.id} className="flex items-center gap-1.5 text-xs">
                            <span className="text-[var(--text3)]">{e.relation}</span>
                            <span className="text-[var(--text2)]">{other?.title ?? otherId}</span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
