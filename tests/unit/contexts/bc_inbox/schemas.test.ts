// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MAX_INBOX_TEXT } from "@/contexts/bc_inbox/models";
import { MoveInboxItemSchema, toMoveResultDto } from "@/contexts/bc_inbox/schemas";

const parse = (v: unknown) => MoveInboxItemSchema.safeParse(v);

describe("MoveInboxItemSchema: poprawne wejście", () => {
  it("project: przycina, zamienia nowe linie na spacje, zostawia kolumnę", () => {
    const r = parse({
      target: "project",
      projectId: " nexus ",
      column: "icebox",
      text: "  a\n b \r\n c ",
    });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({
      target: "project",
      projectId: "nexus",
      column: "icebox",
      text: "a b c",
    });
  });

  it("task i note", () => {
    expect(parse({ target: "task", text: " zrób to " }).data).toEqual({
      target: "task",
      text: "zrób to",
    });
    expect(parse({ target: "note", title: " Tytuł ", text: "Treść\nnotatki" }).data).toEqual({
      target: "note",
      title: "Tytuł",
      text: "Treść notatki",
    });
  });

  it("limit tekstu zadania ogólnego i notatki to MAX_INBOX_TEXT", () => {
    expect(parse({ target: "task", text: "a".repeat(MAX_INBOX_TEXT) }).success).toBe(true);
    expect(parse({ target: "task", text: "a".repeat(MAX_INBOX_TEXT + 1) }).success).toBe(false);
    expect(
      parse({ target: "note", title: "t", text: "a".repeat(MAX_INBOX_TEXT + 1) }).success
    ).toBe(false);
  });

  it("limit tytułu notatki to 120 znaków", () => {
    expect(parse({ target: "note", title: "a".repeat(120), text: "x" }).success).toBe(true);
    expect(parse({ target: "note", title: "a".repeat(121), text: "x" }).success).toBe(false);
  });
});

describe("MoveInboxItemSchema: odrzucenia", () => {
  it.each([
    ["kolumna now", { target: "project", projectId: "p", column: "now", text: "a" }],
    [
      "kolumna backlog (nazwa pliku, nie kolumny)",
      { target: "project", projectId: "p", column: "backlog", text: "a" },
    ],
    ["brak kolumny", { target: "project", projectId: "p", text: "a" }],
    ["brak projectId", { target: "project", column: "next", text: "a" }],
    ["pusty projectId", { target: "project", projectId: "  ", column: "next", text: "a" }],
    ["pusty tekst", { target: "task", text: "   " }],
    ["brak tytułu notatki", { target: "note", text: "a" }],
    ["pusty tytuł notatki", { target: "note", title: " ", text: "a" }],
    ["nieznany cel", { target: "kurs", text: "a" }],
    ["brak celu", { text: "a" }],
    ["tekst nie jest napisem", { target: "task", text: 5 }],
    [
      "zadanie projektu > 300 znaków",
      { target: "project", projectId: "p", column: "next", text: "a".repeat(301) },
    ],
    [
      "zadanie projektu z [now::]",
      { target: "project", projectId: "p", column: "next", text: "a [now::]" },
    ],
    [
      "zadanie projektu z datą ukończenia",
      { target: "project", projectId: "p", column: "next", text: "a — 2026-11-14" },
    ],
  ])("%s", (_name, body) => {
    expect(parse(body).success).toBe(false);
  });

  it("zadanie projektu: dokładnie 300 znaków jest ok", () => {
    expect(
      parse({ target: "project", projectId: "p", column: "next", text: "a".repeat(300) }).success
    ).toBe(true);
  });
});

describe("toMoveResultDto", () => {
  it("dokłada ok: true; warning tylko gdy jest", () => {
    expect(toMoveResultDto({ target: "task", ref: "t1" })).toEqual({
      ok: true,
      target: "task",
      ref: "t1",
    });
    expect(toMoveResultDto({ target: "note", ref: "n1", warning: "w" })).toEqual({
      ok: true,
      target: "note",
      ref: "n1",
      warning: "w",
    });
  });
});
