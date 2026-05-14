import React, { useEffect, useState } from "react";
import { X, Link, Tag } from "lucide-react";
import { KnowledgeEdge, KnowledgeNode } from "@/types/knowledge";
import { ApiFetch, fetchNodeEdges } from "./useKnowledgeNodes";

const RELATION_LABELS: Record<string, string> = {
  related: "powiązany",
  supports: "wspiera",
  contradicts: "sprzeczny",
  "part-of": "część",
  "derived-from": "pochodzi z",
};

const TYPE_COLORS: Record<string, string> = {
  note: "bg-blue-500",
  task: "bg-orange-500",
  resource: "bg-green-500",
  chat: "bg-purple-500",
  document: "bg-gray-500",
  event: "bg-red-500",
};

interface Props {
  node: KnowledgeNode;
  apiFetch: ApiFetch;
  onClose: () => void;
}

export function KnowledgeNodePanel({ node, apiFetch, onClose }: Props) {
  const [edges, setEdges] = useState<KnowledgeEdge[]>([]);
  const [loadingEdges, setLoadingEdges] = useState(true);

  useEffect(() => {
    setLoadingEdges(true);
    fetchNodeEdges(apiFetch, node.id)
      .then(setEdges)
      .finally(() => setLoadingEdges(false));
  }, [apiFetch, node.id]);

  return (
    <div
      data-testid="knowledge-node-panel"
      className="w-80 shrink-0 flex flex-col border-l border-[var(--border)] bg-[var(--surface)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-white text-xs font-medium ${TYPE_COLORS[node.type] ?? "bg-gray-500"}`}
          >
            {node.type}
          </span>
          <h3 className="font-semibold text-[var(--text)] text-sm truncate">{node.title}</h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Zamknij"
          className="shrink-0 p-1 rounded-lg hover:bg-[var(--bg2)] text-[var(--text3)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Content */}
        <section>
          <p className="text-sm text-[var(--text)] leading-relaxed">{node.content}</p>
        </section>

        {/* Tags */}
        {node.tags && node.tags.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-2 text-[var(--text3)]">
              <Tag size={13} />
              <span className="text-xs font-medium uppercase tracking-wide">Tagi</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {node.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-[var(--bg2)] text-[var(--text2)] text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Sources */}
        {node.sources && node.sources.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-2 text-[var(--text3)]">
              <Link size={13} />
              <span className="text-xs font-medium uppercase tracking-wide">Źródła</span>
            </div>
            <ul className="space-y-1">
              {node.sources.map((s, i) => (
                <li key={i} className="text-xs text-[var(--text2)]">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline"
                    >
                      {s.title}
                    </a>
                  ) : (
                    s.title
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Connections */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text3)]">
              Połączenia
            </span>
            {!loadingEdges && <span className="text-xs text-[var(--text3)]">{edges.length}</span>}
          </div>
          {loadingEdges ? (
            <p className="text-xs text-[var(--text3)]">Ładowanie...</p>
          ) : edges.length === 0 ? (
            <p className="text-xs text-[var(--text3)]">Brak połączeń</p>
          ) : (
            <ul className="space-y-1.5">
              {edges.map((edge) => {
                const otherId = edge.fromNodeId === node.id ? edge.toNodeId : edge.fromNodeId;
                return (
                  <li
                    key={edge.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg2)] text-xs"
                  >
                    <span className="text-[var(--text2)] truncate">{otherId}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[var(--text3)]">
                        {RELATION_LABELS[edge.relation] ?? edge.relation}
                      </span>
                      {edge.strength !== undefined && (
                        <span className="text-[var(--accent)] font-medium">
                          {edge.strength.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Metadata */}
        <section className="text-xs text-[var(--text3)] space-y-1">
          <p>Utworzono przez: {node.createdBy === "ai" ? "AI" : "Użytkownik"}</p>
          {node.dueDate && <p>Termin: {node.dueDate}</p>}
        </section>
      </div>
    </div>
  );
}
