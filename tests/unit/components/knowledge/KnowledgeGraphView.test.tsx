import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock @xyflow/react — doesn't work in jsdom without DOM APIs
vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ nodes, onNodeClick }: any) => (
    <div data-testid="react-flow">
      {nodes.map((n: any) => (
        <button key={n.id} data-testid={`graph-node-${n.id}`} onClick={() => onNodeClick?.({}, n)}>
          {n.data?.node?.title ?? n.id}
        </button>
      ))}
    </div>
  ),
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Handle: () => null,
  useNodesState: (initial: any[]) => {
    const [state, setState] = React.useState(initial);
    return [state, setState, () => {}];
  },
  useEdgesState: (initial: any[]) => {
    const [state, setState] = React.useState(initial);
    return [state, setState, () => {}];
  },
  BackgroundVariant: { Lines: "lines", Dots: "dots", Cross: "cross" },
  Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
}));

vi.mock("@/features/knowledge/KnowledgeNodePanel", () => ({
  KnowledgeNodePanel: () => <div data-testid="knowledge-node-panel" />,
}));

import { KnowledgeGraphView } from "@/features/knowledge/KnowledgeGraphView";

const fakeNodes = [
  {
    id: "n1",
    type: "note" as const,
    title: "Węzeł A",
    content: "Treść A",
    tags: [],
    sources: [],
    embedding: [],
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any,
    createdBy: "user" as const,
  },
  {
    id: "n2",
    type: "task" as const,
    title: "Węzeł B",
    content: "Treść B",
    tags: [],
    sources: [],
    embedding: [],
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any,
    createdBy: "ai" as const,
  },
];

describe("KnowledgeGraphView", () => {
  let mockApiFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ nodes: fakeNodes }) }) // nodes
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ edges: [] }) }); // edges
  });

  afterEach(() => {
    cleanup();
  });

  it("renderuje graf z węzłami", async () => {
    render(<KnowledgeGraphView apiFetch={mockApiFetch} lang="pl" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("react-flow")).toBeInTheDocument();
      expect(screen.getByTestId("graph-node-n1")).toBeInTheDocument();
      expect(screen.getByTestId("graph-node-n2")).toBeInTheDocument();
    });
  });

  it("otwiera panel boczny po kliknięciu węzła", async () => {
    const user = userEvent.setup();
    render(<KnowledgeGraphView apiFetch={mockApiFetch} lang="pl" onClose={() => {}} />);

    await waitFor(() => screen.getByTestId("graph-node-n1"));

    await user.click(screen.getByTestId("graph-node-n1"));

    expect(screen.getByTestId("knowledge-node-panel")).toBeInTheDocument();
  });

  it("wywołuje onClose po kliknięciu przycisku wstecz", async () => {
    const onClose = vi.fn();
    render(<KnowledgeGraphView apiFetch={mockApiFetch} lang="pl" onClose={onClose} />);

    await waitFor(() => screen.getByText(/wróć do listy/i));

    await userEvent.click(screen.getByText(/wróć do listy/i));

    expect(onClose).toHaveBeenCalled();
  });
});
