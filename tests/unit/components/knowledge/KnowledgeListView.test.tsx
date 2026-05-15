import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { KnowledgeListView } from "@/features/knowledge/KnowledgeListView";

const fakeNodes = [
  {
    id: "n1",
    type: "note" as const,
    title: "Notatka testowa",
    content: "Treść notatki",
    tags: ["test"],
    sources: [],
    embedding: [],
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any,
    createdBy: "user" as const,
  },
  {
    id: "n2",
    type: "task" as const,
    title: "Zadanie do zrobienia",
    content: "Opis zadania",
    tags: [],
    sources: [],
    embedding: [],
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any,
    createdBy: "ai" as const,
  },
];

const mockApiFetch = vi.fn();

describe("KnowledgeListView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nodes: fakeNodes }),
    });
  });

  it("renderuje listę węzłów po załadowaniu", async () => {
    render(<KnowledgeListView apiFetch={mockApiFetch} lang="pl" onShowGraph={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Notatka testowa")).toBeInTheDocument();
      expect(screen.getByText("Zadanie do zrobienia")).toBeInTheDocument();
    });
  });

  it("otwiera panel po kliknięciu węzła", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nodes: fakeNodes }),
    });

    render(<KnowledgeListView apiFetch={mockApiFetch} lang="pl" onShowGraph={() => {}} />);

    await waitFor(() => screen.getAllByText("Notatka testowa"));

    const nodeTitle = screen.getAllByText("Notatka testowa")[0];
    await user.click(nodeTitle);

    expect(screen.getByTestId("knowledge-node-panel")).toBeInTheDocument();
  });

  it("wyświetla przycisk 'Pokaż graf'", async () => {
    render(<KnowledgeListView apiFetch={mockApiFetch} lang="pl" onShowGraph={() => {}} />);

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    const buttons = screen.getAllByRole("button");
    const graphBtn = buttons.find((btn) => btn.textContent?.includes("Pokaż graf"));
    expect(graphBtn).toBeDefined();
  });
});
