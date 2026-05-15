import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, afterEach } from "vitest";

// Mock heavy sub-components
vi.mock("@/features/knowledge/KnowledgeChatPanel", () => ({
  KnowledgeChatPanel: () => <div data-testid="chat-panel">Chat Panel</div>,
}));
vi.mock("@/features/knowledge/KnowledgeListView", () => ({
  KnowledgeListView: () => <div data-testid="list-view">List View</div>,
}));
vi.mock("@/features/knowledge/KnowledgeGraphView", () => ({
  KnowledgeGraphView: () => <div data-testid="graph-view">Graph View</div>,
}));

import { KnowledgeView } from "@/features/knowledge/KnowledgeView";

afterEach(() => cleanup());

// Helper: get the wrapper div that directly contains a panel test-id element
function getPanelWrapper(testId: string): HTMLElement {
  // The panel div has a parent div that carries the "hidden" class when inactive
  return screen.getByTestId(testId).parentElement as HTMLElement;
}

describe("KnowledgeView", () => {
  const apiFetch = vi.fn();

  it("renders all three tab buttons", () => {
    render(<KnowledgeView apiFetch={apiFetch} lang="pl" />);
    expect(screen.getByRole("button", { name: /chat ai/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lista/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /graf/i })).toBeInTheDocument();
  });

  it("renders all panels in the DOM (all stay mounted)", () => {
    render(<KnowledgeView apiFetch={apiFetch} lang="pl" />);
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
    expect(screen.getByTestId("list-view")).toBeInTheDocument();
    expect(screen.getByTestId("graph-view")).toBeInTheDocument();
  });

  it("chat panel wrapper has no hidden class by default", () => {
    render(<KnowledgeView apiFetch={apiFetch} lang="pl" />);
    expect(getPanelWrapper("chat-panel")).not.toHaveClass("hidden");
  });

  it("list and graph panel wrappers are hidden by default", () => {
    render(<KnowledgeView apiFetch={apiFetch} lang="pl" />);
    expect(getPanelWrapper("list-view")).toHaveClass("hidden");
    expect(getPanelWrapper("graph-view")).toHaveClass("hidden");
  });

  it("switches to list view when Lista tab is clicked", async () => {
    const user = userEvent.setup();
    render(<KnowledgeView apiFetch={apiFetch} lang="pl" />);

    const listaTab = screen.getByRole("button", { name: /lista/i });
    await user.click(listaTab);

    expect(getPanelWrapper("list-view")).not.toHaveClass("hidden");
    expect(getPanelWrapper("chat-panel")).toHaveClass("hidden");
    expect(getPanelWrapper("graph-view")).toHaveClass("hidden");
  });

  it("switches to graph view when Graf tab is clicked", async () => {
    const user = userEvent.setup();
    render(<KnowledgeView apiFetch={apiFetch} lang="pl" />);

    const grafTab = screen.getByRole("button", { name: /graf/i });
    await user.click(grafTab);

    expect(getPanelWrapper("graph-view")).not.toHaveClass("hidden");
    expect(getPanelWrapper("chat-panel")).toHaveClass("hidden");
    expect(getPanelWrapper("list-view")).toHaveClass("hidden");
  });

  it("can switch back to chat from another tab", async () => {
    const user = userEvent.setup();
    render(<KnowledgeView apiFetch={apiFetch} lang="pl" />);

    await user.click(screen.getByRole("button", { name: /lista/i }));
    await user.click(screen.getByRole("button", { name: /chat ai/i }));

    expect(getPanelWrapper("chat-panel")).not.toHaveClass("hidden");
    expect(getPanelWrapper("list-view")).toHaveClass("hidden");
  });

  it("renders English tab labels when lang is en", () => {
    render(<KnowledgeView apiFetch={apiFetch} lang="en" />);
    expect(screen.getByRole("button", { name: /ai chat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /graph/i })).toBeInTheDocument();
  });
});
