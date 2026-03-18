"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Network,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  MoreHorizontal,
  GripVertical,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { nanoid } from "nanoid";
import type { MindMap, MindMapNode } from "@/src/features/mind-maps/mindMapTypes";
import { DEFAULT_COL_W, MAX_COL_W, MIN_COL_W } from "@/src/features/mind-maps/mindMapTypes";
import {
  deleteNodeKeepChildren,
  findNode,
  insertNodeAbove,
  leafCount,
  mapAllNodes,
  mapNode,
  moveNodeUnder,
  removeNode,
} from "@/src/lib/mindMapUtils";
import { NoteEditor } from "@/src/components/NoteEditor";
import { MindMapTree } from "@/src/features/mind-maps/MindMapTree";

type AINodeResult = { label: string; description: string };

const ROW_H = 38;
const GAP_H = 8;
const CONN = 24;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function formatDateLike(d: unknown): string {
  try {
    if (!d) return "";
    const ms =
      typeof d === "string"
        ? Date.parse(d)
        : typeof d === "number"
          ? d
          : (d as { toMillis?: () => number } | undefined)?.toMillis?.();
    if (!ms) return "";
    return new Date(ms).toLocaleDateString();
  } catch {
    return "";
  }
}

export function MindMapsTab({
  apiFetch,
  title,
}: {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  title: string;
}) {
  const [maps, setMaps] = useState<MindMap[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<MindMap | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingMap, setIsDeletingMap] = useState(false);

  const refreshList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const res = await apiFetch("/api/mind-maps");
      if (!res.ok) return;
      const data = (await res.json()) as MindMap[];
      setMaps(data);
    } finally {
      setIsLoadingList(false);
    }
  }, [apiFetch]);

  const loadMap = useCallback(
    async (id: string) => {
      setIsLoadingMap(true);
      try {
        const res = await apiFetch(`/api/mind-maps/${id}`);
        if (!res.ok) return;
        const data = (await res.json()) as MindMap;
        setSelectedMap(data);
      } finally {
        setIsLoadingMap(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedMap(null);
      return;
    }
    void loadMap(selectedId);
  }, [selectedId, loadMap]);

  const createMap = useCallback(async () => {
    setIsCreating(true);
    try {
      const res = await apiFetch("/api/mind-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nowa mapa" }),
      });
      if (!res.ok) return;
      const created = (await res.json()) as MindMap;
      await refreshList();
      setSelectedId(created.id);
    } finally {
      setIsCreating(false);
    }
  }, [apiFetch, refreshList]);

  const deleteMap = useCallback(async () => {
    if (!selectedId) return;
    setIsDeletingMap(true);
    try {
      const res = await apiFetch(`/api/mind-maps/${selectedId}`, { method: "DELETE" });
      if (!res.ok) return;
      setSelectedId(null);
      await refreshList();
    } finally {
      setIsDeletingMap(false);
    }
  }, [apiFetch, refreshList, selectedId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      <div className="p-6 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[var(--bg3)] rounded-2xl flex items-center justify-center flex-shrink-0">
            <Network className="w-5 h-5 text-[var(--text)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{title}</h2>
            <p className="text-xs text-[var(--text3)]">
              {selectedMap
                ? "Edytuj drzewo i notatki węzłów. Zmiany zapisują się automatycznie."
                : "Wybierz mapę lub utwórz nową."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!selectedMap ? (
            <button
              type="button"
              onClick={createMap}
              disabled={isCreating}
              className="px-3 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Nowa mapa
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="px-3 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:bg-[var(--bg3)] inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Lista
              </button>
              <button
                type="button"
                onClick={deleteMap}
                disabled={isDeletingMap}
                className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold text-sm hover:bg-red-100 disabled:opacity-60 inline-flex items-center gap-2"
                title="Usuń mapę"
              >
                {isDeletingMap ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Usuń
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {!selectedMap ? (
          <MindMapList
            apiFetch={apiFetch}
            maps={maps}
            isLoading={isLoadingList}
            onCreate={createMap}
            isCreating={isCreating}
            onOpen={(id) => setSelectedId(id)}
            onCreatedNew={(id) => setSelectedId(id)}
            onRefreshList={refreshList}
          />
        ) : isLoadingMap ? (
          <div className="h-full flex items-center justify-center text-[var(--text3)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Ładowanie mapy…
          </div>
        ) : (
          <MindMapEditor
            apiFetch={apiFetch}
            map={selectedMap}
            onChanged={setSelectedMap}
            onRefreshList={refreshList}
          />
        )}
      </div>
    </div>
  );
}

function MindMapList({
  apiFetch,
  maps,
  isLoading,
  isCreating,
  onCreate,
  onOpen,
  onCreatedNew,
  onRefreshList,
}: {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  maps: MindMap[];
  isLoading: boolean;
  isCreating: boolean;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onCreatedNew: (id: string) => void;
  onRefreshList: () => Promise<void>;
}) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  return (
    <div className="h-full overflow-auto p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={onCreate}
          disabled={isCreating}
          className="group border-2 border-dashed border-[var(--border)] rounded-2xl p-5 text-left hover:bg-[var(--bg2)] transition-colors disabled:opacity-60"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg3)] flex items-center justify-center">
              {isCreating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="font-bold">Utwórz nową mapę</div>
              <div className="text-xs text-[var(--text3)]">Pusta struktura z rootem po lewej</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          className="group border-2 border-dashed border-[var(--border)] rounded-2xl p-5 text-left hover:bg-[var(--bg2)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg3)] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold">Importuj mapę</div>
              <div className="text-xs text-[var(--text3)]">
                Wklej strukturę (opcjonalnie screenshot)
              </div>
            </div>
          </div>
        </button>

        {isLoading ? (
          <div className="border border-[var(--border)] rounded-2xl p-5 bg-[var(--surface)]">
            <div className="animate-pulse h-4 bg-[var(--bg3)] rounded mb-2 w-2/3" />
            <div className="animate-pulse h-3 bg-[var(--bg3)] rounded w-1/2" />
          </div>
        ) : maps.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-2 border border-[var(--border)] rounded-2xl p-8 bg-[var(--surface)]">
            <div className="text-sm text-[var(--text3)] font-semibold">
              Brak map. Utwórz pierwszą i zacznij budować drzewo.
            </div>
          </div>
        ) : (
          maps.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpen(m.id)}
              className="border border-[var(--border)] rounded-2xl p-5 bg-[var(--surface)] hover:bg-[var(--bg2)] transition-colors text-left"
            >
              <div className="font-bold truncate">{m.title || "Bez tytułu"}</div>
              <div className="mt-1 text-xs text-[var(--text3)]">
                {formatDateLike(m.updatedAt) ? `Aktualizacja: ${formatDateLike(m.updatedAt)}` : "—"}
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-widest text-[var(--text3)] font-bold">
                {leafCount(m.rootNode)} liści
              </div>
            </button>
          ))
        )}
      </div>

      <MindMapImportModal
        open={isImportOpen}
        apiFetch={apiFetch}
        onClose={() => setIsImportOpen(false)}
        onCreatedNew={onCreatedNew}
        onRefreshList={onRefreshList}
      />
    </div>
  );
}

function MindMapEditor({
  apiFetch,
  map,
  onChanged,
  onRefreshList,
}: {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  map: MindMap;
  onChanged: (next: MindMap) => void;
  onRefreshList: () => Promise<void>;
}) {
  const [rootNode, setRootNode] = useState<MindMapNode>(map.rootNode);
  const [colWidths, setColWidths] = useState<Record<number, number>>(map.colWidths ?? {});

  const [selId, setSelId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [ctxId, setCtxId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);

  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);
  const [aiParentId, setAiParentId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const resizingRef = useRef<null | { depth: number; startX: number; startW: number }>(null);
  const saveTimerRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);

  const selectedNode = useMemo(() => (selId ? findNode(rootNode, selId) : null), [rootNode, selId]);

  useEffect(() => {
    setRootNode(map.rootNode);
    setColWidths(map.colWidths ?? {});
    setSelId(null);
    setEditId(null);
    setCtxId(null);
    setDragId(null);
    setDropId(null);
    setDeleteNodeId(null);
    setAiParentId(null);
  }, [map.id, map.colWidths, map.rootNode]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const getColW = useCallback(
    (depth: number) => {
      return colWidths[depth] ?? DEFAULT_COL_W;
    },
    [colWidths]
  );

  const scheduleSave = useCallback(
    (nextRoot: MindMapNode, nextColWidths: Record<number, number>) => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        setIsSaving(true);
        try {
          const res = await apiFetch(`/api/mind-maps/${map.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rootNode: nextRoot,
              colWidths: nextColWidths,
              title: nextRoot.label,
            }),
          });
          if (!res.ok) return;
          setLastSavedAt(Date.now());
          onChanged({
            ...map,
            rootNode: nextRoot,
            colWidths: nextColWidths,
            title: nextRoot.label,
          });
          await onRefreshList();
        } finally {
          if (!unmountedRef.current) setIsSaving(false);
        }
      }, 1500);
    },
    [apiFetch, map, onChanged, onRefreshList]
  );

  const applyTree = useCallback(
    (nextRoot: MindMapNode) => {
      setRootNode(nextRoot);
      scheduleSave(nextRoot, colWidths);
    },
    [colWidths, scheduleSave]
  );

  const applyColWidths = useCallback(
    (next: Record<number, number>) => {
      setColWidths(next);
      scheduleSave(rootNode, next);
    },
    [rootNode, scheduleSave]
  );

  useEffect(() => {
    function onDocClick() {
      if (ctxId) setCtxId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [ctxId]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const r = resizingRef.current;
      if (!r) return;
      const dx = e.clientX - r.startX;
      const nextW = clamp(r.startW + dx, MIN_COL_W, MAX_COL_W);
      setColWidths((prev) => ({ ...prev, [r.depth]: nextW }));
    }
    function onUp() {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      applyColWidths({ ...colWidths });
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [applyColWidths, colWidths]);

  const startResize = useCallback(
    (e: React.MouseEvent, depth: number) => {
      e.preventDefault();
      e.stopPropagation();
      resizingRef.current = { depth, startX: e.clientX, startW: getColW(depth) };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [getColW]
  );

  const resetWidths = useCallback(() => {
    applyColWidths({});
  }, [applyColWidths]);

  const collapseAll = useCallback(() => {
    const next = mapAllNodes(rootNode, (n) =>
      n.id === "root" ? n : { ...n, collapsed: n.children.length > 0 }
    );
    applyTree(next);
  }, [applyTree, rootNode]);

  const expandAll = useCallback(() => {
    const next = mapAllNodes(rootNode, (n) => ({ ...n, collapsed: false }));
    applyTree(next);
  }, [applyTree, rootNode]);

  const toggleCollapsed = useCallback(
    (id: string) => {
      const next = mapNode(rootNode, id, (n) => ({ ...n, collapsed: !n.collapsed }));
      applyTree(next);
    },
    [applyTree, rootNode]
  );

  const commitLabel = useCallback(
    (id: string, nextLabel: string) => {
      const trimmed = nextLabel.trim();
      if (!trimmed) return;
      const next = mapNode(rootNode, id, (n) => ({ ...n, label: trimmed }));
      setEditId(null);
      applyTree(next);
    },
    [applyTree, rootNode]
  );

  const addChild = useCallback(
    (parentId: string) => {
      const nid = nanoid();
      const next = mapNode(rootNode, parentId, (n) => ({
        ...n,
        collapsed: false,
        children: [
          ...n.children,
          { id: nid, label: "Nowy węzeł", note: "", collapsed: false, children: [] },
        ],
      }));
      setSelId(nid);
      setEditId(nid);
      applyTree(next);
    },
    [applyTree, rootNode]
  );

  const insertAbove = useCallback(
    (childId: string) => {
      const nid = nanoid();
      const next = insertNodeAbove(rootNode, childId, {
        id: nid,
        label: "Nowa kategoria",
        note: "",
        collapsed: false,
        children: [],
      });
      setCtxId(null);
      setSelId(nid);
      setEditId(nid);
      applyTree(next);
    },
    [applyTree, rootNode]
  );

  const requestDelete = useCallback(
    (id: string) => {
      if (id === "root") return;
      setCtxId(null);
      setDeleteNodeId(id);
    },
    [setDeleteNodeId]
  );

  const confirmDelete = useCallback(
    (id: string, keepChildren: boolean) => {
      const next = keepChildren ? deleteNodeKeepChildren(rootNode, id) : removeNode(rootNode, id);
      if (selId === id) setSelId(null);
      setDeleteNodeId(null);
      applyTree(next);
    },
    [applyTree, rootNode, selId]
  );

  const onDragStart = useCallback((id: string) => {
    if (id === "root") return;
    setDragId(id);
  }, []);

  const onDragOver = useCallback(
    (id: string) => {
      if (dragId && id !== dragId) setDropId(id);
    },
    [dragId]
  );

  const onDrop = useCallback(
    (targetId: string) => {
      if (dragId && targetId && dragId !== targetId) {
        const next = moveNodeUnder(rootNode, dragId, targetId);
        applyTree(next);
      }
      setDragId(null);
      setDropId(null);
    },
    [applyTree, dragId, rootNode]
  );

  const onDragEnd = useCallback(() => {
    setDragId(null);
    setDropId(null);
  }, []);

  const openAI = useCallback((parentId: string) => {
    setCtxId(null);
    setAiParentId(parentId);
  }, []);

  const acceptAI = useCallback(
    (parentId: string, result: AINodeResult) => {
      const nid = nanoid();
      const next = mapNode(rootNode, parentId, (n) => ({
        ...n,
        collapsed: false,
        children: [
          ...n.children,
          {
            id: nid,
            label: result.label,
            note: result.description,
            collapsed: false,
            children: [],
          },
        ],
      }));
      setAiParentId(null);
      setSelId(nid);
      applyTree(next);
    },
    [applyTree, rootNode]
  );

  const updateSelectedNote = useCallback(
    (html: string) => {
      if (!selId) return;
      const next = mapNode(rootNode, selId, (n) => ({ ...n, note: html }));
      applyTree(next);
    },
    [applyTree, rootNode, selId]
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)] flex items-center gap-3">
        <div className="text-sm text-[var(--text3)] flex items-center gap-2 min-w-0">
          <span className="font-semibold text-[var(--accent)]">Drugi Mózg</span>
          <ChevronRight className="w-4 h-4" />
          <span>Mapy myśli</span>
          <ChevronRight className="w-4 h-4" />
          <span className="font-semibold text-[var(--text)] truncate">{rootNode.label}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text2)] text-sm font-semibold hover:bg-[var(--bg2)] inline-flex items-center gap-2"
          >
            <ChevronsDownUp className="w-4 h-4" />
            Zwiń wszystko
          </button>
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text2)] text-sm font-semibold hover:bg-[var(--bg2)] inline-flex items-center gap-2"
          >
            <ChevronsUpDown className="w-4 h-4" />
            Rozwiń wszystko
          </button>
          <button
            type="button"
            onClick={resetWidths}
            className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text2)] text-sm font-semibold hover:bg-[var(--bg2)] inline-flex items-center gap-2"
            title="Reset szerokości"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => addChild("root")}
            className="px-3 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-95 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nowy węzeł
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          <div className="inline-flex min-w-max items-center">
            <MindMapTree
              mode="edit"
              rootNode={rootNode}
              getColW={getColW}
              startResize={startResize}
              selId={selId}
              editId={editId}
              ctxId={ctxId}
              dragId={dragId}
              dropId={dropId}
              onSelect={(id) => {
                setCtxId(null);
                setSelId(id);
              }}
              onToggleCollapsed={toggleCollapsed}
              onStartEdit={(id) => {
                setCtxId(null);
                setEditId(id);
              }}
              onCommitLabel={commitLabel}
              onToggleCtx={(id) => setCtxId((prev) => (prev === id ? null : id))}
              onAddChild={addChild}
              onInsertAbove={insertAbove}
              onRequestDelete={requestDelete}
              onOpenAI={openAI}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          </div>
        </div>

        <div className="h-56 border-t border-[var(--border)] bg-[var(--surface)] flex overflow-hidden">
          <div className="w-60 flex-shrink-0 border-r border-[var(--border)] p-4 overflow-hidden">
            {!selectedNode ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--text3)] font-semibold text-center">
                Kliknij węzeł aby zobaczyć i edytować notatki
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text3)] font-bold">
                    Wybrany węzeł
                  </div>
                  <div className="font-bold truncate">{selectedNode.label}</div>
                  <div className="text-xs text-[var(--text3)]">
                    {selectedNode.children.length} elementów
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addChild(selectedNode.id)}
                  className="px-3 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] text-sm font-semibold hover:bg-[var(--bg3)] inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Dodaj dziecko
                </button>
                {selectedNode.id !== "root" && (
                  <button
                    type="button"
                    onClick={() => insertAbove(selectedNode.id)}
                    className="px-3 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] text-sm font-semibold hover:bg-[var(--bg3)] inline-flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Wstaw powyżej
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 p-4 overflow-hidden flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-widest text-[var(--text3)] font-bold">
              Notatki
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {selectedNode ? (
                <NoteEditor
                  content={selectedNode.note ?? ""}
                  onContentChange={updateSelectedNote}
                  className="h-full"
                />
              ) : (
                <div className="h-full border border-[var(--border)] rounded-xl bg-[var(--surface)] flex items-center justify-center text-sm text-[var(--text3)]">
                  Wybierz węzeł, żeby edytować notatkę.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface)] flex items-center gap-3 text-xs text-[var(--text3)]">
        <div className="inline-flex items-center gap-2">
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
          <span className="font-semibold">{isSaving ? "Zapisywanie…" : "Zapisane"}</span>
          {lastSavedAt ? <span>· {new Date(lastSavedAt).toLocaleTimeString()}</span> : null}
        </div>
      </div>

      <MindMapDeleteModal
        open={Boolean(deleteNodeId)}
        node={deleteNodeId ? findNode(rootNode, deleteNodeId) : null}
        onClose={() => setDeleteNodeId(null)}
        onConfirm={(keep) => {
          if (!deleteNodeId) return;
          confirmDelete(deleteNodeId, keep);
        }}
      />

      <MindMapAIModal
        open={Boolean(aiParentId)}
        apiFetch={apiFetch}
        onClose={() => setAiParentId(null)}
        onAccept={(result) => {
          if (!aiParentId) return;
          acceptAI(aiParentId, result);
        }}
      />
    </div>
  );
}

function MindMapDeleteModal({
  open,
  node,
  onClose,
  onConfirm,
}: {
  open: boolean;
  node: MindMapNode | null;
  onClose: () => void;
  onConfirm: (keepChildren: boolean) => void;
}) {
  if (!open) return null;
  const hasKids = (node?.children?.length ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-bold">Usuń węzeł</div>
        <div className="mt-1 text-sm text-[var(--text3)]">
          {hasKids ? "Ten węzeł ma elementy podrzędne." : "Czy na pewno chcesz usunąć ten węzeł?"}
        </div>

        <div className="mt-5 flex gap-2">
          {!hasKids ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:bg-[var(--bg3)]"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => onConfirm(false)}
                className="flex-1 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold text-sm hover:bg-red-100"
              >
                Usuń
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onConfirm(true)}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:bg-[var(--bg3)] text-left"
              >
                <div className="font-bold">Usuń tylko ten węzeł</div>
                <div className="text-xs text-[var(--text3)]">dzieci awansują poziom wyżej</div>
              </button>
              <button
                type="button"
                onClick={() => onConfirm(false)}
                className="flex-1 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold text-sm hover:bg-red-100 text-left"
              >
                <div className="font-bold">Usuń całą gałąź</div>
                <div className="text-xs opacity-80">wszystkie dzieci usunięte</div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MindMapAIModal({
  open,
  apiFetch,
  onClose,
  onAccept,
}: {
  open: boolean;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onAccept: (result: AINodeResult) => void;
}) {
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AINodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setIsLoading(false);
      setResult(null);
      setError(null);
    }
  }, [open]);

  const doSearch = useCallback(async () => {
    if (!isNonEmptyString(q)) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch("/api/mind-maps/ai-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim() }),
      });
      if (!res.ok) {
        setError("Nie udało się pobrać odpowiedzi AI.");
        return;
      }
      const data = (await res.json()) as AINodeResult;
      if (!isNonEmptyString(data?.label) || !isNonEmptyString(data?.description)) {
        setError("AI zwróciło niepoprawny format.");
        return;
      }
      setResult({ label: data.label, description: data.description });
    } catch {
      setError("Wystąpił błąd podczas wywołania AI.");
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-bold">✦ Dodaj przez AI</div>
        <div className="mt-1 text-sm text-[var(--text3)]">
          AI wyszuka opis narzędzia/pojęcia i zaproponuje węzeł do zatwierdzenia.
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void doSearch();
            }}
            placeholder="np. LangChain, CrewAI, Pinecone…"
            className="flex-1 h-10 px-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-sky-400"
          />
          <button
            type="button"
            onClick={() => void doSearch()}
            disabled={isLoading || !q.trim()}
            className="px-4 h-10 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Szukaj
          </button>
        </div>

        {error ? (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl p-3">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-4">
            <div className="border border-[var(--border)] rounded-2xl bg-[var(--bg2)] p-4">
              <div className="font-bold">{result.label}</div>
              <div className="mt-1 text-sm text-[var(--text2)] leading-relaxed">
                {result.description}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => onAccept(result)}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:opacity-95"
              >
                Dodaj do mapy ✓
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:bg-[var(--bg3)]"
              >
                Anuluj
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-xs text-[var(--text3)] text-center">
            Wpisz nazwę i naciśnij Enter.
          </div>
        )}
      </div>
    </div>
  );
}

function MindMapImportModal({
  open,
  apiFetch,
  onClose,
  onCreatedNew,
  onRefreshList,
}: {
  open: boolean;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onCreatedNew: (id: string) => void;
  onRefreshList: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rootNode, setRootNode] = useState<MindMapNode | null>(null);

  useEffect(() => {
    if (!open) {
      setText("");
      setFile(null);
      setIsAnalyzing(false);
      setIsSaving(false);
      setError(null);
      setRootNode(null);
    }
  }, [open]);

  const doAnalyze = useCallback(async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setRootNode(null);
    try {
      const fd = new FormData();
      fd.set("structureText", text.trim());
      if (file) fd.set("image", file);

      const res = await apiFetch("/api/mind-maps/import", { method: "POST", body: fd });
      if (!res.ok) {
        setError("Nie udało się przeanalizować struktury.");
        return;
      }
      const data = (await res.json()) as { rootNode?: MindMapNode };
      if (!data?.rootNode) {
        setError("AI zwróciło niepoprawny format.");
        return;
      }
      setRootNode(data.rootNode);
    } catch {
      setError("Wystąpił błąd podczas analizy.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [apiFetch, file, text]);

  const doSaveAsNew = useCallback(async () => {
    if (!rootNode) return;
    setIsSaving(true);
    setError(null);
    try {
      const createRes = await apiFetch("/api/mind-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: rootNode.label || "Importowana mapa" }),
      });
      if (!createRes.ok) {
        setError("Nie udało się utworzyć nowej mapy.");
        return;
      }
      const created = (await createRes.json()) as MindMap;
      const saveRes = await apiFetch(`/api/mind-maps/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootNode, colWidths: {}, title: rootNode.label }),
      });
      if (!saveRes.ok) {
        setError("Nie udało się zapisać mapy.");
        return;
      }
      await onRefreshList();
      onCreatedNew(created.id);
      onClose();
    } catch {
      setError("Wystąpił błąd podczas zapisu.");
    } finally {
      setIsSaving(false);
    }
  }, [apiFetch, onClose, onCreatedNew, onRefreshList, rootNode]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-bold">Importuj mapę</div>
        <div className="mt-1 text-sm text-[var(--text3)]">
          Wklej tekst/strukturę. Opcjonalnie dołącz screenshot mapy.
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3 min-w-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Np.:\n- AI\n  - LLM\n  - Embeddings\n- RAG\n  - Chunking\n  - Retrieval"
              className="w-full h-48 p-3 rounded-2xl bg-[var(--bg2)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-sky-400 resize-none"
            />

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-[var(--text2)]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <span className="px-3 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] hover:bg-[var(--bg3)] cursor-pointer inline-block">
                  {file ? `Obraz: ${file.name}` : "Dodaj obraz (opcjonalnie)"}
                </span>
              </label>

              {file ? (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs font-semibold text-red-700 hover:underline"
                >
                  Usuń obraz
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void doAnalyze()}
              disabled={isAnalyzing || !text.trim()}
              className="px-4 h-10 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Analizuj
            </button>

            {error ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl p-3">
                {error}
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-[var(--text3)] font-bold">
              Podgląd
            </div>
            <div className="mt-2 border border-[var(--border)] rounded-2xl bg-[var(--bg2)] p-3 overflow-auto h-72">
              {rootNode ? (
                <div className="inline-flex min-w-max items-center">
                  <MindMapTree mode="readOnly" rootNode={rootNode} allowCollapse />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-[var(--text3)] font-semibold text-center">
                  Najpierw kliknij „Analizuj”, żeby zobaczyć drzewo.
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void doSaveAsNew()}
                disabled={!rootNode || isSaving}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60"
              >
                {isSaving ? "Zapisywanie…" : "Zapisz jako nową mapę"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:bg-[var(--bg3)]"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
