import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodexView } from "@/src/features/codex/CodexView";

afterEach(() => cleanup());

const EMPTY = { runs: [], eventCount: 0, skippedLines: 0, unterminatedTail: false };

const codexBody = (over: Record<string, unknown> = {}) => ({
  status: "ok",
  path: "Knowledge/kodeks.md",
  mtimeMs: Date.UTC(2026, 10, 11, 7, 30, 14),
  title: "Kodeks pracy nad kodem",
  sections: [
    {
      id: "sec-tdd",
      title: "1. Zasady TDD",
      blocks: [
        { kind: "rule", ruleId: "TDD-1" },
        { kind: "rule", ruleId: "TDD-2" },
      ],
    },
  ],
  rules: [
    { id: "TDD-1", level: "MUST", text: "**Brak kodu** bez czerwonego testu", line: 6 },
    { id: "TDD-2", level: "SHOULD", text: "Pętla Red-Green-Refactor", line: 7 },
  ],
  checklists: [
    {
      id: "definition-of-done",
      title: "Definition of Done",
      items: [
        { id: "definition-of-done-1", text: "[TDD-1] Czerwony test", ruleRefs: ["TDD-1"] },
        { id: "definition-of-done-2", text: "[SEC-4] Brak kluczy w kodzie", ruleRefs: ["SEC-4"] },
      ],
    },
    {
      id: "przed-pr",
      title: "Przed PR",
      items: [{ id: "przed-pr-1", text: "Opis zmian", ruleRefs: [] }],
    },
  ],
  warnings: [],
  wikilinks: ["ai-coding-guardrails"],
  counts: { must: 1, should: 1 },
  ...over,
});

const run = (over: Record<string, unknown> = {}) => ({
  run: "r-open",
  owner: "personal",
  checklist: "definition-of-done",
  task: "Makieta",
  startedAt: "2026-11-14T10:00:00.000Z",
  ended: false,
  items: {},
  ...over,
});

const stateBody = (personal: Record<string, unknown> = {}, work: unknown = EMPTY) => ({
  month: "2026-11",
  personal: { ...EMPTY, ...personal },
  work,
});

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

type Posts = Record<string, unknown>[];

function setup(opts: {
  codex?: unknown;
  state?: () => unknown;
  post?: (body: Record<string, unknown>) => Response;
}) {
  const posts: Posts = [];
  const apiFetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/nexus/codex") return json(opts.codex ?? codexBody());
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      posts.push(body);
      return opts.post
        ? opts.post(body)
        : json({ ...body, run: body.run ?? "r-new", ts: "t" }, true, 201);
    }
    return json(opts.state ? opts.state() : stateBody());
  });
  render(<CodexView apiFetch={apiFetch} />);
  return { apiFetch, posts };
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("CodexView: czytnik", () => {
  it("pokazuje kafle, odznaki i filtr z licznikami, a filtr MUST ukrywa SHOULD", async () => {
    setup({});
    await screen.findByText("Pętla Red-Green-Refactor");
    for (const label of [
      "Reguły kodeksu",
      "Uruchomiona checklista",
      "Dziennik zdarzeń",
      "Stan walidacji",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Wszystkie (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MUST (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SHOULD (1)" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "MUST (1)" }));
    expect(screen.queryByText("Pętla Red-Green-Refactor")).not.toBeInTheDocument();
    expect(screen.getByText(/bez czerwonego testu/)).toBeInTheDocument();
  });

  it("wyszukiwarka dopasowuje po ID; brak wyników pokazuje komunikat", async () => {
    setup({});
    await screen.findByText("Pętla Red-Green-Refactor");
    const user = userEvent.setup();
    const search = screen.getByRole("searchbox", { name: "Wyszukiwanie reguł" });
    await user.type(search, "tdd-1");
    expect(screen.queryByText("Pętla Red-Green-Refactor")).not.toBeInTheDocument();
    expect(screen.getByText(/bez czerwonego testu/)).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "zzz-brak");
    expect(screen.getByText("Brak reguł dla filtra")).toBeInTheDocument();
  });

  it("surowy HTML w treści reguły jest escapowany (brak elementu script)", async () => {
    setup({
      codex: codexBody({
        rules: [
          { id: "TDD-1", level: "MUST", text: "<script>alert(1)</script> tekst", line: 6 },
          { id: "TDD-2", level: "SHOULD", text: "b", line: 7 },
        ],
      }),
    });
    await screen.findByText(/alert\(1\)/);
    expect(document.querySelector("script")).toBeNull();
  });

  it("brak pliku: widok z instrukcją, przycisk kopiuje szablon do schowka", async () => {
    setup({ codex: { status: "missing", path: "Knowledge/kodeks.md" } });
    await screen.findByRole("heading", { name: "Brak pliku kodeksu inżynierskiego" });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: "Kopiuj instrukcję utworzenia" }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = String(writeText.mock.calls[0][0]);
    expect(copied).toContain("Knowledge/kodeks.md");
    expect(copied).toContain("- **[TDD-1] MUST**");
    expect(copied).toContain("\n  - ");
  });

  it("błąd konfiguracji: komunikat z serwera i przycisk ponownego sprawdzenia", async () => {
    setup({ codex: { status: "config-error", message: "Brak vaulta: ustaw NEXUS_VAULT_PATH" } });
    await screen.findByText(/ustaw NEXUS_VAULT_PATH/);
    expect(screen.getByRole("button", { name: "Sprawdź połączenie ponownie" })).toBeInTheDocument();
  });

  it("ostrzeżenia: panel z pozycjami parsera i dziennika, a kafel walidacji liczy pozycje", async () => {
    setup({
      codex: codexBody({
        warnings: [{ kind: "duplicate-id", message: "Reguła [TDD-1] powtórzona", line: 9 }],
      }),
      state: () => stateBody({ skippedLines: 2 }),
    });
    const panel = await screen.findByRole("region", { name: "Ostrzeżenia parsera kodeksu" });
    await waitFor(() => expect(within(panel).getAllByRole("listitem")).toHaveLength(2));
    expect(within(panel).getByText("Zduplikowany identyfikator")).toBeInTheDocument();
    const tile = screen.getByText("Stan walidacji").parentElement as HTMLElement;
    expect(within(tile).getByText("2")).toBeInTheDocument();
  });

  it("bez ostrzeżeń panelu nie ma, a kafel walidacji pokazuje 0", async () => {
    setup({});
    await screen.findByText("Pętla Red-Green-Refactor");
    expect(screen.queryByRole("region", { name: "Ostrzeżenia parsera kodeksu" })).toBeNull();
    const tile = screen.getByText("Stan walidacji").parentElement as HTMLElement;
    expect(within(tile).getByText("0")).toBeInTheDocument();
  });
});

describe("CodexView: checklisty", () => {
  it("pierwsze odhaczenie wysyła start (z zadaniem) i toggle, a pasek pokazuje postęp", async () => {
    let current: unknown = stateBody();
    const { posts } = setup({
      state: () => current,
      post: (body) => {
        if (body.type === "toggle") {
          current = stateBody({
            eventCount: 2,
            runs: [
              run({
                task: "Moje zadanie",
                items: { "definition-of-done-1": { checked: true, note: "" } },
              }),
            ],
          });
        }
        return json({ ...body, run: body.run ?? "r-open", ts: "t" }, true, 201);
      },
    });
    const user = userEvent.setup();
    const task = await screen.findByRole("textbox", { name: "Opis zadania" });
    await user.type(task, "Moje zadanie");
    await user.click(await screen.findByRole("checkbox", { name: /Punkt 1/ }));
    await waitFor(() => expect(screen.getByText("1 z 2 odhaczone")).toBeInTheDocument());
    expect(posts).toEqual([
      { type: "start", owner: "personal", checklist: "definition-of-done", task: "Moje zadanie" },
      {
        type: "toggle",
        owner: "personal",
        run: "r-open",
        item: "definition-of-done-1",
        checked: true,
      },
    ]);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("strefa work zablokowana: komunikat serwera i wyłączone odhaczanie", async () => {
    const { posts } = setup({
      state: () => stateBody({}, { blocked: "Dane etatu (Work/) zablokowane: brak ignorowania" }),
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("radio", { name: "work" }));
    expect(await screen.findByText(/Dane etatu \(Work\/\) zablokowane/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Punkt 1/ })).toBeDisabled();
    expect(posts).toEqual([]);
  });

  it("notatka wysyła note po opuszczeniu pola, a bez zmiany niczego nie wysyła", async () => {
    const { posts } = setup({ state: () => stateBody({ runs: [run()] }) });
    const user = userEvent.setup();
    const note = await screen.findByRole("textbox", { name: "Notatka do punktu 1" });
    await user.click(note);
    await user.tab();
    expect(posts).toEqual([]);
    await user.type(note, "uwaga");
    await user.tab();
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      type: "note",
      owner: "personal",
      run: "r-open",
      item: "definition-of-done-1",
      text: "uwaga",
    });
  });

  it("klik [TDD-1] przewija do reguły, a odwołanie do nieistniejącej reguły nie jest linkiem", async () => {
    setup({});
    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: "[TDD-1]" }));
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    expect(scroll).toHaveBeenCalled();
    expect((scroll.mock.contexts.at(-1) as HTMLElement).id).toBe("rule-tdd-1");
    expect(screen.queryByRole("link", { name: "[SEC-4]" })).toBeNull();
    expect(screen.getByText("Brak definicji ID")).toBeInTheDocument();
  });

  it("opis zadania wpisany w strefie work nie trafia do personal po przełączeniu strefy", async () => {
    setup({});
    const user = userEvent.setup();
    await screen.findByRole("textbox", { name: "Opis zadania" });
    await user.click(screen.getByRole("radio", { name: "work" }));
    await user.type(screen.getByRole("textbox", { name: "Opis zadania" }), "tajne z etatu");
    await user.click(screen.getByRole("radio", { name: "personal" }));
    expect(screen.getByRole("textbox", { name: "Opis zadania" })).toHaveValue("");
    await user.click(screen.getByRole("radio", { name: "work" }));
    expect(screen.getByRole("textbox", { name: "Opis zadania" })).toHaveValue("tajne z etatu");
  });

  it("klik w spis treści przy filtrze ukrywającym sekcję czyści filtr i przewija do sekcji", async () => {
    setup({});
    const user = userEvent.setup();
    await screen.findByText("Pętla Red-Green-Refactor");
    await user.type(screen.getByRole("searchbox", { name: "Wyszukiwanie reguł" }), "zzz-brak");
    expect(screen.getByText("Brak reguł dla filtra")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /1\. Zasady TDD/ }));
    expect(await screen.findByText("Pętla Red-Green-Refactor")).toBeInTheDocument();
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    await waitFor(() =>
      expect(scroll.mock.contexts.some((el) => (el as HTMLElement).id === "sec-tdd")).toBe(true)
    );
  });

  it("zakładka Przed PR przełącza listę punktów", async () => {
    setup({});
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: "Przed PR" }));
    expect(screen.getByRole("checkbox", { name: /Opis zmian/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Czerwony test/ })).toBeNull();
  });

  it("„Zapisz sesję” wysyła end z done i total", async () => {
    const { posts } = setup({
      state: () =>
        stateBody({
          runs: [run({ items: { "definition-of-done-1": { checked: true, note: "" } } })],
        }),
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Zapisz sesję" }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      type: "end",
      owner: "personal",
      run: "r-open",
      done: 1,
      total: 2,
    });
  });
});
