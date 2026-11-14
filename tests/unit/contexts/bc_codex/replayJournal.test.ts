// @vitest-environment node
import { describe, expect, it } from "vitest";
import { replayJournal } from "@/contexts/bc_codex/services";

const ev = (o: Record<string, unknown>) => JSON.stringify(o);
const base = { owner: "personal", ts: "2026-11-14T10:00:00.000Z" };
const start = (run: string, extra: Record<string, unknown> = {}) =>
  ev({ ...base, run, type: "start", checklist: "definition-of-done", task: "Zadanie", ...extra });
const toggle = (run: string, item: string, checked: boolean) =>
  ev({ ...base, run, type: "toggle", item, checked });
const note = (run: string, item: string, text: string) =>
  ev({ ...base, run, type: "note", item, text });
const end = (run: string) => ev({ ...base, run, type: "end", done: 1, total: 6 });
const file = (...lines: string[]) => `${lines.join("\n")}\n`;

describe("replayJournal", () => {
  it("null i pusty tekst dają pusty stan", () => {
    const empty = { runs: [], eventCount: 0, skippedLines: 0, unterminatedTail: false };
    expect(replayJournal(null)).toEqual(empty);
    expect(replayJournal("")).toEqual(empty);
  });

  it("ostatni toggle wygrywa, notatka jest zapamiętana, eventCount liczy poprawne zdarzenia", () => {
    const state = replayJournal(
      file(
        start("r1"),
        toggle("r1", "definition-of-done-1", true),
        toggle("r1", "definition-of-done-1", false),
        note("r1", "definition-of-done-1", "x")
      )
    );
    expect(state.eventCount).toBe(4);
    expect(state.runs).toHaveLength(1);
    expect(state.runs[0]).toMatchObject({
      run: "r1",
      owner: "personal",
      checklist: "definition-of-done",
      task: "Zadanie",
      startedAt: "2026-11-14T10:00:00.000Z",
      ended: false,
    });
    expect(state.runs[0].items["definition-of-done-1"]).toEqual({ checked: false, note: "x" });
  });

  it("dwa uruchomienia: zakończone i otwarte, w kolejności pliku", () => {
    const state = replayJournal(file(start("r1"), end("r1"), start("r2")));
    expect(state.runs.map((r) => [r.run, r.ended])).toEqual([
      ["r1", true],
      ["r2", false],
    ]);
  });

  it("uszkodzona linia JSON jest pomijana i liczona, reszta odtworzona", () => {
    const state = replayJournal(
      file(start("r1"), "{niepoprawny json", toggle("r1", "definition-of-done-2", true))
    );
    expect(state.skippedLines).toBe(1);
    expect(state.eventCount).toBe(2);
    expect(state.runs[0].items["definition-of-done-2"].checked).toBe(true);
  });

  it("zdarzenie bez owner jest pomijane i liczone jako pominięte", () => {
    const withoutOwner = ev({ run: "r1", ts: base.ts, type: "toggle", item: "a-1", checked: true });
    const state = replayJournal(file(start("r1"), withoutOwner));
    expect(state.skippedLines).toBe(1);
    expect(state.eventCount).toBe(1);
    expect(state.runs[0].items).toEqual({});
  });

  it("nieznany typ zdarzenia i zły typ pola checked są pomijane", () => {
    const state = replayJournal(
      file(
        start("r1"),
        ev({ ...base, run: "r1", type: "wipe" }),
        ev({ ...base, run: "r1", type: "toggle", item: "a-1", checked: "tak" })
      )
    );
    expect(state.skippedLines).toBe(2);
    expect(state.eventCount).toBe(1);
  });

  it("ostatnia linia bez \\n jest ignorowana i nie liczy się jako uszkodzona", () => {
    const state = replayJournal(`${start("r1")}\n${toggle("r1", "definition-of-done-1", true)}`);
    expect(state.unterminatedTail).toBe(true);
    expect(state.skippedLines).toBe(0);
    expect(state.eventCount).toBe(1);
    expect(state.runs[0].items).toEqual({});
  });

  it("poprawny plik kończący się \\n nie ma niedokończonego ogona, puste linie są ignorowane", () => {
    const state = replayJournal(`${start("r1")}\n\n`);
    expect(state.unterminatedTail).toBe(false);
    expect(state.skippedLines).toBe(0);
    expect(state.eventCount).toBe(1);
  });

  it("toggle dla nieznanego uruchomienia zwiększa eventCount, ale nie tworzy uruchomienia", () => {
    const state = replayJournal(file(toggle("brak", "a-1", true)));
    expect(state.eventCount).toBe(1);
    expect(state.runs).toEqual([]);
  });

  it("notatka z pustym tekstem czyści poprzednią notatkę", () => {
    const state = replayJournal(file(start("r1"), note("r1", "a-1", "coś"), note("r1", "a-1", "")));
    expect(state.runs[0].items["a-1"]).toEqual({ checked: false, note: "" });
  });

  it("projectId z zdarzenia nie jest wymagany", () => {
    const state = replayJournal(file(start("r1", { projectId: "monolith" })));
    expect(state.runs).toHaveLength(1);
  });
});
