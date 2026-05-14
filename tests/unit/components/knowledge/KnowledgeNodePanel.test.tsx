import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { KnowledgeNodePanel } from "@/features/knowledge/KnowledgeNodePanel";

const fakeNode = {
  id: "n1",
  type: "note" as const,
  title: "Notatka testowa",
  content: "Treść notatki z ważnymi informacjami.",
  tags: ["tag1", "tag2"],
  sources: [{ title: "Źródło", url: "https://example.com" }],
  embedding: [],
  createdAt: { toDate: () => new Date("2026-01-01") } as any,
  updatedAt: { toDate: () => new Date("2026-01-02") } as any,
  createdBy: "user" as const,
};

const fakeEdges = [
  {
    id: "e1",
    fromNodeId: "n1",
    toNodeId: "n2",
    relation: "related" as const,
    strength: 0.85,
    createdAt: { toDate: () => new Date() } as any,
  },
];

const mockApiFetch = vi.fn();

describe("KnowledgeNodePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeEdges),
    });
  });

  it("wyświetla tytuł i treść węzła", () => {
    render(<KnowledgeNodePanel node={fakeNode} apiFetch={mockApiFetch} onClose={() => {}} />);

    expect(screen.getByText("Notatka testowa")).toBeInTheDocument();
    expect(screen.getByText("Treść notatki z ważnymi informacjami.")).toBeInTheDocument();
  });

  it("wyświetla tagi węzła", () => {
    render(<KnowledgeNodePanel node={fakeNode} apiFetch={mockApiFetch} onClose={() => {}} />);

    const allTags = screen.getAllByText(/^#/);
    expect(allTags.length).toBeGreaterThanOrEqual(2);
  });

  it("ładuje i wyświetla połączenia", async () => {
    render(<KnowledgeNodePanel node={fakeNode} apiFetch={mockApiFetch} onClose={() => {}} />);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api/knowledge/edges?nodeId=n1");
    });

    await waitFor(() => {
      const strengthElements = screen.getAllByText(/0\.85/);
      expect(strengthElements.length).toBeGreaterThan(0);
    });
  });

  it("wywołuje onClose po kliknięciu przycisku zamknięcia", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <KnowledgeNodePanel node={fakeNode} apiFetch={mockApiFetch} onClose={onClose} />
    );

    const buttons = container.querySelectorAll('button[aria-label="Zamknij"]');
    await userEvent.click(buttons[0]);

    expect(onClose).toHaveBeenCalled();
  });

  it("ma data-testid dla testów integracyjnych", () => {
    render(<KnowledgeNodePanel node={fakeNode} apiFetch={mockApiFetch} onClose={() => {}} />);

    const panels = screen.getAllByTestId("knowledge-node-panel");
    expect(panels.length).toBeGreaterThan(0);
  });
});
