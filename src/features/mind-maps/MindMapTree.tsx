"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ChevronRight, GripVertical, Loader2, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import type { MindMapNode } from "@/src/features/mind-maps/mindMapTypes";
import { DEFAULT_COL_W, MAX_COL_W, MIN_COL_W } from "@/src/features/mind-maps/mindMapTypes";
import { leafCount, mapNode } from "@/src/lib/mindMapUtils";

const ROW_H = 38;
const GAP_H = 8;
const CONN = 24;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type MindMapTreeEditableProps = {
  mode: "edit";
  rootNode: MindMapNode;
  getColW: (depth: number) => number;
  startResize: (e: React.MouseEvent, depth: number) => void;
  selId: string | null;
  editId: string | null;
  ctxId: string | null;
  dragId: string | null;
  dropId: string | null;
  onSelect: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
  onStartEdit: (id: string) => void;
  onCommitLabel: (id: string, next: string) => void;
  onToggleCtx: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onInsertAbove: (childId: string) => void;
  onRequestDelete: (id: string) => void;
  onOpenAI: (parentId: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (targetId: string) => void;
  onDragEnd: () => void;
};

export type MindMapTreeReadOnlyProps = {
  mode: "readOnly";
  rootNode: MindMapNode;
  /** Optional fixed width for all depths in preview. */
  colW?: number;
  /** Allow collapsing/expanding branches in preview (local state only). */
  allowCollapse?: boolean;
};

export type MindMapTreeProps = MindMapTreeEditableProps | MindMapTreeReadOnlyProps;

export function MindMapTree(props: MindMapTreeProps) {
  if (props.mode === "readOnly") {
    return (
      <MindMapTreeReadOnly
        rootNode={props.rootNode}
        colW={props.colW}
        allowCollapse={props.allowCollapse}
      />
    );
  }

  return (
    <TreeLevel
      mode="edit"
      node={props.rootNode}
      isRoot
      depth={0}
      getColW={props.getColW}
      startResize={props.startResize}
      selId={props.selId}
      editId={props.editId}
      ctxId={props.ctxId}
      dragId={props.dragId}
      dropId={props.dropId}
      onSelect={props.onSelect}
      onToggleCollapsed={props.onToggleCollapsed}
      onStartEdit={props.onStartEdit}
      onCommitLabel={props.onCommitLabel}
      onToggleCtx={props.onToggleCtx}
      onAddChild={props.onAddChild}
      onInsertAbove={props.onInsertAbove}
      onRequestDelete={props.onRequestDelete}
      onOpenAI={props.onOpenAI}
      onDragStart={props.onDragStart}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
      onDragEnd={props.onDragEnd}
    />
  );
}

function MindMapTreeReadOnly({
  rootNode,
  colW,
  allowCollapse,
}: {
  rootNode: MindMapNode;
  colW?: number;
  allowCollapse?: boolean;
}) {
  const fixedW = clamp(colW ?? DEFAULT_COL_W, MIN_COL_W, MAX_COL_W);
  const getColW = useCallback(() => fixedW, [fixedW]);
  const [localRoot, setLocalRoot] = useState<MindMapNode>(rootNode);

  // Keep a stable preview after analysis; if caller passes a new root, refresh local state.
  useMemo(() => {
    setLocalRoot(rootNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootNode.id]);

  const toggleCollapsed = useCallback(
    (id: string) => {
      if (!allowCollapse) return;
      setLocalRoot((prev) => mapNode(prev, id, (n) => ({ ...n, collapsed: !n.collapsed })));
    },
    [allowCollapse]
  );

  return (
    <TreeLevel
      mode="readOnly"
      node={localRoot}
      isRoot
      depth={0}
      getColW={getColW}
      startResize={() => {}}
      selId={null}
      editId={null}
      ctxId={null}
      dragId={null}
      dropId={null}
      onSelect={() => {}}
      onToggleCollapsed={toggleCollapsed}
      onStartEdit={() => {}}
      onCommitLabel={() => {}}
      onToggleCtx={() => {}}
      onAddChild={() => {}}
      onInsertAbove={() => {}}
      onRequestDelete={() => {}}
      onOpenAI={() => {}}
      onDragStart={() => {}}
      onDragOver={() => {}}
      onDrop={() => {}}
      onDragEnd={() => {}}
    />
  );
}

function TreeLevel(props: {
  mode: "edit" | "readOnly";
  node: MindMapNode;
  isRoot: boolean;
  depth: number;
  getColW: (depth: number) => number;
  startResize: (e: React.MouseEvent, depth: number) => void;
  selId: string | null;
  editId: string | null;
  ctxId: string | null;
  dragId: string | null;
  dropId: string | null;
  onSelect: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
  onStartEdit: (id: string) => void;
  onCommitLabel: (id: string, next: string) => void;
  onToggleCtx: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onInsertAbove: (childId: string) => void;
  onRequestDelete: (id: string) => void;
  onOpenAI: (parentId: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (targetId: string) => void;
  onDragEnd: () => void;
}) {
  const { node, isRoot, depth } = props;
  const lc = leafCount(node);
  const totalH = lc * ROW_H + (lc - 1) * GAP_H;
  const hasKids = node.children.length > 0 && !node.collapsed;

  const firstLC = hasKids ? leafCount(node.children[0]) : 1;
  const lastLC = hasKids ? leafCount(node.children[node.children.length - 1]) : 1;
  const vTop = hasKids ? (firstLC * ROW_H + (firstLC - 1) * GAP_H) / 2 : 0;
  const vBot = hasKids ? totalH - (lastLC * ROW_H + (lastLC - 1) * GAP_H) / 2 : 0;
  const vH = hasKids ? Math.max(0, vBot - vTop) : 0;
  const half = CONN / 2;

  if (!hasKids) {
    return (
      <div style={{ height: ROW_H }} className="flex items-center">
        <NodePill {...props} />
      </div>
    );
  }

  return (
    <div style={{ height: totalH }} className="flex items-center">
      <NodePill {...props} />

      <div style={{ width: CONN, height: totalH }} className="relative flex-shrink-0">
        <div
          style={{ width: half, height: 1, left: 0, top: "50%" }}
          className="absolute -translate-y-1/2 bg-[var(--border)]"
        />
        <div
          style={{ width: 1, height: vH, left: half, top: vTop }}
          className="absolute bg-[var(--border)]"
        />
      </div>

      <div style={{ height: totalH }} className="flex flex-col">
        {node.children.map((c, i) => {
          const clc = leafCount(c);
          const slotH = clc * ROW_H + (clc - 1) * GAP_H;
          return (
            <div
              key={c.id}
              style={{ height: slotH, marginTop: i > 0 ? GAP_H : 0 }}
              className="flex items-center"
            >
              <div
                style={{ width: half, height: 1 }}
                className="bg-[var(--border)] flex-shrink-0"
              />
              <TreeLevel {...props} node={c} isRoot={false} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodePill({
  mode,
  node,
  isRoot,
  depth,
  getColW,
  startResize,
  selId,
  editId,
  ctxId,
  dragId,
  dropId,
  onSelect,
  onToggleCollapsed,
  onStartEdit,
  onCommitLabel,
  onToggleCtx,
  onAddChild,
  onInsertAbove,
  onRequestDelete,
  onOpenAI,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  mode: "edit" | "readOnly";
  node: MindMapNode;
  isRoot: boolean;
  depth: number;
  getColW: (depth: number) => number;
  startResize: (e: React.MouseEvent, depth: number) => void;
  selId: string | null;
  editId: string | null;
  ctxId: string | null;
  dragId: string | null;
  dropId: string | null;
  onSelect: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
  onStartEdit: (id: string) => void;
  onCommitLabel: (id: string, next: string) => void;
  onToggleCtx: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onInsertAbove: (childId: string) => void;
  onRequestDelete: (id: string) => void;
  onOpenAI: (parentId: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (targetId: string) => void;
  onDragEnd: () => void;
}) {
  const hasKids = node.children.length > 0;
  const colW = getColW(depth);
  const editing = mode === "edit" && node.id === editId;
  const sel = mode === "edit" && node.id === selId;
  const isDrag = mode === "edit" && node.id === dragId;
  const isDrop = mode === "edit" && node.id === dropId;

  const iconType = isRoot ? "root" : hasKids ? "branch" : "leaf";
  const iconChar = isRoot ? "✦" : hasKids ? "▤" : "·";

  return (
    <div
      draggable={mode === "edit" && !isRoot}
      onDragStart={(e) => {
        if (mode !== "edit") return;
        if (isRoot) {
          e.preventDefault();
          return;
        }
        onDragStart(node.id);
        e.dataTransfer.effectAllowed = "move";
        e.stopPropagation();
      }}
      onDragOver={(e) => {
        if (mode !== "edit") return;
        e.preventDefault();
        e.stopPropagation();
        onDragOver(node.id);
      }}
      onDrop={(e) => {
        if (mode !== "edit") return;
        e.preventDefault();
        e.stopPropagation();
        onDrop(node.id);
      }}
      onDragEnd={() => (mode === "edit" ? onDragEnd() : undefined)}
      onClick={(e) => {
        e.stopPropagation();
        if (mode === "edit") onSelect(node.id);
      }}
      style={{ width: colW, height: ROW_H }}
      className={[
        "group relative flex items-center gap-2 px-2.5 rounded-xl border transition-colors select-none",
        "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--bg2)]",
        sel ? "border-[var(--accent)] bg-[var(--bg2)]" : "",
        isDrop ? "border-emerald-400 bg-emerald-50" : "",
        isDrag ? "opacity-40" : "",
      ].join(" ")}
    >
      {mode === "edit" && !isRoot ? (
        <div className="text-[var(--text3)] opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4" />
        </div>
      ) : null}

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (hasKids) onToggleCollapsed(node.id);
        }}
        className={[
          "w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text2)]",
          hasKids ? "hover:bg-[var(--bg3)]" : "opacity-0 pointer-events-none",
        ].join(" ")}
        title={hasKids ? (node.collapsed ? "Rozwiń" : "Zwiń") : ""}
      >
        <ChevronRight
          className={["w-4 h-4 transition-transform", node.collapsed ? "" : "rotate-90"].join(" ")}
        />
      </button>

      <div
        className={[
          "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0",
          iconType === "root"
            ? "bg-blue-50 text-blue-700"
            : iconType === "branch"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-[var(--bg3)] text-[var(--text2)]",
        ].join(" ")}
      >
        {iconChar}
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            defaultValue={node.label}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitLabel(node.id, (e.target as HTMLInputElement).value);
              if (e.key === "Escape") {
                e.preventDefault();
                onStartEdit("");
              }
            }}
            onBlur={(e) => onCommitLabel(node.id, e.currentTarget.value)}
            className="w-full h-8 px-2 rounded-lg border border-[var(--accent)] bg-[var(--surface)] text-sm text-[var(--text)] outline-none"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={(e) => {
              if (mode !== "edit") return;
              e.preventDefault();
              e.stopPropagation();
              onStartEdit(node.id);
            }}
            className={[
              "w-full text-left truncate text-sm",
              isRoot
                ? "font-bold text-[var(--accent)]"
                : hasKids
                  ? "font-semibold text-[var(--text)]"
                  : "text-[var(--text)]",
            ].join(" ")}
          >
            {node.label}
          </button>
        )}
      </div>

      {Boolean(node.note) && !editing ? (
        <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
      ) : null}

      {mode === "edit" && !editing ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddChild(node.id);
            }}
            className="w-7 h-7 rounded-lg hover:bg-[var(--bg3)] text-emerald-700 inline-flex items-center justify-center"
            title="Dodaj dziecko"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenAI(node.id);
            }}
            className="w-7 h-7 rounded-lg hover:bg-[var(--bg3)] text-sky-700 inline-flex items-center justify-center"
            title="Dodaj przez AI"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleCtx(node.id);
            }}
            className="w-7 h-7 rounded-lg hover:bg-[var(--bg3)] text-[var(--text2)] inline-flex items-center justify-center"
            title="Więcej"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {mode === "edit" && ctxId === node.id ? (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-56 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-lg p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {!isRoot ? (
            <button
              type="button"
              onClick={() => onInsertAbove(node.id)}
              className="w-full px-3 py-2 rounded-xl text-left text-sm font-semibold hover:bg-[var(--bg2)] text-[var(--text)]"
            >
              ↑ Wstaw węzeł powyżej
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onStartEdit(node.id)}
            className="w-full px-3 py-2 rounded-xl text-left text-sm font-semibold hover:bg-[var(--bg2)] text-[var(--text)]"
          >
            ✎ Zmień nazwę
          </button>
          {!isRoot ? (
            <button
              type="button"
              onClick={() => onRequestDelete(node.id)}
              className="w-full px-3 py-2 rounded-xl text-left text-sm font-semibold hover:bg-red-50 text-red-700"
            >
              ✕ Usuń węzeł
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === "edit" ? (
        <div
          onMouseDown={(e) => startResize(e, depth)}
          className="absolute right-0 top-0 h-full w-3 cursor-col-resize opacity-0 hover:opacity-100 transition-opacity"
          title="Zmień szerokość kolumny"
        >
          <div className="absolute right-1 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded bg-[var(--border)]" />
        </div>
      ) : null}
    </div>
  );
}

// Keep these exports referenced in the file to avoid tree-shaking surprises in dev hot reload.
// (No runtime impact; also helps prevent unused-import lints in some setups.)
export const __MindMapTreeDevOnly = { Loader2 };
