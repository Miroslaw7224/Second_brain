import { describe, expect, test } from "vitest";
import { defaultNoteTitle, defaultTarget, toMoveBody } from "@/src/features/home/inboxMove";

describe("defaultTarget", () => {
  test.each([
    ["link", "note"],
    ["snippet", "note"],
    ["bug", "project"],
    ["myśl", "project"],
  ] as const)("%s → %s", (type, target) => {
    expect(defaultTarget(type)).toBe(target);
  });
});

describe("defaultNoteTitle", () => {
  test("pierwsze zdanie", () => {
    expect(defaultNoteTitle("Pierwsze zdanie. Drugie zdanie.")).toBe("Pierwsze zdanie.");
  });
  test("brak interpunkcji: cały tekst", () => {
    expect(defaultNoteTitle("Artykuł o vitest")).toBe("Artykuł o vitest");
  });
  test("kropka w środku adresu nie kończy zdania", () => {
    expect(defaultNoteTitle("https://vitest.dev/guide.html")).toBe("https://vitest.dev/guide.html");
  });
  test("nowe linie jak spacje; ucięcie do 120 znaków", () => {
    expect(defaultNoteTitle("a\nb")).toBe("a b");
    expect(defaultNoteTitle("x".repeat(200))).toHaveLength(120);
  });
});

describe("toMoveBody", () => {
  const base = {
    target: "project",
    text: " Zrób X ",
    projectId: "nexus",
    column: "next",
    title: "",
  } as const;

  test("project", () => {
    expect(toMoveBody(base)).toEqual({
      target: "project",
      projectId: "nexus",
      column: "next",
      text: "Zrób X",
    });
  });
  test("project bez wybranego projektu → null", () => {
    expect(toMoveBody({ ...base, projectId: "" })).toBeNull();
  });
  test("task", () => {
    expect(toMoveBody({ ...base, target: "task" })).toEqual({ target: "task", text: "Zrób X" });
  });
  test("note z tytułem; bez tytułu → null", () => {
    expect(toMoveBody({ ...base, target: "note", title: " T " })).toEqual({
      target: "note",
      title: "T",
      text: "Zrób X",
    });
    expect(toMoveBody({ ...base, target: "note", title: "  " })).toBeNull();
  });
  test("pusty tekst → null", () => {
    expect(toMoveBody({ ...base, text: "  " })).toBeNull();
  });
});
