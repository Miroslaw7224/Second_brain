import React, { useState, useCallback } from "react";
import { Network, Search } from "lucide-react";
import { KnowledgeNode, KnowledgeNodeType } from "@/types/knowledge";
import { ApiFetch, useKnowledgeNodes, searchKnowledgeNodes } from "./useKnowledgeNodes";
import { KnowledgeNodePanel } from "./KnowledgeNodePanel";

const TYPE_FILTERS: { label: string; value: KnowledgeNodeType | "all" }[] = [
  { label: "Wszystkie", value: "all" },
  { label: "Notatki", value: "note" },
  { label: "Zadania", value: "task" },
  { label: "Wydarzenia", value: "event" },
  { label: "Zasoby", value: "resource" },
  { label: "Chaty", value: "chat" },
  { label: "Dokumenty", value: "document" },
];

const TYPE_COLORS: Record<KnowledgeNodeType, string> = {
  note: "bg-blue-500",
  task: "bg-orange-500",
  resource: "bg-green-500",
  chat: "bg-purple-500",
  document: "bg-gray-500",
  event: "bg-red-500",
};

const TYPE_LABELS: Record<KnowledgeNodeType, string> = {
  note: "Notatka",
  task: "Zadanie",
  resource: "Zasób",
  chat: "Chat",
  document: "Dokument",
  event: "Wydarzenie",
};

interface Props {
  apiFetch: ApiFetch;
  lang: "pl" | "en";
  onShowGraph: () => void;
}

export function KnowledgeListView({ apiFetch, lang, onShowGraph }: Props) {
  const [activeFilter, setActiveFilter] = useState<KnowledgeNodeType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeNode[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  const { nodes, loading } = useKnowledgeNodes(
    apiFetch,
    activeFilter === "all" ? undefined : activeFilter
  );

  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      if (!q.trim()) {
        setSearchResults(null);
        return;
      }
      setSearching(true);
      try {
        const results = await searchKnowledgeNodes(apiFetch, q);
        const full: KnowledgeNode[] = results.map((r) => ({
          ...r,
          sources: [],
          embedding: [],
          createdAt: null as any,
          updatedAt: null as any,
          createdBy: "user" as const,
        }));
        setSearchResults(full);
      } finally {
        setSearching(false);
      }
    },
    [apiFetch]
  );

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await apiFetch("/api/knowledge/migrate", { method: "POST" });
      if (!res.ok) throw new Error("Błąd migracji");
      const data = await res.json();
      setMigrateResult(
        lang === "pl" ? `Zmigrowano ${data.total} rekordów` : `Migrated ${data.total} records`
      );
    } catch {
      setMigrateResult(lang === "pl" ? "Błąd migracji danych" : "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  const displayedNodes = searchResults ?? nodes;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text)]">Baza wiedzy</h2>
          <button
            onClick={onShowGraph}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm hover:opacity-90 transition-opacity"
          >
            <Network size={16} />
            Pokaż graf
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
            />
            <input
              type="text"
              placeholder={lang === "pl" ? "Szukaj semantycznie..." : "Semantic search..."}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] text-sm placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        {/* Type filters */}
        {!searchQuery && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeFilter === f.value
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--bg2)] text-[var(--text2)] hover:bg-[var(--bg3)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Node list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {loading || searching ? (
            <div className="flex items-center justify-center h-24 text-[var(--text3)] text-sm">
              {lang === "pl" ? "Ładowanie..." : "Loading..."}
            </div>
          ) : displayedNodes.length === 0 ? (
            searchQuery ? (
              <div className="flex items-center justify-center h-24 text-[var(--text3)] text-sm">
                {lang === "pl" ? "Brak wyników wyszukiwania" : "No results found"}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <p className="text-[var(--text3)] text-sm">
                  {lang === "pl" ? "Baza wiedzy jest pusta" : "Knowledge base is empty"}
                </p>
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {migrating
                    ? lang === "pl"
                      ? "Migruję..."
                      : "Migrating..."
                    : lang === "pl"
                      ? "Migruj istniejące dane"
                      : "Migrate existing data"}
                </button>
                {migrateResult && <p className="text-xs text-[var(--text3)]">{migrateResult}</p>}
              </div>
            )
          ) : (
            displayedNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className="w-full text-left p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg2)] transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-white text-xs font-medium ${TYPE_COLORS[node.type]}`}
                  >
                    {TYPE_LABELS[node.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--text)] text-sm truncate">{node.title}</p>
                    <p className="text-[var(--text3)] text-xs mt-0.5 line-clamp-2">
                      {node.content}
                    </p>
                    {node.tags && node.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {node.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--text3)] text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Side panel */}
      {selectedNode && (
        <KnowledgeNodePanel
          node={selectedNode}
          apiFetch={apiFetch}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
