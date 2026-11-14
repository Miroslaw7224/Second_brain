import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useChecklistRun } from "@/src/features/codex/useChecklistRun";

const EMPTY = { runs: [], eventCount: 0, skippedLines: 0, unterminatedTail: false };
const run = (over: Record<string, unknown> = {}) => ({
  run: "r1",
  owner: "personal",
  checklist: "dod",
  task: "Zadanie",
  startedAt: "2026-11-14T10:00:00.000Z",
  ended: false,
  items: {},
  ...over,
});
const state = (personalRuns: unknown[] = [], work: unknown = EMPTY) => ({
  month: "2026-11",
  personal: { ...EMPTY, runs: personalRuns, eventCount: personalRuns.length },
  work,
});

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

type Call = { method: string; body: Record<string, unknown> | null };
function setup(
  getState: () => unknown,
  post: (body: Record<string, unknown>) => Response = (b) =>
    json({ ...b, run: b.run ?? "r-new", ts: "2026-11-14T10:00:01.000Z" }, true, 201),
  opts: { owner?: "personal" | "work"; task?: string } = {}
) {
  const calls: Call[] = [];
  const apiFetch = vi.fn(async (_url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ method, body });
    return method === "POST" ? post(body ?? {}) : json(getState());
  });
  const itemIds = ["dod-1", "dod-2", "dod-3"];
  const hook = renderHook(() =>
    useChecklistRun(apiFetch, {
      checklist: "dod",
      owner: opts.owner ?? "personal",
      task: opts.task ?? "Zadanie",
      itemIds,
    })
  );
  return { calls, apiFetch, ...hook };
}
const posts = (calls: Call[]) => calls.filter((c) => c.method === "POST").map((c) => c.body);

describe("useChecklistRun", () => {
  it("pierwszy toggle bez uruchomienia wysyła start (z zadaniem), potem toggle z nadanym run", async () => {
    const { calls, result } = setup(() => state());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.toggle("dod-1", true);
    });
    expect(posts(calls)).toEqual([
      { type: "start", owner: "personal", checklist: "dod", task: "Zadanie" },
      { type: "toggle", owner: "personal", run: "r-new", item: "dod-1", checked: true },
    ]);
  });

  it("gdy otwarte uruchomienie istnieje, toggle wysyła tylko toggle z jego run", async () => {
    const { calls, result } = setup(() => state([run({ run: "r-open" })]));
    await waitFor(() => expect(result.current.run?.run).toBe("r-open"));
    await act(async () => {
      await result.current.toggle("dod-2", true);
    });
    expect(posts(calls)).toEqual([
      { type: "toggle", owner: "personal", run: "r-open", item: "dod-2", checked: true },
    ]);
  });

  it("uruchomienie zakończone albo innej checklisty nie jest brane za otwarte", async () => {
    const { result } = setup(() =>
      state([run({ run: "r-end", ended: true }), run({ run: "r-other", checklist: "pr" })])
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.run).toBeUndefined();
  });

  it("dwa szybkie toggle bez uruchomienia tworzą jedno uruchomienie", async () => {
    let existing: unknown[] = [];
    const { calls, result } = setup(
      () => state(existing),
      (b) => {
        if (b.type === "start") existing = [run({ run: "r-new" })];
        return json({ ...b, run: b.run ?? "r-new", ts: "t" }, true, 201);
      }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await Promise.all([
        result.current.toggle("dod-1", true),
        result.current.toggle("dod-2", true),
      ]);
    });
    expect(posts(calls).map((b) => b?.type)).toEqual(["start", "toggle", "toggle"]);
  });

  it("odpowiedź 403 ustawia error z komunikatem serwera i nie rzuca wyjątku", async () => {
    const { result } = setup(
      () => state(),
      () => json({ error: "Dane etatu (Work/) zablokowane" }, false, 403)
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.toggle("dod-1", true);
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("Dane etatu (Work/) zablokowane");
  });

  it("owner work przy zablokowanej strefie: workBlocked i brak zapytań POST", async () => {
    const { calls, result } = setup(
      () => state([], { blocked: "Dane etatu zablokowane" }),
      undefined,
      {
        owner: "work",
      }
    );
    await waitFor(() => expect(result.current.workBlocked).toBe("Dane etatu zablokowane"));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.toggle("dod-1", true);
    });
    expect(ok).toBe(false);
    expect(posts(calls)).toEqual([]);
  });

  it("postęp liczy odhaczone punkty z uruchomienia", async () => {
    const { result } = setup(() =>
      state([
        run({
          items: { "dod-1": { checked: true, note: "" }, "dod-2": { checked: false, note: "x" } },
        }),
      ])
    );
    await waitFor(() => expect(result.current.progress.done).toBe(1));
    expect(result.current.progress).toEqual({ done: 1, total: 3, pct: 33 });
  });

  it("setNote wysyła note z tekstem, end wysyła done i total", async () => {
    const { calls, result } = setup(() =>
      state([run({ run: "r-open", items: { "dod-1": { checked: true, note: "" } } })])
    );
    await waitFor(() => expect(result.current.run?.run).toBe("r-open"));
    await act(async () => {
      await result.current.setNote("dod-1", "uwaga");
      await result.current.end();
    });
    expect(posts(calls)).toEqual([
      { type: "note", owner: "personal", run: "r-open", item: "dod-1", text: "uwaga" },
      { type: "end", owner: "personal", run: "r-open", done: 1, total: 3 },
    ]);
  });

  it("end bez uruchomienia niczego nie wysyła", async () => {
    const { calls, result } = setup(() => state());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.end();
    });
    expect(posts(calls)).toEqual([]);
  });
});
