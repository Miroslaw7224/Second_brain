// src/features/home/inboxMove.ts
import type { InboxItemDto, MoveInboxBody } from "@/contexts/bc_inbox/schemas";

export type MoveTarget = MoveInboxBody["target"];
export type MoveColumn = "next" | "icebox";

export type MoveFormState = {
  target: MoveTarget;
  text: string;
  projectId: string;
  column: MoveColumn;
  title: string;
};

const NOTE_TITLE_MAX = 120;

/** Podpowiedź celu z typu wpisu (bez AI): link i snippet → notatka, bug i myśl → zadanie projektu. */
export function defaultTarget(type: InboxItemDto["type"]): MoveTarget {
  return type === "link" || type === "snippet" ? "note" : "project";
}

/** Tytuł notatki: pierwsze zdanie wpisu (kończy je `.`, `!` albo `?` przed spacją), do 120 znaków. */
export function defaultNoteTitle(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const sentence = /^(.+?[.!?])(?:\s|$)/.exec(flat)?.[1] ?? flat;
  return sentence.slice(0, NOTE_TITLE_MAX).trim();
}

/** Ciało `POST …/move` z pól formularza; `null`, gdy formularz jest niekompletny. */
export function toMoveBody(s: MoveFormState): MoveInboxBody | null {
  const text = s.text.trim();
  if (text === "") return null;
  if (s.target === "project") {
    return s.projectId === ""
      ? null
      : { target: "project", projectId: s.projectId, column: s.column, text };
  }
  if (s.target === "task") return { target: "task", text };
  const title = s.title.trim();
  return title === "" ? null : { target: "note", title, text };
}
