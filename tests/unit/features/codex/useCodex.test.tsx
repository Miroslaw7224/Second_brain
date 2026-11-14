import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCodex } from "@/src/features/codex/useCodex";

const okBody = (mtimeMs: number) => ({
  status: "ok",
  path: "Knowledge/kodeks.md",
  mtimeMs,
  title: "Kodeks",
  sections: [],
  rules: [],
  checklists: [],
  warnings: [],
  wikilinks: [],
  counts: { must: 0, should: 0 },
});

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

afterEach(() => vi.useRealTimers());

describe("useCodex", () => {
  it("ładuje kodeks i przechodzi ze stanu loading do ok", async () => {
    const apiFetch = vi.fn(async () => json(okBody(1000)));
    const { result } = renderHook(() => useCodex(apiFetch));
    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("ok"));
    expect(apiFetch).toHaveBeenCalledWith("/api/nexus/codex");
  });

  it("status missing i config-error z serwera są osobnymi stanami", async () => {
    const missing = renderHook(() =>
      useCodex(async () => json({ status: "missing", path: "Knowledge/kodeks.md" }))
    );
    await waitFor(() => expect(missing.result.current.state.status).toBe("missing"));
    const broken = renderHook(() =>
      useCodex(async () => json({ status: "config-error", message: "Brak vaulta" }))
    );
    await waitFor(() =>
      expect(broken.result.current.state).toEqual({
        status: "config-error",
        message: "Brak vaulta",
      })
    );
  });

  it("odpowiedź HTTP z błędem daje stan error z komunikatem serwera", async () => {
    const { result } = renderHook(() =>
      useCodex(async () => json({ error: "Dysk niedostępny" }, false, 503))
    );
    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state).toEqual({ status: "error", message: "Dysk niedostępny" });
  });

  it("odpowiedź niezgodna ze schematem daje stan error", async () => {
    const { result } = renderHook(() => useCodex(async () => json({ status: "ok" })));
    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("reload przy niezmienionym mtime zwraca same i nie zmienia referencji danych", async () => {
    const apiFetch = vi.fn(async () => json(okBody(1000)));
    const { result } = renderHook(() => useCodex(apiFetch));
    await waitFor(() => expect(result.current.state.status).toBe("ok"));
    const before = result.current.state;
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.reload();
    });
    expect(outcome).toBe("same");
    expect(result.current.state).toBe(before);
  });

  it("reload po zmianie mtime zwraca changed i podmienia dane", async () => {
    let mtime = 1000;
    const apiFetch = vi.fn(async () => json(okBody(mtime)));
    const { result } = renderHook(() => useCodex(apiFetch));
    await waitFor(() => expect(result.current.state.status).toBe("ok"));
    mtime = 2000;
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.reload();
    });
    expect(outcome).toBe("changed");
    const state = result.current.state;
    expect(state.status === "ok" && state.data.mtimeMs).toBe(2000);
  });

  it("odpytuje serwer co pollMs", async () => {
    vi.useFakeTimers();
    const apiFetch = vi.fn(async () => json(okBody(1000)));
    renderHook(() => useCodex(apiFetch, 15_000));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(apiFetch).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(apiFetch).toHaveBeenCalledTimes(3);
  });
});
