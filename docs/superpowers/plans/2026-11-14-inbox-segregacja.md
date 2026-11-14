# Inbox: segregacja wpisów — plan implementacji

> **Dla wykonawcy (agent):** REQUIRED SUB-SKILL: użyj superpowers:subagent-driven-development (zalecane) albo superpowers:executing-plans, zadanie po zadaniu. Kroki mają checkboxy (`- [ ]`).

**Cel:** wpis z `Inbox/inbox.md` można przenieść do zadania projektu, zadania ogólnego albo notatki: z okna wpisu w UI albo przez agenta CLI (skilla `/segreguj-inbox`), jedną trasą `POST /api/inbox/[id]/move`.

**Architektura:** zmiany tylko w `contexts/bc_inbox/` (`models`, `schemas`, `services`, `router`) plus trasa-re-eksport w `app/api/inbox/[id]/move/route.ts`. `bc_inbox/services` woła wyłącznie `services` z `bc_projects`, `bc_tasks`, `bc_notes` (ADR-021); `repositories` i `lib/nexus` w `bc_inbox` bez zmian. UI: formularz `InboxMoveForm` w oknie wpisu, UI importuje z kontekstu tylko `schemas`. Aplikacja nie woła żadnego modelu (G3).

**Stack:** Next.js 14, TypeScript, zod 4, Vitest (+ Testing Library), skilla Claude Code.

**Spec:** `docs/superpowers/specs/2026-11-14-inbox-segregacja-design.md`. Gałąź: `feat/inbox-segregacja` (już istnieje, ze specem).

## Zasady wykonania (z `CLAUDE.md`)

- Testu architektury (`tests/unit/architecture.static.test.ts`) **nie zmieniamy**; gdy pęknie, naprawiamy kodem.
- Pojedyncze `npx vitest run <ścieżka>` uruchamiasz sam (krótki wynik). Pełne `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` zleć Cursorowi (Zadanie 7), bo zalewają kontekst.
- Commit kończy się linią `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Hook lint-staged przeformatuje pliki prettierem przy commicie, to normalne.
- Nie uruchamiaj aplikacji na prawdziwym vaulcie: ręczne sprawdzenie robimy na kopii (Zadanie 7).

## Odstępstwa od specu (uzgodnione w planie)

1. Przypadki „nowe linie w tekście → spacja” i „501 znaków → 400” testujemy w `schemas.test.ts` (tam żyje normalizacja), nie w `services.test.ts`.
2. Skilla leży w `.claude/skills/segreguj-inbox/SKILL.md`, a `.claude/` jest w `.gitignore` (linia 18), więc **skilla nie trafia do commita**. To plik lokalny, jak pozostałe skille w tym katalogu. Rejestracja w Arsenale (`Vault/Arsenal/Skills`) jest poza zakresem.

## Mapa plików

| Plik                                            | Zmiana    | Odpowiedzialność                                                           |
| ----------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| `contexts/bc_inbox/models.ts`                   | modyfikuj | typy `MoveInput`, `MoveResult`                                             |
| `contexts/bc_inbox/schemas.ts`                  | modyfikuj | `MoveInboxItemSchema`, `MoveInboxBody`, `MoveResultDto`, `toMoveResultDto` |
| `contexts/bc_inbox/services.ts`                 | modyfikuj | `moveItem(id, input)`                                                      |
| `contexts/bc_inbox/router.ts`                   | modyfikuj | handler `moveItem`                                                         |
| `app/api/inbox/[id]/move/route.ts`              | utwórz    | tylko re-eksport `POST`                                                    |
| `src/features/home/inboxMove.ts`                | utwórz    | czyste funkcje: `defaultTarget`, `defaultNoteTitle`, `toMoveBody`          |
| `src/features/home/InboxMoveForm.tsx`           | utwórz    | formularz celu (projekt / zadanie ogólne / notatka)                        |
| `src/features/home/InboxItemDialog.tsx`         | modyfikuj | przycisk „Przenieś do…”, przełączenie na formularz                         |
| `src/features/home/InboxPanel.tsx`              | modyfikuj | `move()` woła trasę, odświeża listę i kafel                                |
| `tests/unit/contexts/bc_inbox/schemas.test.ts`  | utwórz    | walidacja wejścia                                                          |
| `tests/unit/contexts/bc_inbox/services.test.ts` | modyfikuj | `moveItem`                                                                 |
| `tests/unit/contexts/bc_inbox/router.test.ts`   | modyfikuj | kody HTTP trasy `move`                                                     |
| `tests/unit/features/home/inboxMove.test.ts`    | utwórz    | czyste funkcje UI                                                          |
| `tests/unit/features/home/HomeView.test.tsx`    | modyfikuj | okno „Przenieś do…” w panelu Inbox                                         |
| `.claude/skills/segreguj-inbox/SKILL.md`        | utwórz    | rytuał agenta (lokalny, bez commita)                                       |

---

### Zadanie 1: typy i schemat wejścia

**Pliki:**

- Modyfikuj: `contexts/bc_inbox/models.ts` (dopisz na końcu pliku)
- Modyfikuj: `contexts/bc_inbox/schemas.ts`
- Utwórz: `tests/unit/contexts/bc_inbox/schemas.test.ts`

- [ ] **Krok 1: napisz test (czerwony)**

Utwórz `tests/unit/contexts/bc_inbox/schemas.test.ts`:

```ts
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
```

- [ ] **Krok 2: uruchom i potwierdź, że pada**

Run: `npx vitest run tests/unit/contexts/bc_inbox/schemas.test.ts`
Expected: FAIL (`MoveInboxItemSchema` / `toMoveResultDto` nie istnieją: „Cannot read properties of undefined” albo „is not a function”).

- [ ] **Krok 3: dopisz typy do `models.ts`**

Na końcu `contexts/bc_inbox/models.ts` dopisz:

```ts
/** Cel przeniesienia wpisu (po walidacji przez `MoveInboxItemSchema`; tekst jednoliniowy i przycięty). */
export type MoveInput =
  | { target: "project"; projectId: string; column: "next" | "icebox"; text: string }
  | { target: "task"; text: string }
  | { target: "note"; title: string; text: string };

/** `ref`: id projektu, zadania albo notatki, które powstały. `warning`: cel zapisany, ale wpis nie został zamknięty. */
export type MoveResult = { target: MoveInput["target"]; ref: string; warning?: string };
```

- [ ] **Krok 4: dopisz schemat do `schemas.ts`**

W `contexts/bc_inbox/schemas.ts` zmień import typów na:

```ts
import type { InboxItem, MoveInput, MoveResult } from "./models";
```

a na końcu pliku dopisz:

```ts
/** Jedna linia: białe znaki (w tym nowe linie) → spacja, przycięcie; potem limity. */
const oneLine = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, "text required").max(max, `Maksymalnie ${max} znaków`));

/** Kopia reguł `taskText` z `bc_projects/schemas` (schemas nie importuje innego kontekstu; `applyTaskOp` z serwisu niczego nie waliduje). */
const TRAILING_DONE_DATE_RE = /\s—\s\d{4}-\d{2}-\d{2}$/;
const PROJECT_TASK_MAX = 300;

/** Limity 500 = `MAX_INBOX_TEXT` z models (zgodność pilnuje test). */
export const MoveInboxItemSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("project"),
    projectId: z.string().trim().min(1, "projectId required"),
    column: z.enum(["next", "icebox"]),
    text: oneLine(PROJECT_TASK_MAX)
      .refine((v) => !v.includes("[now::]"), "Tekst nie może zawierać [now::]")
      .refine((v) => !TRAILING_DONE_DATE_RE.test(v), "Tekst nie może kończyć się datą ukończenia"),
  }),
  z.object({ target: z.literal("task"), text: oneLine(500) }),
  z.object({ target: z.literal("note"), title: oneLine(120), text: oneLine(500) }),
]);

/** Ciało `POST /api/inbox/[id]/move` (tekst jednoliniowy; schemat go normalizuje). */
export type MoveInboxBody = MoveInput;

export type MoveResultDto = { ok: true } & MoveResult;

export function toMoveResultDto(r: MoveResult): MoveResultDto {
  const dto: MoveResultDto = { ok: true, target: r.target, ref: r.ref };
  if (r.warning !== undefined) dto.warning = r.warning;
  return dto;
}
```

- [ ] **Krok 5: uruchom i potwierdź, że przechodzi**

Run: `npx vitest run tests/unit/contexts/bc_inbox/schemas.test.ts`
Expected: PASS (wszystkie testy).

- [ ] **Krok 6: commit**

```bash
git add contexts/bc_inbox/models.ts contexts/bc_inbox/schemas.ts tests/unit/contexts/bc_inbox/schemas.test.ts
git commit -m "feat(inbox): schemat wejścia przeniesienia wpisu (projekt, zadanie, notatka)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Zadanie 2: `moveItem` w serwisie

**Pliki:**

- Modyfikuj: `contexts/bc_inbox/services.ts`
- Modyfikuj: `tests/unit/contexts/bc_inbox/services.test.ts`

- [ ] **Krok 1: dopisz mocki innych kontekstów w teście**

W `tests/unit/contexts/bc_inbox/services.test.ts` zaraz po bloku `vi.mock("@/contexts/bc_inbox/repositories", …);` dodaj:

```ts
const mockGetProject = vi.hoisted(() => vi.fn());
const mockApplyTaskOp = vi.hoisted(() => vi.fn());
const mockCreateTask = vi.hoisted(() => vi.fn());
const mockCreateNote = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/bc_projects/services", () => ({
  getProject: mockGetProject,
  applyTaskOp: mockApplyTaskOp,
}));
vi.mock("@/contexts/bc_tasks/services", () => ({ createTask: mockCreateTask }));
vi.mock("@/contexts/bc_notes/services", () => ({ createNote: mockCreateNote }));
```

W liście importów z `@/contexts/bc_inbox/services` dodaj `moveItem,` (alfabetycznie po `listItems,`). Zmień import błędów na:

```ts
import { ConflictError, DomainError, NotFoundError } from "@/lib/errors";
```

- [ ] **Krok 2: dopisz testy (czerwone)**

Na końcu pliku dopisz:

```ts
describe("moveItem", () => {
  const OPEN = [{ id: "e1", text: "Wpis", type: "myśl", at: null }];
  const VERSION = { size: 10, hash: "abc" };

  beforeEach(() => {
    mockRead.mockReturnValue(OPEN);
    mockResolve.mockResolvedValue(true);
    mockGetProject.mockReturnValue({ board: { version: VERSION } });
    mockApplyTaskOp.mockResolvedValue({});
    mockCreateTask.mockResolvedValue({ id: "t1" });
    mockCreateNote.mockResolvedValue({ id: "n1" });
  });

  it("project/next: applyTaskOp z wersją pliku, potem [x]; ref = id projektu", async () => {
    const r = await moveItem("e1", {
      target: "project",
      projectId: "nexus",
      column: "next",
      text: "Zrób X",
    });
    expect(mockGetProject).toHaveBeenCalledWith("nexus");
    expect(mockApplyTaskOp).toHaveBeenCalledWith(
      "nexus",
      { op: "add", column: "next", text: "Zrób X" },
      VERSION
    );
    expect(mockResolve).toHaveBeenCalledWith("e1");
    expect(r).toEqual({ target: "project", ref: "nexus" });
  });

  it("project/icebox: kolumna trafia do applyTaskOp", async () => {
    await moveItem("e1", {
      target: "project",
      projectId: "nexus",
      column: "icebox",
      text: "Kiedyś",
    });
    expect(mockApplyTaskOp.mock.calls[0][1]).toEqual({
      op: "add",
      column: "icebox",
      text: "Kiedyś",
    });
  });

  it("task: createTask z tytułem = tekst; ref = id zadania", async () => {
    const r = await moveItem("e1", { target: "task", text: "Kup mleko" });
    expect(mockCreateTask).toHaveBeenCalledWith({ title: "Kup mleko" });
    expect(mockResolve).toHaveBeenCalledWith("e1");
    expect(r).toEqual({ target: "task", ref: "t1" });
  });

  it("note: createNote z tytułem i treścią; ref = id notatki", async () => {
    const r = await moveItem("e1", { target: "note", title: "Vitest", text: "https://vitest.dev" });
    expect(mockCreateNote).toHaveBeenCalledWith({ title: "Vitest", content: "https://vitest.dev" });
    expect(r).toEqual({ target: "note", ref: "n1" });
  });

  it("wpis nieznany albo już zamknięty: NotFoundError, bez zapisu w celu", async () => {
    mockRead.mockReturnValue([]);
    await expect(moveItem("e1", { target: "task", text: "a" })).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(mockCreateTask).not.toHaveBeenCalled();
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("nieznany projekt (getProject rzuca NotFoundError): wpis nietknięty", async () => {
    mockGetProject.mockImplementation(() => {
      throw new NotFoundError("Nie ma projektu o id x");
    });
    await expect(
      moveItem("e1", { target: "project", projectId: "x", column: "next", text: "a" })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mockApplyTaskOp).not.toHaveBeenCalled();
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("konflikt wersji tasks.md (applyTaskOp rzuca ConflictError): wpis nietknięty", async () => {
    mockApplyTaskOp.mockRejectedValue(new ConflictError("Plik zadań zmienił się w międzyczasie"));
    await expect(
      moveItem("e1", { target: "project", projectId: "nexus", column: "next", text: "a" })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("limit „Teraz” itp. (DomainError z applyTaskOp) przechodzi dalej, wpis nietknięty", async () => {
    mockApplyTaskOp.mockRejectedValue(new DomainError("Limit 3 zadań w kolumnie Teraz", 422));
    await expect(
      moveItem("e1", { target: "project", projectId: "nexus", column: "next", text: "a" })
    ).rejects.toBeInstanceOf(DomainError);
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("błąd zapisu zadania ogólnego: wpis nietknięty", async () => {
    mockCreateTask.mockRejectedValue(new Error("disk"));
    await expect(moveItem("e1", { target: "task", text: "a" })).rejects.toThrow("disk");
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("resolve rzuca po udanym zapisie: wynik z ostrzeżeniem, cel istnieje", async () => {
    mockResolve.mockRejectedValue(new Error("disk"));
    const r = await moveItem("e1", { target: "task", text: "a" });
    expect(mockCreateTask).toHaveBeenCalled();
    expect(r.target).toBe("task");
    expect(r.ref).toBe("t1");
    expect(r.warning).toMatch(/wpis zostaje otwarty/i);
  });

  it("resolve zwraca false (wpis zniknął w międzyczasie): też ostrzeżenie, nie błąd", async () => {
    mockResolve.mockResolvedValue(false);
    const r = await moveItem("e1", { target: "task", text: "a" });
    expect(r.warning).toBeDefined();
  });
});
```

- [ ] **Krok 3: uruchom i potwierdź, że pada**

Run: `npx vitest run tests/unit/contexts/bc_inbox/services.test.ts`
Expected: FAIL (`moveItem is not a function`); pozostałe, istniejące testy w pliku nadal zielone.

- [ ] **Krok 4: zaimplementuj `moveItem`**

W `contexts/bc_inbox/services.ts` zmień importy na początku pliku:

```ts
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
```

Na końcu pliku dopisz:

```ts
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
```

- [ ] **Krok 5: uruchom i potwierdź, że przechodzi**

Run: `npx vitest run tests/unit/contexts/bc_inbox/services.test.ts`
Expected: PASS (wszystkie, także dotychczasowe).

- [ ] **Krok 6: test architektury**

Run: `npx vitest run tests/unit/architecture.static.test.ts`
Expected: PASS. Gdy pęknie (np. reguła kierunku wywołań między kontekstami), napraw **kodem** w `bc_inbox/services.ts`, nie testem.

- [ ] **Krok 7: commit**

```bash
git add contexts/bc_inbox/services.ts tests/unit/contexts/bc_inbox/services.test.ts
git commit -m "feat(inbox): moveItem przenosi wpis do zadania projektu, zadania ogólnego albo notatki

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Zadanie 3: trasa `POST /api/inbox/[id]/move`

**Pliki:**

- Modyfikuj: `contexts/bc_inbox/router.ts`
- Utwórz: `app/api/inbox/[id]/move/route.ts`
- Modyfikuj: `tests/unit/contexts/bc_inbox/router.test.ts`

- [ ] **Krok 1: rozszerz mock serwisu i importy w teście routera**

W `tests/unit/contexts/bc_inbox/router.test.ts`:

1. Zmień import błędów: `import { ConflictError, DomainError, NotFoundError } from "@/lib/errors";`
2. Obok pozostałych `vi.hoisted` dodaj `const mockMove = vi.hoisted(() => vi.fn());`
3. W fabryce `vi.mock("@/contexts/bc_inbox/services", () => ({ … }))` dodaj pole `moveItem: mockMove,`
4. W liście importów z `@/contexts/bc_inbox/router` dodaj `moveItem,` (po `listInbox,`).

- [ ] **Krok 2: dopisz testy (czerwone)**

Na końcu pliku dopisz:

```ts
describe("POST /api/inbox/[id]/move", () => {
  const move = (body: unknown, id = "e1") =>
    moveItem(
      new NextRequest(`http://localhost/api/inbox/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) }
    );
  const project = { target: "project", projectId: "nexus", column: "next", text: "Zrób X" };

  it("200: przekazuje id i znormalizowane wejście do serwisu, zwraca ok + ref", async () => {
    mockMove.mockResolvedValue({ target: "project", ref: "nexus" });
    const res = await move({ ...project, text: "  Zrób\nX " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, target: "project", ref: "nexus" });
    expect(mockMove).toHaveBeenCalledWith("e1", { ...project, text: "Zrób X" });
  });

  it("200: trzy cele; warning trafia do odpowiedzi", async () => {
    mockMove.mockResolvedValueOnce({ target: "task", ref: "t1" });
    expect((await move({ target: "task", text: "a" })).status).toBe(200);
    mockMove.mockResolvedValueOnce({ target: "note", ref: "n1", warning: "w" });
    const res = await move({ target: "note", title: "T", text: "a" });
    expect(await res.json()).toEqual({ ok: true, target: "note", ref: "n1", warning: "w" });
  });

  it("400: zły kształt, kolumna now, zły JSON; serwis nie jest wołany", async () => {
    expect((await move({ ...project, column: "now" })).status).toBe(400);
    expect((await move({ target: "task", text: "" })).status).toBe(400);
    expect((await move("{")).status).toBe(400);
    expect(mockMove).not.toHaveBeenCalled();
  });

  it("404 (wpis albo projekt), 409 (konflikt tasks.md), 422 (limit)", async () => {
    mockMove.mockRejectedValueOnce(new NotFoundError("Nie ma otwartego wpisu e1"));
    expect((await move(project)).status).toBe(404);
    mockMove.mockRejectedValueOnce(new ConflictError("Plik zadań zmienił się w międzyczasie"));
    expect((await move(project)).status).toBe(409);
    mockMove.mockRejectedValueOnce(new DomainError("Limit", 422));
    expect((await move(project)).status).toBe(422);
  });
});
```

- [ ] **Krok 3: uruchom i potwierdź, że pada**

Run: `npx vitest run tests/unit/contexts/bc_inbox/router.test.ts`
Expected: FAIL (`moveItem` nie jest wyeksportowany z routera).

- [ ] **Krok 4: dodaj handler**

W `contexts/bc_inbox/router.ts` zmień import schematów na:

```ts
import {
  CreateInboxItemSchema,
  MoveInboxItemSchema,
  toInboxDto,
  toInboxItemDto,
  toMoveResultDto,
} from "./schemas";
```

i dopisz (po `resolveItem`):

```ts
/** POST: przenosi otwarty wpis do zadania projektu, zadania ogólnego albo notatki (UI i agent CLI). */
export async function moveItem(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const parsed = await parseBody(request, MoveInboxItemSchema, { details: false });
  if (parsed.success === false) return parsed.response;
  const { id } = await ctx.params;
  try {
    return NextResponse.json(toMoveResultDto(await services.moveItem(id, parsed.data)));
  } catch (err) {
    return handleServiceError(err);
  }
}
```

- [ ] **Krok 5: utwórz trasę (tylko re-eksport)**

Utwórz `app/api/inbox/[id]/move/route.ts`:

```ts
export { moveItem as POST } from "@/contexts/bc_inbox/router";

export const dynamic = "force-dynamic";
```

- [ ] **Krok 6: uruchom testy trasy i architektury**

Run: `npx vitest run tests/unit/contexts/bc_inbox/router.test.ts tests/unit/architecture.static.test.ts`
Expected: PASS. Gdy `parseBody` z zod 4 nie przyjmie typu schematu (błąd tsc dopiero w Zadaniu 7), nie obchodź tego rzutowaniem na ślepo: zgłoś błąd i dopasuj typ w `schemas.ts`.

- [ ] **Krok 7: commit**

```bash
git add contexts/bc_inbox/router.ts "app/api/inbox/[id]/move/route.ts" tests/unit/contexts/bc_inbox/router.test.ts
git commit -m "feat(inbox): POST /api/inbox/[id]/move

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Zadanie 4: czyste funkcje UI

**Pliki:**

- Utwórz: `src/features/home/inboxMove.ts`
- Utwórz: `tests/unit/features/home/inboxMove.test.ts`

- [ ] **Krok 1: napisz test (czerwony)**

Utwórz `tests/unit/features/home/inboxMove.test.ts`:

```ts
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
```

- [ ] **Krok 2: uruchom i potwierdź, że pada**

Run: `npx vitest run tests/unit/features/home/inboxMove.test.ts`
Expected: FAIL (nie można zaimportować modułu `inboxMove`).

- [ ] **Krok 3: zaimplementuj**

Utwórz `src/features/home/inboxMove.ts`:

```ts
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
```

- [ ] **Krok 4: uruchom i potwierdź, że przechodzi**

Run: `npx vitest run tests/unit/features/home/inboxMove.test.ts`
Expected: PASS.

- [ ] **Krok 5: commit**

```bash
git add src/features/home/inboxMove.ts tests/unit/features/home/inboxMove.test.ts
git commit -m "feat(inbox): czyste funkcje formularza przenoszenia wpisu

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Zadanie 5: formularz w oknie wpisu

**Pliki:**

- Utwórz: `src/features/home/InboxMoveForm.tsx`
- Modyfikuj: `src/features/home/InboxItemDialog.tsx`
- Modyfikuj: `src/features/home/InboxPanel.tsx`
- Modyfikuj: `tests/unit/features/home/HomeView.test.tsx` (nowy `describe` w bloku z panelem Inbox, po `describe("modal wpisu inboxu: kasowanie", …)`)

- [ ] **Krok 1: napisz testy (czerwone)**

W `tests/unit/features/home/HomeView.test.tsx`, bezpośrednio po zamknięciu bloku `describe("modal wpisu inboxu: kasowanie", () => { … });` (tuż przed `test("Alt+I (focusInbox): …`) dopisz:

```tsx
describe("modal wpisu inboxu: przenieś do… (segregacja)", () => {
  const moveCalls = () =>
    mockApiFetch.mock.calls.filter(
      (c) => String(c[0]).endsWith("/move") && c[1]?.method === "POST"
    );

  async function openEntry(name: string) {
    respond(FULL);
    render(<HomeView {...defaultProps} />);
    const panel = await screen.findByRole("region", { name: "Inbox" });
    fireEvent.click(await within(panel).findByRole("button", { name }));
    const dialog = await screen.findByRole("dialog", { name: "Wpis z inboxu" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Przenieś do…" }));
    return dialog;
  }

  test("link: domyślny cel to notatka, tytuł z pierwszego zdania; „Przenieś” wysyła move i odświeża listę", async () => {
    const dialog = await openEntry("Artykuł o vitest");
    expect(within(dialog).getByRole("radio", { name: "Notatka" })).toBeChecked();
    expect(within(dialog).getByLabelText("Tytuł notatki")).toHaveValue("Artykuł o vitest");
    const before = mockApiFetch.mock.calls.filter((c) => c[0] === "/api/inbox").length;
    fireEvent.click(within(dialog).getByRole("button", { name: "Przenieś" }));
    await waitFor(() => expect(moveCalls()).toHaveLength(1));
    expect(moveCalls()[0][0]).toBe("/api/inbox/a-0/move");
    expect(JSON.parse(moveCalls()[0][1].body)).toEqual({
      target: "note",
      title: "Artykuł o vitest",
      text: "Artykuł o vitest",
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Wpis z inboxu" })).not.toBeInTheDocument()
    );
    await waitFor(() =>
      expect(mockApiFetch.mock.calls.filter((c) => c[0] === "/api/inbox").length).toBeGreaterThan(
        before
      )
    );
  });

  test("bug: domyślny cel to zadanie w projekcie; bez wybranego projektu „Przenieś” jest zablokowane", async () => {
    const dialog = await openEntry("Code Sensei: pusty stan listy");
    expect(within(dialog).getByRole("radio", { name: "Zadanie w projekcie" })).toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Przenieś" })).toBeDisabled();
  });

  test("projekt i kolumna Backlog: ciało move; projekt z firmy pokazuje „Dane z firmy”", async () => {
    const dialog = await openEntry("Code Sensei: pusty stan listy");
    const select = await within(dialog).findByLabelText("Projekt");
    await within(dialog).findByRole("option", { name: "Projekt firmowy" });
    fireEvent.change(select, { target: { value: "firma" } });
    expect(within(dialog).getByText("Dane z firmy")).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "nexus" } });
    expect(within(dialog).queryByText("Dane z firmy")).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Kolumna"), { target: { value: "icebox" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Przenieś" }));
    await waitFor(() => expect(moveCalls()).toHaveLength(1));
    expect(JSON.parse(moveCalls()[0][1].body)).toEqual({
      target: "project",
      projectId: "nexus",
      column: "icebox",
      text: "Code Sensei: pusty stan listy",
    });
  });

  test("zadanie ogólne: ciało move bez projektu", async () => {
    const dialog = await openEntry("Code Sensei: pusty stan listy");
    fireEvent.click(within(dialog).getByRole("radio", { name: "Zadanie ogólne" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Przenieś" }));
    await waitFor(() => expect(moveCalls()).toHaveLength(1));
    expect(JSON.parse(moveCalls()[0][1].body)).toEqual({
      target: "task",
      text: "Code Sensei: pusty stan listy",
    });
  });

  test("409 pokazuje komunikat w oknie i zostawia je otwarte", async () => {
    const dialog = await openEntry("Code Sensei: pusty stan listy");
    const base = mockApiFetch.getMockImplementation()!;
    mockApiFetch.mockImplementation((url: string, init?: RequestInit) =>
      String(url).endsWith("/move")
        ? Promise.resolve({ ok: false, status: 409, json: async () => ({ error: "x" }) })
        : base(url, init)
    );
    fireEvent.click(within(dialog).getByRole("radio", { name: "Zadanie ogólne" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Przenieś" }));
    expect(
      await within(dialog).findByText("Plik zadań zmienił się, spróbuj ponownie")
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Wpis z inboxu" })).toBeInTheDocument();
  });

  test("warning z serwera: okno się zamyka, ostrzeżenie widać w panelu", async () => {
    const dialog = await openEntry("Code Sensei: pusty stan listy");
    const base = mockApiFetch.getMockImplementation()!;
    mockApiFetch.mockImplementation((url: string, init?: RequestInit) =>
      String(url).endsWith("/move")
        ? Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              target: "task",
              ref: "t1",
              warning: "Wpis zostaje otwarty",
            }),
          })
        : base(url, init)
    );
    fireEvent.click(within(dialog).getByRole("radio", { name: "Zadanie ogólne" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Przenieś" }));
    const panel = screen.getByRole("region", { name: "Inbox" });
    expect(await within(panel).findByText("Wpis zostaje otwarty")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Wpis z inboxu" })).not.toBeInTheDocument();
  });

  test("pusty rejestr projektów: cel „Zadanie w projekcie” jest zablokowany i wybrane zostaje zadanie ogólne", async () => {
    respond(FULL);
    const base = mockApiFetch.getMockImplementation()!;
    mockApiFetch.mockImplementation((url: string, init?: RequestInit) =>
      url === "/api/projects"
        ? Promise.resolve({ ok: true, json: async () => ({ projects: [], warnings: [] }) })
        : base(url, init)
    );
    render(<HomeView {...defaultProps} />);
    const panel = await screen.findByRole("region", { name: "Inbox" });
    fireEvent.click(
      await within(panel).findByRole("button", { name: "Code Sensei: pusty stan listy" })
    );
    const dialog = await screen.findByRole("dialog", { name: "Wpis z inboxu" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Przenieś do…" }));
    await waitFor(() =>
      expect(within(dialog).getByRole("radio", { name: "Zadanie w projekcie" })).toBeDisabled()
    );
    expect(within(dialog).getByRole("radio", { name: "Zadanie ogólne" })).toBeChecked();
  });

  test("„Anuluj” wraca do widoku wpisu bez wywołania move", async () => {
    const dialog = await openEntry("Artykuł o vitest");
    fireEvent.click(within(dialog).getByRole("button", { name: "Anuluj" }));
    expect(within(dialog).getByRole("button", { name: "Usuń" })).toBeInTheDocument();
    expect(moveCalls()).toHaveLength(0);
  });
});
```

- [ ] **Krok 2: uruchom i potwierdź, że pada**

Run: `npx vitest run tests/unit/features/home/HomeView.test.tsx -t "przenieś do"`
Expected: FAIL (brak przycisku „Przenieś do…”). Pozostałe testy pliku nie są tu uruchamiane.

- [ ] **Krok 3: utwórz `InboxMoveForm.tsx`**

Utwórz `src/features/home/InboxMoveForm.tsx`:

```tsx
// src/features/home/InboxMoveForm.tsx
import React, { useEffect, useState } from "react";
import type { InboxItemDto, MoveInboxBody } from "@/contexts/bc_inbox/schemas";
import {
  defaultNoteTitle,
  defaultTarget,
  toMoveBody,
  type MoveColumn,
  type MoveTarget,
} from "./inboxMove";

type ApiFetch = (url: string, options?: RequestInit) => Promise<Response>;
type ProjectOption = { id: string; name: string; owner?: "personal" | "work" };

const TARGETS: { value: MoveTarget; label: string }[] = [
  { value: "project", label: "Zadanie w projekcie" },
  { value: "task", label: "Zadanie ogólne" },
  { value: "note", label: "Notatka" },
];

/** Formularz „Przenieś do…”: cel, projekt i kolumna, tytuł notatki i tekst (domyślnie treść wpisu). */
export function InboxMoveForm({
  item,
  apiFetch,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  item: InboxItemDto;
  apiFetch: ApiFetch;
  busy: boolean;
  error: string | null;
  onSubmit: (body: MoveInboxBody) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState<MoveTarget>(defaultTarget(item.type));
  const [text, setText] = useState(item.text);
  const [title, setTitle] = useState(defaultNoteTitle(item.text));
  const [projectId, setProjectId] = useState("");
  const [column, setColumn] = useState<MoveColumn>("next");
  const [projects, setProjects] = useState<ProjectOption[] | null>(null);

  useEffect(() => {
    apiFetch("/api/projects")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { projects?: ProjectOption[] }) =>
        setProjects(Array.isArray(data.projects) ? data.projects : [])
      )
      .catch(() => setProjects([]));
  }, [apiFetch]);

  const noProjects = projects !== null && projects.length === 0;

  useEffect(() => {
    if (noProjects) setTarget((t) => (t === "project" ? "task" : t));
  }, [noProjects]);

  const selected = projects?.find((p) => p.id === projectId);
  const body = toMoveBody({ target, text, projectId, column, title });

  return (
    <div className="kok-move">
      <fieldset className="kok-field">
        <legend>Cel</legend>
        {TARGETS.map((t) => (
          <label key={t.value}>
            <input
              type="radio"
              name="inbox-move-target"
              checked={target === t.value}
              disabled={t.value === "project" && noProjects}
              onChange={() => setTarget(t.value)}
            />{" "}
            {t.label}
          </label>
        ))}
      </fieldset>
      {target === "project" ? (
        <>
          <label className="kok-field">
            <span>Projekt</span>
            <select
              className="kok-input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">— wybierz projekt —</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {selected?.owner === "work" ? (
            <span className="kok-badge kok-badge--warn">Dane z firmy</span>
          ) : null}
          <label className="kok-field">
            <span>Kolumna</span>
            <select
              className="kok-input"
              value={column}
              onChange={(e) => setColumn(e.target.value === "icebox" ? "icebox" : "next")}
            >
              <option value="next">Next</option>
              <option value="icebox">Backlog</option>
            </select>
          </label>
        </>
      ) : null}
      {target === "note" ? (
        <label className="kok-field">
          <span>Tytuł notatki</span>
          <input
            className="kok-input"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      ) : null}
      <label className="kok-field">
        <span>Tekst</span>
        <input
          className="kok-input"
          maxLength={target === "project" ? 300 : 500}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {error ? (
        <p className="kok-state kok-state--error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="kok-modal__actions">
        <button type="button" className="kok-btn kok-btn--ghost" onClick={onCancel}>
          Anuluj
        </button>
        <button
          type="button"
          className="kok-btn kok-btn--primary"
          disabled={busy || body === null}
          onClick={() => body && onSubmit(body)}
        >
          Przenieś
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Krok 4: zmień `InboxItemDialog.tsx`**

Zastąp cały plik `src/features/home/InboxItemDialog.tsx` wersją:

```tsx
// src/features/home/InboxItemDialog.tsx
import React, { useState } from "react";
import type { InboxItemDto, MoveInboxBody } from "@/contexts/bc_inbox/schemas";
import { InboxMoveForm } from "./InboxMoveForm";

/**
 * Pełny wpis inboxu z akcjami: „Gotowe” (zostaje w pliku jako `[x]`), „Usuń” (znika z pliku)
 * albo „Przenieś do…” (zadanie projektu, zadanie ogólne, notatka).
 */
export function InboxItemDialog({
  item,
  apiFetch,
  busy,
  error,
  onResolve,
  onDelete,
  onMove,
  onClose,
}: {
  item: InboxItemDto;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  busy: boolean;
  error: string | null;
  onResolve: () => void;
  onDelete: () => void;
  onMove: (body: MoveInboxBody) => void;
  onClose: () => void;
}) {
  const [moving, setMoving] = useState(false);
  return (
    <div className="kok-overlay">
      <div role="dialog" aria-label="Wpis z inboxu" className="kok-modal">
        <div className="kok-modal__head">
          <h3 className="kok-modal__title">Wpis z inboxu</h3>
          <p className="kok-modal__sub">
            {item.type}
            {item.at ? ` · ${item.at.replace("T", " ")}` : ""}
          </p>
        </div>
        {moving ? (
          <InboxMoveForm
            item={item}
            apiFetch={apiFetch}
            busy={busy}
            error={error}
            onSubmit={onMove}
            onCancel={() => setMoving(false)}
          />
        ) : (
          <>
            <p className="kok-inbox__full">{item.text}</p>
            {error ? (
              <p className="kok-state kok-state--error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="kok-modal__actions">
              <button type="button" onClick={onClose} className="kok-btn kok-btn--ghost">
                Zamknij
              </button>
              <button
                type="button"
                className="kok-btn"
                disabled={busy}
                onClick={() => setMoving(true)}
              >
                Przenieś do…
              </button>
              <button type="button" className="kok-btn" disabled={busy} onClick={onResolve}>
                Gotowe
              </button>
              <button
                type="button"
                className="kok-btn kok-btn--danger"
                disabled={busy}
                onClick={onDelete}
              >
                Usuń
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Krok 5: zmień `InboxPanel.tsx`**

W `src/features/home/InboxPanel.tsx`:

1. Zmień import typów: `import type { InboxDto, InboxItemDto, MoveInboxBody } from "@/contexts/bc_inbox/schemas";`
2. Po funkcji `add` (przed `return (`) dopisz:

```tsx
async function move(item: InboxItemDto, body: MoveInboxBody) {
  setBusy(true);
  setError(null);
  try {
    const res = await apiFetch(`/api/inbox/${encodeURIComponent(item.id)}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(
        res.status === 409
          ? "Plik zadań zmienił się, spróbuj ponownie"
          : (payload.error ?? `HTTP ${res.status}`)
      );
    }
    const result = (await res.json().catch(() => ({}))) as { warning?: string };
    const refreshed = await load();
    onChanged();
    setOpen(null);
    if (result.warning) setError(result.warning);
    else if (!refreshed) setError("Przeniesiono, ale nie udało się odświeżyć listy");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Nie udało się przenieść");
  } finally {
    setBusy(false);
  }
}
```

3. W użyciu `<InboxItemDialog … />` dodaj dwa propsy (obok `item={open}`):

```tsx
          apiFetch={apiFetch}
          onMove={(body) => void move(open, body)}
```

Uwaga: `load()` w razie błędu sam ustawia `error` na „Nie udało się wczytać inboxu”; ostrzeżenie `warning` ustawiamy po nim, więc wygrywa. To zamierzone.

- [ ] **Krok 6: uruchom testy**

Run: `npx vitest run tests/unit/features/home/HomeView.test.tsx`
Expected: PASS (nowy `describe` i wszystkie dotychczasowe testy pliku, w tym „modal wpisu inboxu: kasowanie”).

- [ ] **Krok 7: commit**

```bash
git add src/features/home/InboxMoveForm.tsx src/features/home/InboxItemDialog.tsx src/features/home/InboxPanel.tsx tests/unit/features/home/HomeView.test.tsx
git commit -m "feat(inbox): okno wpisu: Przenieś do… (projekt, zadanie ogólne, notatka)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Zadanie 6: skilla `/segreguj-inbox` (plik lokalny, bez commita)

**Pliki:**

- Utwórz: `.claude/skills/segreguj-inbox/SKILL.md` (`.claude/` jest w `.gitignore`; nie używaj `git add -f`)

- [ ] **Krok 1: utwórz skillę**

Utwórz `.claude/skills/segreguj-inbox/SKILL.md`:

````markdown
---
name: segreguj-inbox
description: Segreguj wpisy z Inboxu Kokpitu Monolith do zadań projektów, zadań ogólnych i notatek. Użyj, gdy użytkownik prosi o segregację inboxu (np. wieczorem, /segreguj-inbox). Proponujesz cele w terminalu, użytkownik zatwierdza, dopiero potem wołasz API aplikacji.
---

# Segregacja inboxu (Monolith)

Wpisy leżą w `Inbox/inbox.md` vaulta. **Nie edytujesz vaulta ręcznie** i nie czytasz go z dysku: wszystko idzie przez API działającej aplikacji (`http://127.0.0.1:3100`). Aplikacja nie ma modelu AI; propozycje robisz Ty.

## Reguły

- Wołaj tylko `GET /api/inbox`, `GET /api/projects` i `POST /api/inbox/<id>/move`.
- **Pomijaj projekty z `owner: "work"`**: nie proponuj ich i nie przenoś do nich wpisów (dane z firmy). Wpis, który pasuje tylko do takiego projektu, zostaje w inboxie, a użytkownik przenosi go sam w UI.
- Bez zatwierdzenia użytkownika nie wołaj `move`.
- Nie ruszaj `Projects/_registry.yaml`, `tasks.md` ani innych plików bezpośrednio.

## Kroki

1. Sprawdź, czy aplikacja odpowiada: `curl -sf http://127.0.0.1:3100/api/inbox`. Gdy nie, napisz „Uruchom aplikację (`npm run dev`, port 3100) i wywołaj mnie ponownie” i **zakończ**.
2. Pobierz otwarte wpisy: `curl -s http://127.0.0.1:3100/api/inbox`. Odpowiedź: `{ "items": [{ "id", "text", "type", "at" }], "open", "closed" }`. Gdy `open` = 0, napisz „Inbox jest pusty” i zakończ.
3. Pobierz projekty: `curl -s http://127.0.0.1:3100/api/projects` (pole `projects[]` z `id`, `name`, `owner`). Odrzuć `owner: "work"`.
4. Dla każdego wpisu zaproponuj cel:
   - **zadanie w projekcie** (`target: "project"`, `projectId`, `column`: `next` albo `icebox` = Backlog): konkretna, krótka rzecz do zrobienia w jednym z projektów. Tekst jedna linia, **do 300 znaków**, bez `[now::]`, bez końcowej daty `— RRRR-MM-DD`. Do „Teraz” nigdy nie przenosisz.
   - **zadanie ogólne** (`target: "task"`): rzecz do zrobienia bez projektu.
   - **notatka** (`target: "note"`, `title` do 120 znaków): link, snippet, wiedza do zachowania.
   - **zostaw w inboxie**: gdy cel jest niejasny albo pasuje tylko projekt z firmy.
     Popraw tekst, jeśli to ma sens (skrót, wielka litera), ale nie zmieniaj sensu.
5. Pokaż użytkownikowi **jedną tabelę** (wpis → cel, projekt/kolumna lub tytuł, tekst po poprawce). Zapytaj: „Zatwierdzasz całość, wybrane numery, czy poprawiasz?”. Czekaj na odpowiedź.
6. Dla zatwierdzonych wierszy, po jednym:

   ```bash
   curl -s -X POST "http://127.0.0.1:3100/api/inbox/<id>/move" \
     -H 'Content-Type: application/json' \
     -d '{"target":"project","projectId":"<id projektu>","column":"next","text":"<tekst>"}'
   ```

   Warianty ciała: `{"target":"task","text":"…"}` oraz `{"target":"note","title":"…","text":"…"}`. Pamiętaj o poprawnym JSON (cudzysłowy w tekście). Id wpisu w URL zakoduj, jeśli zawiera znaki specjalne.

7. Obsługa odpowiedzi: `200` z `ref` = zrobione; `200` z `warning` = cel zapisany, ale wpis został otwarty (zgłoś, nie ponawiaj, bo powstałby duplikat); `404` = wpis albo projekt nie istnieje (pomiń); `409` = plik zadań zmienił się, ponów **raz**; `400`/`422` = zgłoś komunikat błędu i pomiń wiersz.
8. Na koniec podsumuj: ile przeniesiono (z `ref`), co zawiodło (kod i komunikat), co zostało w inboxie.
````

- [ ] **Krok 2: sprawdź, że plik nie trafi do gita**

Run: `git status --short .claude/skills/segreguj-inbox`
Expected: brak wyjścia (ignorowany). Nic nie commitujesz.

---

### Zadanie 7: weryfikacja, ręczny test na kopii vaulta, zamknięcie

- [ ] **Krok 1: pełna weryfikacja przez Cursora (nie czytaj pełnych logów)**

Run (jedno wywołanie, `--tier light`, zatwierdzanie tylko poleceń z listy zgód):

```bash
scripts/ask-helper.sh --role task --approve-allowed --tier light --fresh cursor "W katalogu Monolith uruchom po kolei: npx tsc --noEmit, npm run lint, npx vitest run. Nie modyfikuj plików. Odpowiedz 'przeszło' albo listą plik:linia + przyczyna dla każdego błędu."
```

Expected: „przeszło”. Błędy napraw **kodem** (nie zmieniaj `architecture.static.test.ts`). Typowe miejsca: typ `parseBody` z zod 4 przy `MoveInboxItemSchema` (popraw w `schemas.ts`), importy w UI (UI importuje z kontekstu tylko `schemas`).

- [ ] **Krok 2: build**

```bash
scripts/ask-helper.sh --role task --approve-allowed --tier light --keep cursor "Uruchom npm run build w katalogu Monolith. Odpowiedz 'przeszło' albo listą błędów plik:linia + przyczyna."
```

Expected: „przeszło”. (Zapisuje tylko `.next/`.)

- [ ] **Krok 3: ręczny test na kopii vaulta (scratchpad, nie prawdziwy vault)**

```bash
SCRATCH=/tmp/claude-1000/-home-miro7224-projects-Brain-7224-Monolith/743d9e0c-2557-4e36-b2b0-a37f61e1a76e/scratchpad
rm -rf "$SCRATCH/vault-copy" && cp -r ~/projects/Brain_7224/NEXUS/Vault "$SCRATCH/vault-copy"
NEXUS_VAULT_PATH="$SCRATCH/vault-copy" npm run dev
```

(w drugim terminalu / w tle; port 3100: jeśli działa już Twoja instancja na prawdziwym vaulcie, najpierw ją zatrzymaj, bo skilla ma adres `127.0.0.1:3100` na stałe). Sprawdź:

1. `curl -s http://127.0.0.1:3100/api/inbox` pokazuje wpisy z kopii.
2. `curl -s -X POST http://127.0.0.1:3100/api/inbox/<id>/move -H 'Content-Type: application/json' -d '{"target":"task","text":"Próba segregacji"}'` zwraca `{"ok":true,"target":"task","ref":"…"}`; wpis ma `[x]` w `$SCRATCH/vault-copy/Inbox/inbox.md`, a zadanie jest w `$SCRATCH/vault-copy/Tasks/tasks.md`.
3. W przeglądarce (Playwright albo ręcznie) na Kokpicie: otwórz wpis, „Przenieś do…”, przenieś do projektu w kolumnę Backlog; sprawdź wiersz w `Projects/<id>/tasks.md` kopii.
4. Skilla: uruchom `/segreguj-inbox` w Claude Code przy działającej aplikacji na kopii; sprawdź tabelę propozycji, zatwierdzenie i wywołania `move`.

Prawdziwego `../NEXUS/Vault/` i `Projects/_registry.yaml` nie dotykaj. Czego nie udało się sprawdzić, wpisz wprost w opisie PR.

- [ ] **Krok 4: wpis w NEXUS (za zgodą użytkownika)**

Zapytaj użytkownika o zgodę, potem w `../NEXUS/Vault/Projects/monolith/tasks.md` dodaj wpis „Inbox: segregacja” (PR #NN, data) i do Backlogu: cel „bug” (z widokiem Bugów per projekt), cel „kurs” (po Arsenale etap 3–4), tryb wieczornej kolejki w UI, zlecenia z przycisku (po kolejce i MCP, G1). Commit tylko `tasks.md`.

- [ ] **Krok 5: zakończenie gałęzi**

Użyj superpowers:finishing-a-development-branch (PR do `main`; opis kończy się linią `🤖 Generated with [Claude Code](https://claude.com/claude-code)`).
