import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { vi, test, expect, afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
import { KnowledgeNodeCard } from "@/src/features/wiedza/KnowledgeNodeCard";

vi.mock("@xyflow/react", () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-handle-type={type} data-handle-position={position} />
  ),
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
}));

const baseProps = {
  id: "n1",
  data: { label: "Test note", type: "note" as const, selected: false },
  selected: false,
  isConnectable: true,
  dragging: false,
  type: "knowledgeNode",
  xPos: 0,
  yPos: 0,
  zIndex: 0,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

test("renders node title", () => {
  render(<KnowledgeNodeCard {...baseProps} />);
  expect(screen.getByText("Test note")).toBeInTheDocument();
});

test("renders correct type badge", () => {
  render(<KnowledgeNodeCard {...baseProps} />);
  expect(screen.getByText("note")).toBeInTheDocument();
});
