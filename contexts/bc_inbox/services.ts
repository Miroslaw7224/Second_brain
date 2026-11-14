import * as notesServices from "@/contexts/bc_notes/services";
import * as projectsServices from "@/contexts/bc_projects/services";
import * as tasksServices from "@/contexts/bc_tasks/services";
import { DomainError, NotFoundError } from "@/lib/errors";
import {
  MAX_INBOX_TEXT,
  type InboxItem,
  type InboxType,
  type MoveInput,
  type MoveResult,
} from "./models";
import * as repositories from "./repositories";

const PREFIX = /^(bug|snippet|kod)(?::\s*|\s+)(.*)$/i;
const URL_ONLY = /^https?:\/\/\S+$/i;

/** Typ z treści: sam URL → link; prefiks `bug`/`snippet`/`kod` (i `:` lub spacja) jest zdejmowany. */
export function detectType(input: string): { type: InboxType; text: string } {
  const text = input.trim();
  if (URL_ONLY.test(text)) return { type: "link", text };
  const m = PREFIX.exec(text);
  if (m) return { type: m[1].toLowerCase() === "bug" ? "bug" : "snippet", text: m[2].trim() };
  return { type: "myśl", text };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Lokalny `RRRR-MM-DDTHH:mm` (jak `state.updated`). */
function stamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function addItem(input: string, now: Date = new Date()): Promise<InboxItem> {
  const { type, text } = detectType(input.replace(/\s+/g, " "));
  if (text === "") throw new DomainError("Wpisz treść wpisu");
  if (text.length > MAX_INBOX_TEXT) throw new DomainError(`Maksymalnie ${MAX_INBOX_TEXT} znaków`);
  const at = stamp(now);
  return repositories.appendItem({ text, type, at });
}

/** Otwarte wpisy, najnowsze (z końca pliku) pierwsze. */
export function listItems(): InboxItem[] {
  return [...repositories.readOpenItems()].reverse();
}

export function countOpen(): number {
  return repositories.readOpenItems().length;
}

export async function resolve(id: string): Promise<void> {
  if (!(await repositories.resolveItem(id)))
    throw new NotFoundError(`Nie ma otwartego wpisu ${id}`);
}

/** Trwale usuwa otwarty wpis z `Inbox/inbox.md` (w odróżnieniu od `resolve`, który zostawia linię `[x]`). */
export async function remove(id: string): Promise<void> {
  if (!(await repositories.removeItem(id))) throw new NotFoundError(`Nie ma otwartego wpisu ${id}`);
}

export function countClosed(): number {
  return repositories.countClosedItems();
}

/** Trwale usuwa wszystkie zamknięte wpisy (`[x]`) z `Inbox/inbox.md`; zwraca ich liczbę. Otwartych nie rusza. */
export async function clearClosed(): Promise<number> {
  return repositories.removeClosedItems();
}

const MOVE_WARNING =
  "Zapisano w celu, ale nie udało się oznaczyć wpisu jako posegregowanego; wpis zostaje otwarty";

/** Zapis w celu przez `services` innego kontekstu; zwraca `ref` (id projektu, zadania albo notatki). */
async function writeTarget(input: MoveInput): Promise<string> {
  switch (input.target) {
    case "project": {
      const { board } = projectsServices.getProject(input.projectId);
      await projectsServices.applyTaskOp(
        input.projectId,
        { op: "add", column: input.column, text: input.text },
        board.version
      );
      return input.projectId;
    }
    case "task":
      return (await tasksServices.createTask({ title: input.text })).id;
    case "note":
      return (await notesServices.createNote({ title: input.title, content: input.text })).id;
  }
}

/**
 * Przenosi otwarty wpis do zadania projektu, zadania ogólnego albo notatki. Najpierw zapis w celu,
 * potem `[x]` w inboxie: awaria zapisu zostawia wpis nietknięty, awaria `[x]` daje `warning`
 * (lepszy duplikat niż zgubiony wpis). `input` pochodzi z `MoveInboxItemSchema` (tekst jednoliniowy).
 */
export async function moveItem(id: string, input: MoveInput): Promise<MoveResult> {
  if (!repositories.readOpenItems().some((i) => i.id === id)) {
    throw new NotFoundError(`Nie ma otwartego wpisu ${id}`);
  }
  const ref = await writeTarget(input);
  try {
    await resolve(id);
  } catch {
    return { target: input.target, ref, warning: MOVE_WARNING };
  }
  return { target: input.target, ref };
}
