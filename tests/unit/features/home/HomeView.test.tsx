import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, test, expect } from "vitest";
import HomeView from "@/src/features/home/HomeView";
import { translations } from "@/src/translations";

vi.mock("@/src/components/ActivityLog", () => ({
  ActivityLog: () => <div data-testid="activity-log" />,
}));

const t = translations["pl"];

const mockApiFetch = vi.fn();

beforeEach(() => {
  mockApiFetch.mockResolvedValue({
    ok: true,
    json: async () => [],
  });
});

test("renders stats row with zero counts when no nodes", async () => {
  render(
    <HomeView
      user={{ id: "1", email: "test@test.com", name: "Test" }}
      apiFetch={mockApiFetch}
      lang="pl"
      t={t}
      setAppMode={vi.fn()}
    />
  );
  await waitFor(() => {
    expect(screen.getAllByText(t.homeTodayTasks).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t.homeUpcoming).length).toBeGreaterThan(0);
  });
});

test("renders today's tasks filtered by dueDate", async () => {
  const today = new Date().toISOString().split("T")[0];
  mockApiFetch.mockResolvedValue({
    ok: true,
    json: async () => [
      { id: "1", type: "task", title: "Wyślij fakturę", dueDate: today, content: "" },
      { id: "2", type: "task", title: "Stare zadanie", dueDate: "2020-01-01", content: "" },
    ],
  });
  render(
    <HomeView
      user={{ id: "1", email: "test@test.com", name: "Test" }}
      apiFetch={mockApiFetch}
      lang="pl"
      t={t}
      setAppMode={vi.fn()}
    />
  );
  await waitFor(() => {
    expect(screen.getByText("Wyślij fakturę")).toBeInTheDocument();
    expect(screen.queryByText("Stare zadanie")).not.toBeInTheDocument();
  });
});
