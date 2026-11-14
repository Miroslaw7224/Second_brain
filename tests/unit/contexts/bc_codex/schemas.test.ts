// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ChecklistEventInputSchema } from "@/contexts/bc_codex/schemas";

const ok = (input: unknown) => ChecklistEventInputSchema.safeParse(input).success;

describe("ChecklistEventInputSchema", () => {
  it("przyjmuje poprawne zdarzenie każdego typu", () => {
    expect(
      ok({ type: "start", owner: "personal", checklist: "definition-of-done", task: "Zadanie" })
    ).toBe(true);
    expect(ok({ type: "toggle", owner: "work", run: "r1", item: "dod-1", checked: true })).toBe(
      true
    );
    expect(ok({ type: "note", owner: "personal", run: "r1", item: "dod-1", text: "" })).toBe(true);
    expect(ok({ type: "end", owner: "personal", run: "r1", done: 4, total: 6 })).toBe(true);
  });

  it("owner jest wymagany, a spoza personal/work odrzucony", () => {
    expect(ok({ type: "start", checklist: "x", task: "" })).toBe(false);
    expect(ok({ type: "start", owner: "company", checklist: "x", task: "" })).toBe(false);
  });

  it("run jest wymagany dla toggle/note/end i niedozwolony dla start", () => {
    expect(ok({ type: "toggle", owner: "personal", item: "a-1", checked: true })).toBe(false);
    expect(ok({ type: "end", owner: "personal", done: 1, total: 2 })).toBe(false);
    expect(ok({ type: "start", owner: "personal", run: "r1", checklist: "x", task: "" })).toBe(
      false
    );
  });

  it("notatka i zadanie to jedna linia do 300 znaków", () => {
    const note = (text: string) => ({
      type: "note",
      owner: "personal",
      run: "r1",
      item: "a-1",
      text,
    });
    expect(ok(note("a\nb"))).toBe(false);
    expect(ok(note("a\rb"))).toBe(false);
    expect(ok(note("x".repeat(300)))).toBe(true);
    expect(ok(note("x".repeat(301)))).toBe(false);
    const task = (t: string) => ({ type: "start", owner: "personal", checklist: "x", task: t });
    expect(ok(task("y".repeat(300)))).toBe(true);
    expect(ok(task("y".repeat(301)))).toBe(false);
  });

  it("odrzuca nieznane pola, nieznany typ, puste item i ujemne liczby", () => {
    expect(
      ok({ type: "toggle", owner: "personal", run: "r1", item: "a-1", checked: true, ts: "x" })
    ).toBe(false);
    expect(ok({ type: "wipe", owner: "personal", run: "r1" })).toBe(false);
    expect(ok({ type: "toggle", owner: "personal", run: "r1", item: "", checked: true })).toBe(
      false
    );
    expect(ok({ type: "end", owner: "personal", run: "r1", done: -1, total: 2 })).toBe(false);
  });
});
