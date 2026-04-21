import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/src/components/theme/ThemeProvider";
import { ThemeToggle } from "@/src/components/theme/ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: /prefers-color-scheme:\s*dark/.test(String(query)),
        media: String(query),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
  });

  it("renders toggle with dark-mode label initially", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Włącz tryb jasny/i })[0]).toBeInTheDocument();
    });
  });

  it("calls toggle and updates aria-label for light theme", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const btn = (await screen.findAllByRole("button", { name: /Włącz tryb jasny/i }))[0];
    await user.click(btn);
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Włącz tryb ciemny/i })[0]).toBeInTheDocument();
    });
  });
});
