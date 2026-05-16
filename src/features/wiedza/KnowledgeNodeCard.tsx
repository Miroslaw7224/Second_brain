import React, { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type KnowledgeNodeType = "note" | "task" | "resource" | "chat" | "document" | "event";

export interface KnowledgeNodeData {
  label: string;
  type: KnowledgeNodeType;
  selected: boolean;
  tags?: string[];
  [key: string]: unknown;
}

export type KnowledgeNode = Node<KnowledgeNodeData>;

const NODE_COLORS: Record<KnowledgeNodeType, { bg: string; border: string; text: string }> = {
  chat: { bg: "rgba(96,165,250,0.15)", border: "#60a5fa", text: "#93c5fd" },
  note: { bg: "rgba(124,109,255,0.15)", border: "#7c6dff", text: "#a395ff" },
  task: { bg: "rgba(52,211,153,0.15)", border: "#34d399", text: "#6ee7b7" },
  resource: { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", text: "#fcd34d" },
  event: { bg: "rgba(248,113,113,0.15)", border: "#f87171", text: "#fca5a5" },
  document: { bg: "rgba(192,132,252,0.15)", border: "#c084fc", text: "#d8b4fe" },
};

const TYPE_ICONS: Record<KnowledgeNodeType, string> = {
  chat: "💬",
  note: "📝",
  task: "✅",
  resource: "🔗",
  event: "📅",
  document: "📄",
};

export const KnowledgeNodeCard = memo(function KnowledgeNodeCard({
  data,
  selected,
}: NodeProps<KnowledgeNode>) {
  const colors = NODE_COLORS[data.type] ?? NODE_COLORS.note;

  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${selected ? "#7c6dff" : colors.border}`,
        boxShadow: selected ? `0 0 0 2px rgba(124,109,255,0.4)` : undefined,
      }}
      className="rounded-xl px-3 py-2 min-w-[100px] max-w-[160px] cursor-pointer"
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-xs">{TYPE_ICONS[data.type]}</span>
        <span
          className="text-[9px] font-bold uppercase tracking-wide"
          style={{ color: colors.text }}
        >
          {data.type}
        </span>
      </div>
      <p
        className="text-xs font-semibold leading-tight"
        style={{
          color: "var(--text)",
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={data.label}
      >
        {data.label}
      </p>
      {data.tags && data.tags.length > 0 && (
        <p className="text-[9px] mt-0.5" style={{ color: "var(--text3)" }}>
          {data.tags.slice(0, 2).join(", ")}
        </p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />
    </div>
  );
});
