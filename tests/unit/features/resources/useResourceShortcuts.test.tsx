import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useResourceShortcuts } from "@/src/features/resources/useResourceShortcuts";

afterEach(cleanup);

function Harness({ onClear, enabled = true }: { onClear: () => void; enabled?: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);
  useResourceShortcuts({ searchRef: ref, onClear, enabled });
  return (
    <div>
      <input ref={ref} aria-label="szukaj" />
      <textarea aria-label="inne" />
      <button type="button">btn</button>
    </div>
  );
}

describe("useResourceShortcuts", () => {
  it("/ przenosi fokus do wyszukiwarki", async () => {
    const user = userEvent.setup();
    render(<Harness onClear={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "btn" }));
    await user.keyboard("/");
    expect(screen.getByLabelText("szukaj")).toHaveFocus();
    expect(screen.getByLabelText("szukaj")).toHaveValue("");
  });

  it("/ w polu tekstowym wpisuje znak i nie zmienia fokusu", async () => {
    const user = userEvent.setup();
    render(<Harness onClear={vi.fn()} />);
    await user.click(screen.getByLabelText("inne"));
    await user.keyboard("/");
    expect(screen.getByLabelText("inne")).toHaveFocus();
    expect(screen.getByLabelText("inne")).toHaveValue("/");
  });

  it("Esc woła onClear i zdejmuje fokus z wyszukiwarki", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<Harness onClear={onClear} />);
    await user.click(screen.getByLabelText("szukaj"));
    await user.keyboard("{Escape}");
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("szukaj")).not.toHaveFocus();
  });

  it("Esc nic nie robi, gdy enabled=false", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<Harness onClear={onClear} enabled={false} />);
    await user.keyboard("{Escape}");
    expect(onClear).not.toHaveBeenCalled();
  });
});
