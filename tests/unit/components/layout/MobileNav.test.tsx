import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi, test, expect, beforeEach } from "vitest";
import { MobileNav } from "@/src/components/layout/MobileNav";

beforeEach(() => cleanup());

test("renders 5 nav tabs", () => {
  render(<MobileNav appMode="home" setAppMode={vi.fn()} lang="pl" onMoreOpen={vi.fn()} />);
  expect(screen.getByLabelText("Home")).toBeInTheDocument();
  expect(screen.getByLabelText("Wiedza")).toBeInTheDocument();
  expect(screen.getByLabelText("Zadania")).toBeInTheDocument();
  expect(screen.getByLabelText("Notatki")).toBeInTheDocument();
  expect(screen.getByLabelText("Więcej")).toBeInTheDocument();
});

test("calls setAppMode with 'home' when Home tab clicked", () => {
  const setAppMode = vi.fn();
  render(<MobileNav appMode="wiedza" setAppMode={setAppMode} lang="pl" onMoreOpen={vi.fn()} />);
  fireEvent.click(screen.getByLabelText("Home"));
  expect(setAppMode).toHaveBeenCalledWith("home");
});
