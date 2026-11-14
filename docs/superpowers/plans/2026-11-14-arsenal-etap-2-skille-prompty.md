# Arsenał, etap 2: Skille i prompty. Plan implementacji

> **Dla agentów wykonujących:** WYMAGANY PODSKILL: superpowers:subagent-driven-development (zalecany) albo superpowers:executing-plans. Kroki mają składnię checkboxów (`- [ ]`).

**Cel:** Zakładka „Skille i prompty” w karcie Arsenał: katalog skilli (z Vaulta) i promptów (z `Knowledge/prompty/`), generowanie polecenia albo promptu wdrożenia do projektu, zapis znacznika „wdrożone” we frontmatterze oraz skrypt `scripts/deploy-skill.sh`.

**Architektura:** Nowy kontekst `contexts/bc_arsenal/` (pięć plików wg ADR-021). `repositories.ts` czyta Vault (`lib/nexus/vault-fs`) i jedynym zapisem dopisuje `deployed` we frontmatterze `skill.md`. `services.ts` zawiera reguły (parsowanie, `summary` zastępcze, walidacja `deployed` względem rejestru, generowanie poleceń); listę projektów bierze z `listProjects()` kontekstu `bc_projects`. UI w `src/features/arsenal/` importuje z kontekstu tylko `schemas`. Nic nie jest uruchamiane z UI.

**Stos:** Next.js 14, TypeScript, zod, Vitest + Testing Library (`tests/unit/**`), `yaml` przez `lib/nexus/frontmatter.ts`, bash (skrypt wdrożenia).

**Spec:** `docs/superpowers/specs/2026-11-14-karta-arsenal-design.md` §3, §6, §7 (etap 2). Wszystkie komendy z katalogu `~/projects/Brain_7224/Monolith`. Zgodnie z CLAUDE.md testy, lint, typecheck i build uruchamia `cursor` (`scripts/ask-helper.sh --role task --approve-allowed cursor "..."`) i zwraca „przeszło” albo listę `plik:linia + przyczyna`; w krokach poniżej podano same komendy.

---

## Ustalenia z odczytu kodu (zmieniają albo uzupełniają założenia specu)

1. **`description` zostaje we frontmatterze `skill.md`.** Spec §3.1 go nie wymienia w tabeli, ale mówi o nim w opisie `summary`, a Claude Code potrzebuje go do aktywacji skilla. Migracja go zachowuje; skrypt wdrożenia usuwa z kopii tylko klucze Vaultowe (`type`, `slug`, `summary`, `origin`, `deployed`), żeby do repozytorium projektu nie trafiła lista innych projektów.
2. **Szablony ze `templates/` trafiają obok `SKILL.md`, nie do podkatalogu `templates/`.** Oryginalne skille (np. `writing-plans`) mają pliki pomocnicze obok `SKILL.md` i odwołują się do nich po nazwie; migracja przenosi je do `templates/`, a wdrożenie przywraca pierwotny układ. Spec mówi „wraz z `templates/`”; do zapisania w specu (Task 12).
3. **Wdrożenie „zredagowane” to sam prompt do skopiowania**, nie gotowe wywołanie `ask-helper`: prompt zawiera całą treść skilla i szablonów, a wielolinijkowy napis w cudzysłowie powłoki jest kruchy. Użytkownik wkleja go dowolnemu agentowi (w tym `ask-helper --role task`).
4. **Jeden wpis `deployed` na projekt.** Ponowne „Oznacz jako wdrożone” dla tego samego projektu zamienia wpis (nowy `mode` i `date`). Wpisy poprawne kształtem, ale z projektem spoza rejestru, zostają w pliku (nie są kasowane przy zapisie), a w UI są ukryte i zliczane w „pominięto N”. Wpisy uszkodzone kształtem są przy zapisie usuwane.
5. **Lista zakładek karty: `["resources", "skills", "tags"]`, wejście z `Alt+7` zostaje na `resources`.** Zmiana domyślnej zakładki ruszałaby `useCardNavigation.test.ts` i nawyki; kolejność z A1 („Skille” pierwsze) przyjdzie, gdy będą wszystkie cztery zakładki (etapy 3–4). Zakładka `tags` zostaje (spec jej nie usuwa). **Do potwierdzenia przy review planu.**
6. **Stała ostrzeżenia dla projektów z etatu** (`OWNER_WORK_WARNING`) nie jest eksportowana z `bc_projects/services`, a reguły 1–7 zabraniają sięgania do `context-pack`. `bc_arsenal` ma własną stałą `WORK_TARGET_NOTE` z tym samym tekstem; nie rozszerzamy publicznego API `bc_projects`.
7. **Test architektury** (`tests/unit/architecture.static.test.ts`): `bc_arsenal/repositories` importuje `vault-fs`, więc wchodzi do `VAULT_FS_IMPORTERS` (precedens `4198926`). Zmiana testu idzie osobnym commitem, **przed** kodem (Task 1); test będzie czerwony aż do Task 2, bo wpis dotyczy pliku, którego jeszcze nie ma.
8. **`nexus-kb-audit` czyta tylko `Vault/Knowledge`** (`kb_audit.py:22`), więc `Vault/Arsenal/` jest dla niego niewidoczny. Pozostałe skille NEXUS sprawdza krok w Task 11 (przed migracją).
9. **Szablony wyświetlane są płasko** (tylko pliki bezpośrednio w `templates/`); `deploy-skill.sh` kopiuje rekurencyjnie, więc zagnieżdżone pliki (np. `scripts/` w `nexus-kb-audit`) wdrażają się poprawnie, choć lista w UI ich nie pokazuje.
10. **Reguła `schemas → models`:** `schemas.ts` importuje z `models.ts` tylko typy (`import type`). Walidacja slugu jest w `services.ts` (400), jak w `bc_nexus_docs`.

## Mapa plików

| Plik                                                                                                                                                                        | Rola                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `contexts/bc_arsenal/models.ts` (nowy)                                                                                                                                      | typy domeny, stałe (`SKILLS_DIR`, `PROMPTS_DIR`, `SUMMARY_MAX`, `WORK_TARGET_NOTE`)                            |
| `contexts/bc_arsenal/repositories.ts` (nowy)                                                                                                                                | odczyt `skill.md`, promptów, szablonów; zapis `deployed`                                                       |
| `contexts/bc_arsenal/services.ts` (nowy)                                                                                                                                    | `listArsenal`, `getDeployInstructions`, `markDeployed`, czyste pomocniki (`truncate`, `buildDeployCommand`, …) |
| `contexts/bc_arsenal/schemas.ts` (nowy)                                                                                                                                     | zod wejścia i DTO, mapery model → DTO                                                                          |
| `contexts/bc_arsenal/router.ts` (nowy)                                                                                                                                      | trzy handlery HTTP                                                                                             |
| `app/api/arsenal/route.ts`, `.../skills/[slug]/deploy/route.ts`, `.../deployed/route.ts` (nowe)                                                                             | tylko re-eksport handlerów                                                                                     |
| `scripts/deploy-skill.sh` (nowy)                                                                                                                                            | kopiowanie skilla do `<projekt>/.claude/skills/<slug>/`                                                        |
| `src/features/arsenal/arsenalFilters.ts` (nowy)                                                                                                                             | czysta logika filtrów                                                                                          |
| `src/features/arsenal/useArsenal.ts` (nowy)                                                                                                                                 | pobieranie katalogu, filtry, wybór wpisu, instrukcje wdrożenia, oznaczanie                                     |
| `src/features/arsenal/CopyButton.tsx`, `ArsenalFilterBar.tsx`, `DeployPanel.tsx`, `ArsenalDetail.tsx`, `ArsenalSkillsView.tsx`, `arsenal.css` (nowe)                        | widok                                                                                                          |
| `src/features/cards/cards.ts`, `src/features/planowanie/planningTab.ts`, `PlanowanieView.tsx`, `src/translations.ts`, `src/components/layout/MobileMoreDrawer.tsx` (zmiany) | rejestracja zakładki                                                                                           |

Testy: `tests/unit/contexts/bc_arsenal/*.test.ts`, `tests/unit/scripts/deploy-skill/deploy-skill.test.ts`, `tests/unit/features/arsenal/*.test.ts(x)`.

---

## Task 1: Test architektury (osobny commit, czerwony)

**Files:**

- Modify: `tests/unit/architecture.static.test.ts` (lista `VAULT_FS_IMPORTERS`, ok. linii 491)

- [ ] **Step 1: Dopisz wpis na początku listy (kolejność alfabetyczna: `bc_arsenal` < `bc_board`)**

```ts
const VAULT_FS_IMPORTERS = [
  "contexts/bc_arsenal/repositories",
  "contexts/bc_board/repositories",
```

- [ ] **Step 2: Uruchom test, zobacz porażkę**

Run: `npx vitest run tests/unit/architecture.static.test.ts`
Expected: FAIL w „warstwa plikowa” (lista importerów nie zawiera `contexts/bc_arsenal/repositories`, bo pliku jeszcze nie ma). To oczekiwane; naprawia to Task 2.

- [ ] **Step 3: Commit (sam test)**

```bash
git add tests/unit/architecture.static.test.ts
git commit -m "test(architektura): bc_arsenal/repositories w VAULT_FS_IMPORTERS"
```

---

## Task 2: `models.ts` i `repositories.ts` (odczyt)

**Files:**

- Create: `contexts/bc_arsenal/models.ts`, `contexts/bc_arsenal/repositories.ts`
- Test: `tests/unit/contexts/bc_arsenal/repositories.test.ts`

- [ ] **Step 1: Napisz `models.ts`**

```ts
import type { Frontmatter } from "@/lib/nexus/frontmatter";

/** Skille jako dokumenty: `Vault/Arsenal/Skills/<slug>/skill.md` (+ opcjonalny `templates/`). */
export const SKILLS_DIR = "Arsenal/Skills";
/** Prompty zostają w Bazie wiedzy (czytane bez przenoszenia). */
export const PROMPTS_DIR = "Knowledge/prompty";
/** Maksymalna długość `summary` na liście. */
export const SUMMARY_MAX = 90;
/** Ten sam tekst co `OWNER_WORK_WARNING` w paczce kontekstu (`bc_projects`). */
export const WORK_TARGET_NOTE = "Dane z firmy: sprawdź, gdzie wklejasz";

export type DeployMode = "full" | "adapted";
export type Owner = "personal" | "work";

export type Deployment = { project: string; mode: DeployMode; date: string };
export type TemplateFile = { name: string; text: string };

type EntryBase = { id: string; path: string; name: string; summary: string; body: string };

export type SkillEntry = EntryBase & {
  kind: "skill";
  slug: string;
  origin?: string;
  deployed: Deployment[];
  templates: TemplateFile[];
};

export type PromptEntry = EntryBase & {
  kind: "prompt";
  model?: string;
  /** `id` projektów z rejestru, jak w frontmatterze promptu. */
  projects: string[];
};

export type ArsenalEntry = SkillEntry | PromptEntry;

export type DeployTarget = { id: string; name: string; localPath: string; owner: Owner };

export type ArsenalCatalog = {
  entries: ArsenalEntry[];
  targets: DeployTarget[];
  /** Pominięte pliki skilli oraz wpisy `deployed` odrzucone przy odczycie. */
  skipped: number;
};

export type DeployInstructions = { mode: DeployMode; text: string; note?: string };

/** Plik po odczycie; `parsed` = `null`, gdy brak poprawnego frontmattera. */
export type RawFile = {
  path: string;
  /** Nazwa folderu skilla albo nazwa pliku promptu bez `.md`. */
  key: string;
  parsed: { meta: Frontmatter; body: string } | null;
};
```

- [ ] **Step 2: Napisz test `repositories.test.ts` (odczyt)**

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readPromptFiles, readSkillFiles, readTemplates } from "@/contexts/bc_arsenal/repositories";
import { useTempVault } from "../../helpers/tempVault";

const vault = useTempVault();

describe("readSkillFiles", () => {
  it("zwraca tylko Arsenal/Skills/<slug>/skill.md, klucz = nazwa folderu", () => {
    vault.write("Arsenal/Skills/a/skill.md", "---\nname: A\n---\ntreść");
    vault.write("Arsenal/Skills/a/templates/t.md", "---\nname: T\n---\n");
    vault.write("Arsenal/Skills/b/readme.md", "x");
    vault.write("Arsenal/Skills/c/skill.md", "bez frontmattera");
    const files = readSkillFiles();
    expect(files.map((f) => [f.path, f.key, f.parsed === null])).toEqual([
      ["Arsenal/Skills/a/skill.md", "a", false],
      ["Arsenal/Skills/c/skill.md", "c", true],
    ]);
    expect(files[0].parsed?.meta).toEqual({ name: "A" });
    expect(files[0].parsed?.body).toBe("treść");
  });

  it("brak katalogu daje pustą listę", () => {
    expect(readSkillFiles()).toEqual([]);
  });
});

describe("readPromptFiles", () => {
  it("zwraca tylko pliki .md bezpośrednio w Knowledge/prompty", () => {
    vault.write("Knowledge/prompty/Rada.md", "---\ntype: prompt\n---\ntreść");
    vault.write("Knowledge/prompty/NEXUS.code-workspace", "{}");
    vault.write("Knowledge/prompty/sub/x.md", "x");
    expect(readPromptFiles().map((f) => f.key)).toEqual(["Rada"]);
  });
});

describe("readTemplates", () => {
  it("zwraca pliki z templates/ posortowane, bez podkatalogów", () => {
    vault.write("Arsenal/Skills/a/templates/b.md", "B");
    vault.write("Arsenal/Skills/a/templates/a.md", "A");
    vault.write("Arsenal/Skills/a/templates/nested/c.md", "C");
    expect(readTemplates("a")).toEqual([
      { name: "a.md", text: "A" },
      { name: "b.md", text: "B" },
    ]);
  });

  it("brak katalogu daje pustą listę", () => {
    expect(readTemplates("nie-ma")).toEqual([]);
  });
});
```

- [ ] **Step 3: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/repositories.test.ts`
Expected: FAIL („Cannot find module '@/contexts/bc_arsenal/repositories'”).

- [ ] **Step 4: Napisz `repositories.ts` (odczyt)**

```ts
import { DomainError } from "@/lib/errors";
import { parseFrontmatter } from "@/lib/nexus/frontmatter";
import { listVaultFiles, listVaultFilesRecursive, readVaultFile } from "@/lib/nexus/vault-fs";
import { PROMPTS_DIR, SKILLS_DIR, type RawFile, type TemplateFile } from "./models";

const SKILL_FILE = /^Arsenal\/Skills\/([^/]+)\/skill\.md$/;

/** `null`, gdy pliku nie ma; nieczytelny plik (np. zły UTF-8) to `parsed: null`; błędy domenowe lecą wyżej. */
function readRaw(path: string, key: string): RawFile | null {
  let text: string;
  try {
    const file = readVaultFile(path);
    if (file === null) return null;
    text = file.text;
  } catch (err) {
    if (err instanceof DomainError) throw err;
    return { path, key, parsed: null };
  }
  return { path, key, parsed: parseFrontmatter(text) };
}

const present = (file: RawFile | null): file is RawFile => file !== null;

/** `Arsenal/Skills/<slug>/skill.md` (posortowane po ścieżce). */
export function readSkillFiles(): RawFile[] {
  return listVaultFilesRecursive(SKILLS_DIR)
    .flatMap((path) => {
      const slug = SKILL_FILE.exec(path)?.[1];
      return slug === undefined ? [] : [readRaw(path, slug)];
    })
    .filter(present);
}

/** Pliki `.md` bezpośrednio w `Knowledge/prompty/` (podkatalogi pomijane). */
export function readPromptFiles(): RawFile[] {
  return listVaultFiles(PROMPTS_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => readRaw(`${PROMPTS_DIR}/${name}`, name.replace(/\.md$/, "")))
    .filter(present);
}

/** Pliki bezpośrednio w `templates/` skilla; nieczytelny plik jest pomijany. */
export function readTemplates(slug: string): TemplateFile[] {
  const dir = `${SKILLS_DIR}/${slug}/templates`;
  const out: TemplateFile[] = [];
  for (const name of listVaultFiles(dir)) {
    try {
      const file = readVaultFile(`${dir}/${name}`);
      if (file !== null) out.push({ name, text: file.text });
    } catch (err) {
      if (err instanceof DomainError) throw err;
    }
  }
  return out;
}
```

- [ ] **Step 5: Uruchom testy**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/repositories.test.ts tests/unit/architecture.static.test.ts`
Expected: PASS (test architektury wraca na zielono, bo plik już istnieje i importuje `vault-fs`).

- [ ] **Step 6: Commit**

```bash
git add contexts/bc_arsenal/models.ts contexts/bc_arsenal/repositories.ts tests/unit/contexts/bc_arsenal/repositories.test.ts
git commit -m "feat(arsenal): bc_arsenal, odczyt skilli, promptów i szablonów z Vaulta"
```

---

## Task 3: `services.ts`: katalog (parsowanie, `summary`, `deployed`)

**Files:**

- Create: `contexts/bc_arsenal/services.ts`
- Test: `tests/unit/contexts/bc_arsenal/services.list.test.ts`

- [ ] **Step 1: Napisz test**

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTempVault } from "../../helpers/tempVault";

const mockListProjects = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/bc_projects/services", () => ({ listProjects: mockListProjects }));

import * as services from "@/contexts/bc_arsenal/services";

const vault = useTempVault();

beforeEach(() => {
  mockListProjects.mockReset();
  mockListProjects.mockReturnValue({
    projects: [
      { id: "p", name: "Projekt P", localPath: "~/p", owner: "personal" },
      { id: "w", name: "Projekt W", localPath: "~/w", owner: "work" },
    ],
    warnings: [],
  });
});

const skillDoc = (slug: string, extra = "") =>
  `---\nname: ${slug}\nslug: ${slug}\ntype: skill-doc\nsummary: Zasady ${slug}\n${extra}---\nTreść ${slug}\n`;

describe("truncate / firstSentence / firstBodyLine", () => {
  it("truncate zostawia do 90 znaków, dłuższe kończy wielokropkiem", () => {
    expect(services.truncate("krótki")).toBe("krótki");
    const cut = services.truncate("a".repeat(120));
    expect(cut).toHaveLength(90);
    expect(cut.endsWith("…")).toBe(true);
  });

  it("firstSentence bierze pierwsze zdanie albo całość", () => {
    expect(services.firstSentence("Pierwsze zdanie. Drugie zdanie.")).toBe("Pierwsze zdanie.");
    expect(services.firstSentence("Bez kropki")).toBe("Bez kropki");
  });

  it("firstBodyLine pomija puste linie, znaczniki nagłówków i separatory", () => {
    expect(services.firstBodyLine("\n\n---\n# Tytuł promptu\nreszta")).toBe("Tytuł promptu");
    expect(services.firstBodyLine("   \n")).toBe("");
  });
});

describe("parseDeployments", () => {
  it("akceptuje poprawne wpisy, liczy odrzucone", () => {
    const { valid, dropped } = services.parseDeployments([
      { project: "p", mode: "full", date: "2026-11-14" },
      { project: "p", mode: "zły", date: "2026-11-14" },
      "śmieć",
      { project: "", mode: "full", date: "2026-11-14" },
    ]);
    expect(valid).toEqual([{ project: "p", mode: "full", date: "2026-11-14" }]);
    expect(dropped).toBe(3);
  });

  it("brak pola to zero, nie-tablica to jedno odrzucenie", () => {
    expect(services.parseDeployments(undefined)).toEqual({ valid: [], dropped: 0 });
    expect(services.parseDeployments("x")).toEqual({ valid: [], dropped: 1 });
  });
});

describe("listArsenal: skille", () => {
  it("parsuje pola; deployed ograniczone do projektów z rejestru; skipped liczy odrzucone", () => {
    vault.write(
      "Arsenal/Skills/tdd/skill.md",
      skillDoc(
        "tdd",
        "origin: global\ndeployed:\n  - project: p\n    mode: full\n    date: 2026-11-14\n  - project: zniknal\n    mode: full\n    date: 2026-11-14\n"
      )
    );
    const { entries, skipped } = services.listArsenal();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: "skill",
      id: "skill:tdd",
      path: "Arsenal/Skills/tdd/skill.md",
      name: "tdd",
      slug: "tdd",
      summary: "Zasady tdd",
      origin: "global",
      body: "Treść tdd\n",
      deployed: [{ project: "p", mode: "full", date: "2026-11-14" }],
    });
    expect(skipped).toBe(1);
  });

  it("summary zastępcze: pierwsze zdanie description, ucięte do 90 znaków", () => {
    vault.write(
      "Arsenal/Skills/a/skill.md",
      "---\nname: a\nslug: a\ntype: skill-doc\ndescription: Pierwsze zdanie. Drugie zdanie.\n---\nx"
    );
    vault.write(
      "Arsenal/Skills/b/skill.md",
      `---\nname: b\nslug: b\ntype: skill-doc\ndescription: ${"a".repeat(120)}\n---\nx`
    );
    const [a, b] = services.listArsenal().entries;
    expect(a.summary).toBe("Pierwsze zdanie.");
    expect(b.summary).toHaveLength(90);
  });

  it("pomija pliki bez type skill-doc, z innym slugiem niż folder, bez frontmattera i bez name", () => {
    vault.write("Arsenal/Skills/ok/skill.md", skillDoc("ok"));
    vault.write("Arsenal/Skills/bad1/skill.md", "---\nname: bad1\nslug: bad1\ntype: inne\n---\nx");
    vault.write(
      "Arsenal/Skills/bad2/skill.md",
      "---\nname: bad2\nslug: inny\ntype: skill-doc\n---\nx"
    );
    vault.write("Arsenal/Skills/bad3/skill.md", "bez frontmattera");
    vault.write("Arsenal/Skills/bad4/skill.md", "---\nslug: bad4\ntype: skill-doc\n---\nx");
    const { entries, skipped } = services.listArsenal();
    expect(entries.map((e) => e.id)).toEqual(["skill:ok"]);
    expect(skipped).toBe(4);
  });

  it("dołącza szablony", () => {
    vault.write("Arsenal/Skills/a/skill.md", skillDoc("a"));
    vault.write("Arsenal/Skills/a/templates/t.md", "szablon");
    const [entry] = services.listArsenal().entries;
    expect(entry).toMatchObject({ templates: [{ name: "t.md", text: "szablon" }] });
  });
});

describe("listArsenal: prompty", () => {
  it("czyta prompty z Knowledge/prompty; summary z pierwszej linii; puste model pomijane", () => {
    vault.write(
      "Knowledge/prompty/Rada.md",
      "---\nname: Rada Ekspertów\nslug: rada\ntype: prompt\nmodel: ''\nprojects: [p]\n---\n\n\nRada ekspertów\nreszta"
    );
    vault.write("Knowledge/prompty/_index.md", "---\nname: Prompty\ntype: collection\n---\n# x");
    const { entries } = services.listArsenal();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: "prompt",
      id: "prompt:Rada",
      name: "Rada Ekspertów",
      summary: "Rada ekspertów",
      projects: ["p"],
    });
    expect(entries[0]).not.toHaveProperty("model");
  });

  it("nazwa zastępcza to nazwa pliku", () => {
    vault.write("Knowledge/prompty/Bez_nazwy.md", "---\ntype: prompt\n---\ntreść");
    expect(services.listArsenal().entries[0].name).toBe("Bez_nazwy");
  });
});

describe("listArsenal: cele i kolejność", () => {
  it("targets to wszystkie projekty z rejestru, także z owner: work", () => {
    expect(services.listArsenal().targets).toEqual([
      { id: "p", name: "Projekt P", localPath: "~/p", owner: "personal" },
      { id: "w", name: "Projekt W", localPath: "~/w", owner: "work" },
    ]);
  });

  it("skille przed promptami, w obrębie rodzaju po nazwie", () => {
    vault.write("Arsenal/Skills/b/skill.md", skillDoc("b"));
    vault.write("Arsenal/Skills/a/skill.md", skillDoc("a"));
    vault.write("Knowledge/prompty/A.md", "---\ntype: prompt\n---\nx");
    expect(services.listArsenal().entries.map((e) => e.id)).toEqual([
      "skill:a",
      "skill:b",
      "prompt:A",
    ]);
  });
});
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/services.list.test.ts`
Expected: FAIL („Cannot find module '@/contexts/bc_arsenal/services'”).

- [ ] **Step 3: Napisz `services.ts` (część katalogowa)**

````ts
import { listProjects } from "@/contexts/bc_projects/services";
import {
  SUMMARY_MAX,
  type ArsenalCatalog,
  type DeployMode,
  type DeployTarget,
  type Deployment,
  type PromptEntry,
  type RawFile,
  type SkillEntry,
} from "./models";
import { readPromptFiles, readSkillFiles, readTemplates } from "./repositories";

const cmp = (a: string, b: string): number => a.localeCompare(b, "pl");

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .map((v) => v.trim())
    : [];

/** Jedna linia do `max` znaków; dłuższe kończy się „…”. */
export function truncate(text: string, max: number = SUMMARY_MAX): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

export function firstSentence(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const match = /^(.+?[.!?])(?:\s|$)/.exec(flat);
  return match ? match[1] : flat;
}

/** Pierwsza niepusta linia treści bez znaczników nagłówka, cytatu i listy; separatory `---` są pomijane. */
export function firstBodyLine(body: string): string {
  for (const line of body.split("\n")) {
    const text = line.replace(/^[#>\-*\s]+/, "").trim();
    if (text !== "" && !text.startsWith("```")) return text;
  }
  return "";
}

function dateText(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return undefined;
}

/** Wpisy `deployed` o poprawnym kształcie oraz liczba odrzuconych. */
export function parseDeployments(raw: unknown): { valid: Deployment[]; dropped: number } {
  if (raw === undefined || raw === null) return { valid: [], dropped: 0 };
  if (!Array.isArray(raw)) return { valid: [], dropped: 1 };
  const valid: Deployment[] = [];
  let dropped = 0;
  for (const item of raw) {
    const o = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const project = str(o.project);
    const date = dateText(o.date);
    if (
      project !== undefined &&
      date !== undefined &&
      (o.mode === "full" || o.mode === "adapted")
    ) {
      valid.push({ project, mode: o.mode as DeployMode, date });
    } else {
      dropped += 1;
    }
  }
  return { valid, dropped };
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseSkill(
  file: RawFile,
  known: ReadonlySet<string>
): { entry: SkillEntry | null; skipped: number } {
  const { parsed, key } = file;
  if (parsed === null) return { entry: null, skipped: 1 };
  const { meta, body } = parsed;
  const name = str(meta.name);
  if (
    meta.type !== "skill-doc" ||
    name === undefined ||
    str(meta.slug) !== key ||
    !SLUG_RE.test(key)
  ) {
    return { entry: null, skipped: 1 };
  }
  const { valid, dropped } = parseDeployments(meta.deployed);
  const deployed = valid.filter((d) => known.has(d.project));
  const origin = str(meta.origin);
  const summary = str(meta.summary) ?? firstSentence(str(meta.description) ?? "");
  return {
    entry: {
      kind: "skill",
      id: `skill:${key}`,
      path: file.path,
      name,
      slug: key,
      summary: truncate(summary),
      ...(origin !== undefined && { origin }),
      body,
      deployed,
      templates: readTemplates(key),
    },
    skipped: dropped + (valid.length - deployed.length),
  };
}

function parsePrompt(file: RawFile): PromptEntry | null {
  const { parsed, key } = file;
  if (parsed === null || parsed.meta.type !== "prompt") return null;
  const { meta, body } = parsed;
  const model = str(meta.model);
  return {
    kind: "prompt",
    id: `prompt:${key}`,
    path: file.path,
    name: str(meta.name) ?? key,
    summary: truncate(str(meta.summary) ?? firstBodyLine(body)),
    body,
    ...(model !== undefined && { model }),
    projects: stringList(meta.projects),
  };
}

/** Katalog skilli i promptów oraz projekty docelowe (wszystkie z rejestru, także `owner: work`). */
export function listArsenal(): ArsenalCatalog {
  const { projects } = listProjects();
  const targets: DeployTarget[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    localPath: p.localPath,
    owner: p.owner,
  }));
  const known = new Set(targets.map((t) => t.id));

  let skipped = 0;
  const skills: SkillEntry[] = [];
  for (const file of readSkillFiles()) {
    const result = parseSkill(file, known);
    skipped += result.skipped;
    if (result.entry !== null) skills.push(result.entry);
  }
  const prompts = readPromptFiles()
    .map(parsePrompt)
    .filter((p): p is PromptEntry => p !== null);

  skills.sort((a, b) => cmp(a.name, b.name));
  prompts.sort((a, b) => cmp(a.name, b.name));
  return { entries: [...skills, ...prompts], targets, skipped };
}
````

- [ ] **Step 4: Uruchom test**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/services.list.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add contexts/bc_arsenal/services.ts tests/unit/contexts/bc_arsenal/services.list.test.ts
git commit -m "feat(arsenal): katalog skilli i promptów (summary zastępcze, deployed względem rejestru)"
```

---

## Task 4: `services.ts`: generowanie polecenia i promptu wdrożenia

**Files:**

- Modify: `contexts/bc_arsenal/services.ts` (dopisz na końcu pliku, importy uzupełnij)
- Test: `tests/unit/contexts/bc_arsenal/services.deploy.test.ts`

- [ ] **Step 1: Napisz test**

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTempVault } from "../../helpers/tempVault";

const mockListProjects = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/bc_projects/services", () => ({ listProjects: mockListProjects }));

import { WORK_TARGET_NOTE, type SkillEntry } from "@/contexts/bc_arsenal/models";
import * as services from "@/contexts/bc_arsenal/services";

const vault = useTempVault();

beforeEach(() => {
  mockListProjects.mockReset();
  mockListProjects.mockReturnValue({
    projects: [
      { id: "p", name: "Projekt P", localPath: "~/p", owner: "personal" },
      { id: "w", name: "Projekt W", localPath: "~/w", owner: "work" },
      { id: "e", name: "Pusty", localPath: "", owner: "personal" },
    ],
    warnings: [],
  });
  vault.write(
    "Arsenal/Skills/tdd/skill.md",
    "---\nname: tdd\nslug: tdd\ntype: skill-doc\nsummary: s\n---\nTreść skilla\n"
  );
  vault.write("Arsenal/Skills/tdd/templates/t.md", "treść szablonu");
});

const statusOf = (fn: () => unknown): number | undefined => {
  try {
    fn();
  } catch (err) {
    return (err as { statusCode?: number }).statusCode;
  }
  return undefined;
};

describe("buildDeployCommand", () => {
  it("składa polecenie z cytowaną ścieżką", () => {
    expect(services.buildDeployCommand("tdd", "~/projects/x")).toBe(
      "scripts/deploy-skill.sh tdd '~/projects/x'"
    );
  });

  it("ucieka apostrof w ścieżce", () => {
    expect(services.buildDeployCommand("tdd", "a'b")).toBe(`scripts/deploy-skill.sh tdd 'a'\\''b'`);
  });
});

describe("buildAdaptPrompt", () => {
  it("zawiera projekt, ścieżki CLAUDE.md i SKILL.md, treść skilla i szablony", () => {
    const skill = {
      kind: "skill",
      id: "skill:tdd",
      path: "Arsenal/Skills/tdd/skill.md",
      name: "tdd",
      slug: "tdd",
      summary: "s",
      body: "Treść skilla\n",
      deployed: [],
      templates: [{ name: "t.md", text: "treść szablonu" }],
    } satisfies SkillEntry;
    const text = services.buildAdaptPrompt(skill, {
      id: "p",
      name: "Projekt P",
      localPath: "~/p",
      owner: "personal",
    });
    expect(text).toContain("Projekt P");
    expect(text).toContain("~/p/CLAUDE.md");
    expect(text).toContain("~/p/.claude/skills/tdd/SKILL.md");
    expect(text).toContain("Treść skilla");
    expect(text).toContain("SZABLON: t.md");
    expect(text).toContain("treść szablonu");
  });
});

describe("getDeployInstructions", () => {
  it("tryb full: polecenie skryptu, bez noty dla projektu osobistego", () => {
    const result = services.getDeployInstructions("tdd", "p", "full");
    expect(result).toEqual({ mode: "full", text: "scripts/deploy-skill.sh tdd '~/p'" });
  });

  it("tryb adapted: prompt; projekt z etatu dostaje notę", () => {
    const result = services.getDeployInstructions("tdd", "w", "adapted");
    expect(result.mode).toBe("adapted");
    expect(result.text).toContain("Projekt W");
    expect(result.note).toBe(WORK_TARGET_NOTE);
  });

  it("błędy: zły slug 400, brak skilla 404, brak projektu 404, brak local_path 409", () => {
    expect(statusOf(() => services.getDeployInstructions("../x", "p", "full"))).toBe(400);
    expect(statusOf(() => services.getDeployInstructions("nie-ma", "p", "full"))).toBe(404);
    expect(statusOf(() => services.getDeployInstructions("tdd", "nie-ma", "full"))).toBe(404);
    expect(statusOf(() => services.getDeployInstructions("tdd", "e", "full"))).toBe(409);
  });
});
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/services.deploy.test.ts`
Expected: FAIL (`services.buildDeployCommand is not a function`).

- [ ] **Step 3: Rozszerz importy w `services.ts`**

Zastąp blok importów z `./models` i dodaj `DomainError`:

```ts
import { listProjects } from "@/contexts/bc_projects/services";
import { DomainError } from "@/lib/errors";
import {
  SUMMARY_MAX,
  WORK_TARGET_NOTE,
  type ArsenalCatalog,
  type DeployInstructions,
  type DeployMode,
  type DeployTarget,
  type Deployment,
  type PromptEntry,
  type RawFile,
  type SkillEntry,
} from "./models";
```

- [ ] **Step 4: Dopisz na końcu `services.ts`**

```ts
function assertSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) throw new DomainError("Nieprawidłowy slug skilla", 400);
}

function findSkill(catalog: ArsenalCatalog, slug: string): SkillEntry {
  assertSlug(slug);
  const skill = catalog.entries.find((e): e is SkillEntry => e.kind === "skill" && e.slug === slug);
  if (skill === undefined) throw new DomainError("Nie znaleziono skilla", 404);
  return skill;
}

function findTarget(catalog: ArsenalCatalog, projectId: string): DeployTarget {
  const target = catalog.targets.find((t) => t.id === projectId);
  if (target === undefined) throw new DomainError("Nie znaleziono projektu", 404);
  return target;
}

const shQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

/** Polecenie dla użytkownika (uruchamiane z katalogu Monolith); aplikacja niczego nie wykonuje. */
export function buildDeployCommand(slug: string, localPath: string): string {
  return `scripts/deploy-skill.sh ${slug} ${shQuote(localPath)}`;
}

/** Prompt dla agenta: dostosuj skill do projektu i zapisz w jego repozytorium. */
export function buildAdaptPrompt(skill: SkillEntry, target: DeployTarget): string {
  const dest = `${target.localPath}/.claude/skills/${skill.slug}`;
  const lines = [
    `Dostosuj skill „${skill.name}” do projektu „${target.name}” (${target.localPath}) i zapisz go w repozytorium projektu.`,
    "",
    "Kroki:",
    `1. Przeczytaj ${target.localPath}/CLAUDE.md oraz plik opisujący stos projektu (package.json, pyproject.toml lub odpowiednik).`,
    "2. Przepisz skill poniżej tak, by pasował do konwencji, komend i struktury katalogów tego projektu. Nie zmieniaj jego celu.",
    `3. Zapisz wynik jako ${dest}/SKILL.md (frontmatter: name, description).`,
  ];
  if (skill.templates.length > 0) {
    lines.push(`4. Szablony poniżej zapisz obok SKILL.md w ${dest}/ (dostosuj je tak samo).`);
  }
  lines.push(
    "",
    `Nie zmieniaj niczego poza ${dest}/ i niczego nie uruchamiaj.`,
    "",
    "--- SKILL ---",
    skill.body.trimEnd(),
    "--- KONIEC SKILLA ---"
  );
  for (const template of skill.templates) {
    lines.push(
      "",
      `--- SZABLON: ${template.name} ---`,
      template.text.trimEnd(),
      "--- KONIEC SZABLONU ---"
    );
  }
  return lines.join("\n");
}

export function getDeployInstructions(
  slug: string,
  projectId: string,
  mode: DeployMode
): DeployInstructions {
  const catalog = listArsenal();
  const skill = findSkill(catalog, slug);
  const target = findTarget(catalog, projectId);
  if (target.localPath.trim() === "") {
    throw new DomainError("Projekt nie ma local_path w rejestrze", 409);
  }
  const text =
    mode === "full"
      ? buildDeployCommand(skill.slug, target.localPath)
      : buildAdaptPrompt(skill, target);
  return { mode, text, ...(target.owner === "work" && { note: WORK_TARGET_NOTE }) };
}
```

Uwaga: `markDeployed` (Task 5) używa `findSkill` i `findTarget`; zostają w pliku.

- [ ] **Step 5: Uruchom testy**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/`
Expected: PASS (wszystkie testy `bc_arsenal`).

- [ ] **Step 6: Commit**

```bash
git add contexts/bc_arsenal/services.ts tests/unit/contexts/bc_arsenal/services.deploy.test.ts
git commit -m "feat(arsenal): polecenie i prompt wdrożenia skilla do projektu"
```

---

## Task 5: zapis `deployed` (`writeDeployed` + `markDeployed`)

**Files:**

- Modify: `contexts/bc_arsenal/repositories.ts`, `contexts/bc_arsenal/services.ts`
- Test: `tests/unit/contexts/bc_arsenal/repositories.test.ts` (dopisz), `tests/unit/contexts/bc_arsenal/services.deployed.test.ts` (nowy)

- [ ] **Step 1: Dopisz test repozytorium (na końcu `repositories.test.ts`)**

Dodaj `writeDeployed` do importu z `@/contexts/bc_arsenal/repositories` oraz `import { parseFrontmatter } from "@/lib/nexus/frontmatter";` na górze, potem:

```ts
describe("writeDeployed", () => {
  const PATH = "Arsenal/Skills/a/skill.md";

  it("podmienia deployed, zostawia pozostałe klucze i treść", async () => {
    vault.write(PATH, "---\nname: A\nslug: a\ncustom: zostaje\n---\n\nTreść\n");
    await writeDeployed(PATH, () => [{ project: "p", mode: "full", date: "2026-11-14" }]);
    const parsed = parseFrontmatter(vault.read(PATH) ?? "");
    expect(parsed?.meta).toMatchObject({
      name: "A",
      slug: "a",
      custom: "zostaje",
      deployed: [{ project: "p", mode: "full", date: "2026-11-14" }],
    });
    expect(parsed?.body.trim()).toBe("Treść");
  });

  it("przekazuje funkcji bieżącą wartość deployed", async () => {
    vault.write(PATH, "---\nname: A\ndeployed:\n  - project: x\n---\nT\n");
    let seen: unknown;
    await writeDeployed(PATH, (current) => {
      seen = current;
      return [];
    });
    expect(seen).toEqual([{ project: "x" }]);
  });

  it("plik bez frontmattera: 409 i plik nietknięty", async () => {
    vault.write(PATH, "bez frontmattera");
    await expect(writeDeployed(PATH, () => [])).rejects.toMatchObject({ statusCode: 409 });
    expect(vault.read(PATH)).toBe("bez frontmattera");
  });
});
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/repositories.test.ts`
Expected: FAIL (`writeDeployed is not a function`).

- [ ] **Step 3: Dopisz `writeDeployed` w `repositories.ts`**

Importy uzupełnij: `import { formatFrontmatter, parseFrontmatter } from "@/lib/nexus/frontmatter";`, `updateVaultFile` w imporcie z `vault-fs`, typ `Deployment` z `./models`. Na końcu pliku:

```ts
/**
 * Jedyny zapis kontekstu: podmienia klucz `deployed` we frontmatterze `skill.md`, reszta kluczy i treść
 * zostają. Plik bez poprawnego frontmattera to 409 (nigdy go nie nadpisujemy).
 */
export async function writeDeployed(
  path: string,
  change: (current: unknown) => Deployment[]
): Promise<void> {
  await updateVaultFile(path, (current) => {
    const parsed = current === null ? null : parseFrontmatter(current);
    if (parsed === null) throw new DomainError("Dokument skilla jest uszkodzony", 409);
    return formatFrontmatter(
      { ...parsed.meta, deployed: change(parsed.meta.deployed) },
      parsed.body
    );
  });
}
```

- [ ] **Step 4: Napisz test `services.deployed.test.ts`**

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseFrontmatter } from "@/lib/nexus/frontmatter";
import { useTempVault } from "../../helpers/tempVault";

const mockListProjects = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/bc_projects/services", () => ({ listProjects: mockListProjects }));

import * as services from "@/contexts/bc_arsenal/services";

const vault = useTempVault();
const PATH = "Arsenal/Skills/tdd/skill.md";
const TODAY = new Date(2026, 10, 14);

beforeEach(() => {
  mockListProjects.mockReset();
  mockListProjects.mockReturnValue({
    projects: [
      { id: "p", name: "Projekt P", localPath: "~/p", owner: "personal" },
      { id: "q", name: "Projekt Q", localPath: "~/q", owner: "personal" },
    ],
    warnings: [],
  });
  vault.write(PATH, "---\nname: tdd\nslug: tdd\ntype: skill-doc\nsummary: s\n---\nTreść\n");
});

const meta = () => parseFrontmatter(vault.read(PATH) ?? "")?.meta;

describe("markDeployed", () => {
  it("dopisuje wpis z dzisiejszą datą i zwraca zaktualizowany skill", async () => {
    const skill = await services.markDeployed("tdd", "p", "full", TODAY);
    expect(meta()?.deployed).toEqual([{ project: "p", mode: "full", date: "2026-11-14" }]);
    expect(skill.deployed).toEqual([{ project: "p", mode: "full", date: "2026-11-14" }]);
    expect(meta()).toMatchObject({ name: "tdd", slug: "tdd", type: "skill-doc" });
  });

  it("ponowne oznaczenie tego samego projektu zastępuje wpis", async () => {
    await services.markDeployed("tdd", "p", "full", TODAY);
    await services.markDeployed("tdd", "p", "adapted", new Date(2026, 10, 15));
    expect(meta()?.deployed).toEqual([{ project: "p", mode: "adapted", date: "2026-11-15" }]);
  });

  it("zachowuje wpisy innych projektów, także spoza rejestru (ukryte w UI)", async () => {
    vault.write(
      PATH,
      "---\nname: tdd\nslug: tdd\ntype: skill-doc\ndeployed:\n  - project: zniknal\n    mode: full\n    date: 2026-11-01\n---\nTreść\n"
    );
    const skill = await services.markDeployed("tdd", "q", "full", TODAY);
    expect(meta()?.deployed).toEqual([
      { project: "zniknal", mode: "full", date: "2026-11-01" },
      { project: "q", mode: "full", date: "2026-11-14" },
    ]);
    expect(skill.deployed.map((d) => d.project)).toEqual(["q"]);
  });

  it("błędy: zły slug 400, brak skilla 404, brak projektu 404", async () => {
    await expect(services.markDeployed("../x", "p", "full", TODAY)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(services.markDeployed("nie-ma", "p", "full", TODAY)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(services.markDeployed("tdd", "nie-ma", "full", TODAY)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
```

- [ ] **Step 5: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/services.deployed.test.ts`
Expected: FAIL (`services.markDeployed is not a function`).

- [ ] **Step 6: Dopisz `markDeployed` w `services.ts`**

Dodaj `writeDeployed` do importu z `./repositories`. Na końcu pliku:

```ts
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Jedyny zapis zakładki: wpis `deployed` (jeden na projekt, nowszy zastępuje). Wpisy innych projektów
 * (także spoza rejestru) zostają w pliku; uszkodzone kształtem są usuwane przy zapisie.
 */
export async function markDeployed(
  slug: string,
  projectId: string,
  mode: DeployMode,
  today: Date = new Date()
): Promise<SkillEntry> {
  const catalog = listArsenal();
  const skill = findSkill(catalog, slug);
  findTarget(catalog, projectId);
  const entry: Deployment = { project: projectId, mode, date: ymd(today) };
  await writeDeployed(skill.path, (current) => [
    ...parseDeployments(current).valid.filter((d) => d.project !== projectId),
    entry,
  ]);
  return findSkill(listArsenal(), slug);
}
```

- [ ] **Step 7: Uruchom testy `bc_arsenal`**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add contexts/bc_arsenal tests/unit/contexts/bc_arsenal
git commit -m "feat(arsenal): oznaczanie wdrożenia skilla (zapis deployed we frontmatterze)"
```

---

## Task 6: `schemas.ts`, `router.ts` i trasy API

**Files:**

- Create: `contexts/bc_arsenal/schemas.ts`, `contexts/bc_arsenal/router.ts`, `app/api/arsenal/route.ts`, `app/api/arsenal/skills/[slug]/deploy/route.ts`, `app/api/arsenal/skills/[slug]/deployed/route.ts`
- Test: `tests/unit/contexts/bc_arsenal/schemas.test.ts`, `tests/unit/contexts/bc_arsenal/router.test.ts`

- [ ] **Step 1: Napisz `schemas.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import type { ArsenalCatalog } from "@/contexts/bc_arsenal/models";
import {
  CatalogDtoSchema,
  DeployQuerySchema,
  toCatalogDto,
  toEntryDto,
} from "@/contexts/bc_arsenal/schemas";

const catalog: ArsenalCatalog = {
  entries: [
    {
      kind: "skill",
      id: "skill:tdd",
      path: "Arsenal/Skills/tdd/skill.md",
      name: "tdd",
      slug: "tdd",
      summary: "s",
      body: "b",
      deployed: [{ project: "p", mode: "full", date: "2026-11-14" }],
      templates: [{ name: "t.md", text: "x" }],
    },
    {
      kind: "prompt",
      id: "prompt:R",
      path: "Knowledge/prompty/R.md",
      name: "R",
      summary: "r",
      body: "b",
      projects: ["p"],
    },
  ],
  targets: [{ id: "p", name: "P", localPath: "~/p", owner: "personal" }],
  skipped: 2,
};

describe("DeployQuerySchema", () => {
  it("przyjmuje project i mode", () => {
    expect(DeployQuerySchema.safeParse({ project: "p", mode: "full" }).success).toBe(true);
  });

  it("odrzuca nieznany tryb i pusty projekt", () => {
    expect(DeployQuerySchema.safeParse({ project: "p", mode: "x" }).success).toBe(false);
    expect(DeployQuerySchema.safeParse({ project: "", mode: "full" }).success).toBe(false);
    expect(DeployQuerySchema.safeParse({ project: null, mode: null }).success).toBe(false);
  });
});

describe("toCatalogDto", () => {
  it("daje DTO zgodne ze schematem", () => {
    const dto = toCatalogDto(catalog);
    expect(CatalogDtoSchema.parse(dto)).toEqual(dto);
    expect(dto.skipped).toBe(2);
    expect(dto.entries.map((e) => e.kind)).toEqual(["skill", "prompt"]);
  });

  it("nie przecieka referencjami modelu", () => {
    const dto = toEntryDto(catalog.entries[0]);
    expect(dto).not.toBe(catalog.entries[0]);
  });
});
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/schemas.test.ts`
Expected: FAIL (brak modułu `schemas`).

- [ ] **Step 3: Napisz `schemas.ts`**

```ts
import { z } from "zod";
import type { ArsenalCatalog, ArsenalEntry, DeployInstructions, DeployTarget } from "./models";

export const DeployModeSchema = z.enum(["full", "adapted"]);

/** Zapytanie `GET …/deploy?project=&mode=` i ciało `POST …/deployed`. */
export const DeployQuerySchema = z.object({
  project: z.string().min(1).max(100),
  mode: DeployModeSchema,
});
export const MarkDeployedBodySchema = DeployQuerySchema;

const DeploymentDtoSchema = z.object({
  project: z.string(),
  mode: DeployModeSchema,
  date: z.string(),
});
const TemplateDtoSchema = z.object({ name: z.string(), text: z.string() });

const entryBase = {
  id: z.string(),
  path: z.string(),
  name: z.string(),
  summary: z.string(),
  body: z.string(),
};

export const SkillEntryDtoSchema = z.object({
  kind: z.literal("skill"),
  ...entryBase,
  slug: z.string(),
  origin: z.string().optional(),
  deployed: z.array(DeploymentDtoSchema),
  templates: z.array(TemplateDtoSchema),
});

export const PromptEntryDtoSchema = z.object({
  kind: z.literal("prompt"),
  ...entryBase,
  model: z.string().optional(),
  projects: z.array(z.string()),
});

export const ArsenalEntryDtoSchema = z.discriminatedUnion("kind", [
  SkillEntryDtoSchema,
  PromptEntryDtoSchema,
]);

export const DeployTargetDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  localPath: z.string(),
  owner: z.enum(["personal", "work"]),
});

export const CatalogDtoSchema = z.object({
  entries: z.array(ArsenalEntryDtoSchema),
  targets: z.array(DeployTargetDtoSchema),
  skipped: z.number(),
});

export const DeployInstructionsDtoSchema = z.object({
  mode: DeployModeSchema,
  text: z.string(),
  note: z.string().optional(),
});

export type DeployModeDto = z.infer<typeof DeployModeSchema>;
export type SkillEntryDto = z.infer<typeof SkillEntryDtoSchema>;
export type PromptEntryDto = z.infer<typeof PromptEntryDtoSchema>;
export type ArsenalEntryDto = z.infer<typeof ArsenalEntryDtoSchema>;
export type DeployTargetDto = z.infer<typeof DeployTargetDtoSchema>;
export type CatalogDto = z.infer<typeof CatalogDtoSchema>;
export type DeployInstructionsDto = z.infer<typeof DeployInstructionsDtoSchema>;

export function toEntryDto(entry: ArsenalEntry): ArsenalEntryDto {
  const base = {
    id: entry.id,
    path: entry.path,
    name: entry.name,
    summary: entry.summary,
    body: entry.body,
  };
  if (entry.kind === "skill") {
    return {
      kind: "skill",
      ...base,
      slug: entry.slug,
      ...(entry.origin !== undefined && { origin: entry.origin }),
      deployed: entry.deployed.map((d) => ({ ...d })),
      templates: entry.templates.map((t) => ({ ...t })),
    };
  }
  return {
    kind: "prompt",
    ...base,
    ...(entry.model !== undefined && { model: entry.model }),
    projects: [...entry.projects],
  };
}

export function toTargetDto(target: DeployTarget): DeployTargetDto {
  return { ...target };
}

export function toCatalogDto(catalog: ArsenalCatalog): CatalogDto {
  return {
    entries: catalog.entries.map(toEntryDto),
    targets: catalog.targets.map(toTargetDto),
    skipped: catalog.skipped,
  };
}

export function toInstructionsDto(result: DeployInstructions): DeployInstructionsDto {
  return {
    mode: result.mode,
    text: result.text,
    ...(result.note !== undefined && { note: result.note }),
  };
}
```

- [ ] **Step 4: Uruchom test schematów**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Napisz `router.test.ts`**

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const mockListArsenal = vi.hoisted(() => vi.fn());
const mockGetInstructions = vi.hoisted(() => vi.fn());
const mockMarkDeployed = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/bc_arsenal/services", () => ({
  listArsenal: mockListArsenal,
  getDeployInstructions: mockGetInstructions,
  markDeployed: mockMarkDeployed,
}));

import { getCatalog, getDeployInstructions, postDeployed } from "@/contexts/bc_arsenal/router";

const ctx = { params: Promise.resolve({ slug: "tdd" }) };
const skill = {
  kind: "skill" as const,
  id: "skill:tdd",
  path: "Arsenal/Skills/tdd/skill.md",
  name: "tdd",
  slug: "tdd",
  summary: "s",
  body: "b",
  deployed: [],
  templates: [],
};

beforeEach(() => {
  mockListArsenal.mockReset();
  mockGetInstructions.mockReset();
  mockMarkDeployed.mockReset();
});

describe("getCatalog", () => {
  it("200 z DTO katalogu", async () => {
    mockListArsenal.mockReturnValue({ entries: [skill], targets: [], skipped: 0 });
    const res = await getCatalog();
    expect(res.status).toBe(200);
    expect((await res.json()).entries[0].slug).toBe("tdd");
  });

  it("błąd domenowy zachowuje status", async () => {
    mockListArsenal.mockImplementation(() => {
      throw new DomainError("źle", 409);
    });
    expect((await getCatalog()).status).toBe(409);
  });
});

describe("getDeployInstructions", () => {
  const req = (query: string) =>
    new Request(`http://localhost/api/arsenal/skills/tdd/deploy${query}`);

  it("400 bez trybu lub projektu", async () => {
    expect((await getDeployInstructions(req("?project=p"), ctx)).status).toBe(400);
    expect((await getDeployInstructions(req("?mode=full"), ctx)).status).toBe(400);
    expect((await getDeployInstructions(req("?project=p&mode=x"), ctx)).status).toBe(400);
  });

  it("200 i wywołanie serwisu z (slug, projekt, tryb)", async () => {
    mockGetInstructions.mockReturnValue({ mode: "full", text: "cmd" });
    const res = await getDeployInstructions(req("?project=p&mode=full"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mode: "full", text: "cmd" });
    expect(mockGetInstructions).toHaveBeenCalledWith("tdd", "p", "full");
  });

  it("błąd domenowy zachowuje status", async () => {
    mockGetInstructions.mockImplementation(() => {
      throw new DomainError("brak", 404);
    });
    expect((await getDeployInstructions(req("?project=p&mode=full"), ctx)).status).toBe(404);
  });
});

describe("postDeployed", () => {
  const post = (body: unknown) =>
    new Request("http://localhost/api/arsenal/skills/tdd/deployed", {
      method: "POST",
      body: JSON.stringify(body),
    });

  it("400 dla złego ciała", async () => {
    expect((await postDeployed(post({ project: "p" }), ctx)).status).toBe(400);
    expect(mockMarkDeployed).not.toHaveBeenCalled();
  });

  it("200 z DTO zaktualizowanego skilla", async () => {
    mockMarkDeployed.mockResolvedValue({
      ...skill,
      deployed: [{ project: "p", mode: "full", date: "2026-11-14" }],
    });
    const res = await postDeployed(post({ project: "p", mode: "full" }), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).deployed).toHaveLength(1);
    expect(mockMarkDeployed).toHaveBeenCalledWith("tdd", "p", "full");
  });
});
```

- [ ] **Step 6: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/router.test.ts`
Expected: FAIL (brak modułu `router`).

- [ ] **Step 7: Napisz `router.ts`**

```ts
import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/http/apiError";
import { parseBody } from "@/lib/http/parseBody";
import {
  DeployQuerySchema,
  MarkDeployedBodySchema,
  toCatalogDto,
  toEntryDto,
  toInstructionsDto,
} from "./schemas";
import * as services from "./services";

type SlugContext = { params: Promise<{ slug: string }> };

export async function getCatalog(): Promise<NextResponse> {
  try {
    return NextResponse.json(toCatalogDto(services.listArsenal()));
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function getDeployInstructions(
  request: Request,
  ctx: SlugContext
): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const query = DeployQuerySchema.safeParse({
    project: params.get("project"),
    mode: params.get("mode"),
  });
  if (!query.success) {
    return NextResponse.json({ error: "Nieprawidłowy projekt lub tryb" }, { status: 400 });
  }
  try {
    const { slug } = await ctx.params;
    return NextResponse.json(
      toInstructionsDto(services.getDeployInstructions(slug, query.data.project, query.data.mode))
    );
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function postDeployed(request: Request, ctx: SlugContext): Promise<NextResponse> {
  const parsed = await parseBody(request, MarkDeployedBodySchema);
  if (parsed.success === false) return parsed.response;
  try {
    const { slug } = await ctx.params;
    const skill = await services.markDeployed(slug, parsed.data.project, parsed.data.mode);
    return NextResponse.json(toEntryDto(skill));
  } catch (err) {
    return handleServiceError(err);
  }
}
```

- [ ] **Step 8: Napisz trzy trasy (tylko re-eksport)**

`app/api/arsenal/route.ts`:

```ts
export { getCatalog as GET } from "@/contexts/bc_arsenal/router";
```

`app/api/arsenal/skills/[slug]/deploy/route.ts`:

```ts
export { getDeployInstructions as GET } from "@/contexts/bc_arsenal/router";
```

`app/api/arsenal/skills/[slug]/deployed/route.ts`:

```ts
export { postDeployed as POST } from "@/contexts/bc_arsenal/router";
```

- [ ] **Step 9: Uruchom testy `bc_arsenal` i test architektury**

Run: `npx vitest run tests/unit/contexts/bc_arsenal/ tests/unit/architecture.static.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add contexts/bc_arsenal app/api/arsenal tests/unit/contexts/bc_arsenal
git commit -m "feat(arsenal): DTO, handlery HTTP i trasy /api/arsenal"
```

---

## Task 7: `scripts/deploy-skill.sh`

**Files:**

- Create: `scripts/deploy-skill.sh` (`chmod +x`)
- Test: `tests/unit/scripts/deploy-skill/deploy-skill.test.ts`

- [ ] **Step 1: Napisz test**

```ts
// @vitest-environment node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = path.join(process.cwd(), "scripts/deploy-skill.sh");

const SKILL_MD = `---
name: demo
slug: demo
type: skill-doc
summary: Krótko
origin: global
description: >-
  Use when testing —
  second line
deployed:
  - project: p
    mode: full
    date: 2026-11-14
---

# Demo

Treść.
`;

const EXPECTED = `---
name: demo
description: >-
  Use when testing —
  second line
---

# Demo

Treść.
`;

let tmp = "";
let vault = "";
let project = "";

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-skill-"));
  vault = path.join(tmp, "Vault");
  project = path.join(tmp, "proj");
  fs.mkdirSync(path.join(vault, "Arsenal/Skills/demo/templates/nested"), { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(vault, "Arsenal/Skills/demo/skill.md"), SKILL_MD);
  fs.writeFileSync(path.join(vault, "Arsenal/Skills/demo/templates/t.md"), "szablon");
  fs.writeFileSync(path.join(vault, "Arsenal/Skills/demo/templates/nested/n.md"), "zagnieżdżony");
});

afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

const run = (args: string[]) =>
  spawnSync("bash", [SCRIPT, ...args], {
    env: { ...process.env, NEXUS_VAULT_PATH: vault },
    encoding: "utf8",
  });

const dest = () => path.join(project, ".claude/skills/demo");

describe("deploy-skill.sh", () => {
  it("kopiuje skill jako SKILL.md bez kluczy Vaultowych, zachowując description", () => {
    const res = run(["demo", project]);
    expect(res.status).toBe(0);
    expect(fs.readFileSync(path.join(dest(), "SKILL.md"), "utf8")).toBe(EXPECTED);
  });

  it("kopiuje zawartość templates/ obok SKILL.md (także zagnieżdżoną)", () => {
    run(["demo", project]);
    expect(fs.readFileSync(path.join(dest(), "t.md"), "utf8")).toBe("szablon");
    expect(fs.readFileSync(path.join(dest(), "nested/n.md"), "utf8")).toBe("zagnieżdżony");
  });

  it("odmawia nadpisania istniejącego SKILL.md bez --force (kod 4)", () => {
    run(["demo", project]);
    fs.writeFileSync(path.join(dest(), "SKILL.md"), "lokalna zmiana");
    const res = run(["demo", project]);
    expect(res.status).toBe(4);
    expect(fs.readFileSync(path.join(dest(), "SKILL.md"), "utf8")).toBe("lokalna zmiana");
  });

  it("--force nadpisuje", () => {
    run(["demo", project]);
    fs.writeFileSync(path.join(dest(), "SKILL.md"), "lokalna zmiana");
    expect(run(["demo", project, "--force"]).status).toBe(0);
    expect(fs.readFileSync(path.join(dest(), "SKILL.md"), "utf8")).toBe(EXPECTED);
  });

  it("zły slug: kod 2, nic nie zapisane", () => {
    expect(run(["../x", project]).status).toBe(2);
    expect(fs.existsSync(path.join(project, ".claude"))).toBe(false);
  });

  it("brak skilla albo katalogu projektu: kod 3", () => {
    expect(run(["nie-ma", project]).status).toBe(3);
    expect(run(["demo", path.join(tmp, "brak")]).status).toBe(3);
  });

  it("zła liczba argumentów: kod 1", () => {
    expect(run(["demo"]).status).toBe(1);
  });
});
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/scripts/deploy-skill/deploy-skill.test.ts`
Expected: FAIL (skrypt nie istnieje; `bash` zwraca 127).

- [ ] **Step 3: Napisz skrypt**

```bash
#!/usr/bin/env bash
# Wdraża skill z Vaulta (Arsenal/Skills/<slug>/) do repozytorium projektu: <projekt>/.claude/skills/<slug>/.
# Użycie: scripts/deploy-skill.sh <slug> <katalog-projektu> [--force]
# Uruchamia użytkownik (Monolith tylko generuje to polecenie). Vault: $NEXUS_VAULT_PATH (ścieżka POSIX)
# albo ~/projects/Brain_7224/NEXUS/Vault.
# Kody wyjścia: 0 ok, 1 użycie, 2 zły slug, 3 brak skilla lub katalogu projektu, 4 cel istnieje (bez --force).
set -euo pipefail

usage() { echo "Użycie: $0 <slug> <katalog-projektu> [--force]" >&2; exit 1; }

FORCE=0
ARGS=()
for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
    *) ARGS+=("$a") ;;
  esac
done
[[ ${#ARGS[@]} -eq 2 ]] || usage

SLUG="${ARGS[0]}"
TARGET="${ARGS[1]}"
[[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "Nieprawidłowy slug: $SLUG" >&2; exit 2; }

VAULT="${NEXUS_VAULT_PATH:-$HOME/projects/Brain_7224/NEXUS/Vault}"
TARGET="${TARGET/#\~/$HOME}"
SRC="$VAULT/Arsenal/Skills/$SLUG"
[[ -f "$SRC/skill.md" ]] || { echo "Brak skilla: $SRC/skill.md" >&2; exit 3; }
[[ -d "$TARGET" ]] || { echo "Brak katalogu projektu: $TARGET" >&2; exit 3; }

DEST="$TARGET/.claude/skills/$SLUG"
if [[ -e "$DEST/SKILL.md" && $FORCE -ne 1 ]]; then
  echo "Cel już istnieje: $DEST/SKILL.md (użyj --force, by nadpisać)" >&2
  exit 4
fi
mkdir -p "$DEST"

# Frontmatter: usuwamy klucze tylko-Vaultowe (type, slug, summary, origin, deployed) razem z ich
# wcięciami/listą; reszta (name, description, ...) i treść zostają bajt w bajt.
awk '
  NR == 1 && $0 == "---" { infm = 1; print; next }
  infm && $0 == "---" { infm = 0; skip = 0; print; next }
  infm {
    if ($0 ~ /^(type|slug|summary|origin|deployed):/) { skip = 1; next }
    if (skip && ($0 ~ /^[[:space:]]/ || $0 ~ /^-/)) next
    skip = 0
  }
  { print }
' "$SRC/skill.md" > "$DEST/SKILL.md"

# Szablony wracają obok SKILL.md (taki układ miały oryginalne skille).
if [[ -d "$SRC/templates" ]]; then
  cp -R "$SRC/templates/." "$DEST/"
fi

echo "Wdrożono: $DEST"
echo "Teraz w Arsenale kliknij „Oznacz jako wdrożone”."
```

Potem: `chmod +x scripts/deploy-skill.sh`.

- [ ] **Step 4: Uruchom test**

Run: `npx vitest run tests/unit/scripts/deploy-skill/deploy-skill.test.ts`
Expected: PASS (7 testów).

- [ ] **Step 5: Commit**

```bash
git add scripts/deploy-skill.sh tests/unit/scripts/deploy-skill
git commit -m "feat(arsenal): scripts/deploy-skill.sh (wdrożenie skilla z Vaulta do repo projektu)"
```

---

## Task 8: UI: `arsenalFilters.ts` (czysta logika)

**Files:**

- Create: `src/features/arsenal/arsenalFilters.ts`
- Test: `tests/unit/features/arsenal/arsenalFilters.test.ts`

- [ ] **Step 1: Napisz test**

```ts
import { describe, expect, it } from "vitest";
import type { ArsenalEntryDto } from "@/contexts/bc_arsenal/schemas";
import {
  EMPTY_FILTERS,
  entryProjects,
  filterEntries,
  isFiltered,
  promptModels,
} from "@/src/features/arsenal/arsenalFilters";

const skill = (slug: string, name: string, deployed: string[] = []): ArsenalEntryDto => ({
  kind: "skill",
  id: `skill:${slug}`,
  path: `Arsenal/Skills/${slug}/skill.md`,
  name,
  slug,
  summary: `Opis ${name}`,
  body: "",
  deployed: deployed.map((project) => ({ project, mode: "full" as const, date: "2026-11-14" })),
  templates: [],
});

const prompt = (
  key: string,
  name: string,
  projects: string[],
  model?: string
): ArsenalEntryDto => ({
  kind: "prompt",
  id: `prompt:${key}`,
  path: `Knowledge/prompty/${key}.md`,
  name,
  summary: `Opis ${name}`,
  body: "",
  projects,
  ...(model !== undefined && { model }),
});

const entries = [
  skill("tdd", "test-driven-development", ["p"]),
  skill("plans", "writing-plans"),
  prompt("Rada", "Rada Ekspertów", ["p", "q"], "opus"),
  prompt("Adwokat", "Adwokat Diabła", []),
];

const ids = (list: ArsenalEntryDto[]) => list.map((e) => e.id);

describe("filterEntries", () => {
  it("bez filtrów zwraca wszystko", () => {
    expect(filterEntries(entries, EMPTY_FILTERS)).toHaveLength(4);
  });

  it("szukanie ignoruje wielkość liter i polskie znaki, obejmuje nazwę i summary", () => {
    expect(ids(filterEntries(entries, { ...EMPTY_FILTERS, query: "diabla" }))).toEqual([
      "prompt:Adwokat",
    ]);
    expect(ids(filterEntries(entries, { ...EMPTY_FILTERS, query: "OPIS WRITING" }))).toEqual([
      "skill:plans",
    ]);
    expect(ids(filterEntries(entries, { ...EMPTY_FILTERS, query: "nie ma takiego" }))).toEqual([]);
  });

  it("rodzaj", () => {
    expect(ids(filterEntries(entries, { ...EMPTY_FILTERS, kind: "prompt" }))).toEqual([
      "prompt:Rada",
      "prompt:Adwokat",
    ]);
  });

  it("projekt: skille po deployed, prompty po projects", () => {
    expect(ids(filterEntries(entries, { ...EMPTY_FILTERS, project: "p" }))).toEqual([
      "skill:tdd",
      "prompt:Rada",
    ]);
    expect(ids(filterEntries(entries, { ...EMPTY_FILTERS, project: "q" }))).toEqual([
      "prompt:Rada",
    ]);
  });

  it("model dotyczy tylko promptów", () => {
    expect(ids(filterEntries(entries, { ...EMPTY_FILTERS, model: "opus" }))).toEqual([
      "prompt:Rada",
    ]);
  });

  it("niewdrożone nigdzie: tylko skille bez deployed", () => {
    expect(ids(filterEntries(entries, { ...EMPTY_FILTERS, undeployedOnly: true }))).toEqual([
      "skill:plans",
    ]);
  });
});

describe("pomocnicze", () => {
  it("entryProjects", () => {
    expect(entryProjects(entries[0])).toEqual(["p"]);
    expect(entryProjects(entries[2])).toEqual(["p", "q"]);
  });

  it("promptModels: unikalne, niepuste, posortowane", () => {
    expect(promptModels([...entries, prompt("X", "X", [], "haiku")])).toEqual(["haiku", "opus"]);
  });

  it("isFiltered", () => {
    expect(isFiltered(EMPTY_FILTERS)).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTERS, query: "a" })).toBe(true);
    expect(isFiltered({ ...EMPTY_FILTERS, undeployedOnly: true })).toBe(true);
  });
});
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/features/arsenal/arsenalFilters.test.ts`
Expected: FAIL (brak modułu).

- [ ] **Step 3: Napisz `arsenalFilters.ts`**

```ts
import type { ArsenalEntryDto } from "@/contexts/bc_arsenal/schemas";

export type KindFilter = "all" | "skill" | "prompt";

export type ArsenalFilters = {
  query: string;
  kind: KindFilter;
  /** `id` projektu z rejestru. */
  project: string | null;
  /** Model promptu. */
  model: string | null;
  undeployedOnly: boolean;
};

export const EMPTY_FILTERS: ArsenalFilters = {
  query: "",
  kind: "all",
  project: null,
  model: null,
  undeployedOnly: false,
};

const fold = (text: string): string =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

/** Projekty powiązane z wpisem: wdrożenia skilla albo pole `projects` promptu. */
export function entryProjects(entry: ArsenalEntryDto): string[] {
  return entry.kind === "skill" ? entry.deployed.map((d) => d.project) : entry.projects;
}

export function filterEntries(
  entries: ArsenalEntryDto[],
  filters: ArsenalFilters
): ArsenalEntryDto[] {
  const query = fold(filters.query.trim());
  return entries.filter((entry) => {
    if (filters.kind !== "all" && entry.kind !== filters.kind) return false;
    if (filters.project !== null && !entryProjects(entry).includes(filters.project)) return false;
    if (filters.model !== null && !(entry.kind === "prompt" && entry.model === filters.model)) {
      return false;
    }
    if (filters.undeployedOnly && !(entry.kind === "skill" && entry.deployed.length === 0)) {
      return false;
    }
    return query === "" || fold(`${entry.name} ${entry.summary}`).includes(query);
  });
}

export function promptModels(entries: ArsenalEntryDto[]): string[] {
  const models = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === "prompt" && entry.model !== undefined) models.add(entry.model);
  }
  return [...models].sort((a, b) => a.localeCompare(b, "pl"));
}

export function isFiltered(filters: ArsenalFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.kind !== "all" ||
    filters.project !== null ||
    filters.model !== null ||
    filters.undeployedOnly
  );
}
```

- [ ] **Step 4: Uruchom test**

Run: `npx vitest run tests/unit/features/arsenal/arsenalFilters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/arsenal/arsenalFilters.ts tests/unit/features/arsenal/arsenalFilters.test.ts
git commit -m "feat(arsenal): filtry katalogu skilli i promptów"
```

---

## Task 9: UI: `useArsenal.ts`

**Files:**

- Create: `src/features/arsenal/useArsenal.ts`
- Test: `tests/unit/features/arsenal/useArsenal.test.tsx`

- [ ] **Step 1: Napisz test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useArsenal } from "@/src/features/arsenal/useArsenal";

const catalog = {
  entries: [
    {
      kind: "skill",
      id: "skill:tdd",
      path: "Arsenal/Skills/tdd/skill.md",
      name: "tdd",
      slug: "tdd",
      summary: "s",
      body: "b",
      deployed: [],
      templates: [],
    },
    {
      kind: "prompt",
      id: "prompt:R",
      path: "Knowledge/prompty/R.md",
      name: "R",
      summary: "r",
      body: "b",
      projects: [],
    },
  ],
  targets: [{ id: "p", name: "P", localPath: "~/p", owner: "personal" }],
  skipped: 0,
};

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

function setup(handler?: (url: string, init?: RequestInit) => Response) {
  const apiFetch = vi.fn(async (url: string, init?: RequestInit) =>
    handler ? handler(url, init) : json(catalog)
  );
  const hook = renderHook(() => useArsenal(apiFetch));
  return { apiFetch, ...hook };
}

describe("useArsenal", () => {
  it("ładuje katalog i zwraca wszystkie wpisy", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((e) => e.id)).toEqual(["skill:tdd", "prompt:R"]);
    expect(result.current.targets).toHaveLength(1);
  });

  it("filtry zawężają listę", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setFilters({ ...result.current.filters, kind: "prompt" }));
    expect(result.current.entries.map((e) => e.id)).toEqual(["prompt:R"]);
  });

  it("błąd HTTP trafia do error z komunikatem serwera", async () => {
    const { result } = setup(() => json({ error: "Vault niedostępny" }, false, 500));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Vault niedostępny");
  });

  it("fetchInstructions woła trasę deploy z kodowanymi parametrami", async () => {
    const { result, apiFetch } = setup((url) =>
      url.includes("/deploy?") ? json({ mode: "full", text: "cmd" }) : json(catalog)
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const out = await result.current.fetchInstructions("tdd", "p", "full");
    expect(out).toEqual({ mode: "full", text: "cmd" });
    expect(apiFetch).toHaveBeenCalledWith("/api/arsenal/skills/tdd/deploy?project=p&mode=full");
  });

  it("markDeployed wysyła POST i przeładowuje katalog", async () => {
    const { result, apiFetch } = setup((_url, init) =>
      init?.method === "POST" ? json({}) : json(catalog)
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.markDeployed("tdd", "p", "full");
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/arsenal/skills/tdd/deployed",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ project: "p", mode: "full" }),
      })
    );
    const gets = apiFetch.mock.calls.filter(([url]) => url === "/api/arsenal");
    expect(gets).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/features/arsenal/useArsenal.test.tsx`
Expected: FAIL (brak modułu).

- [ ] **Step 3: Napisz `useArsenal.ts`**

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CatalogDtoSchema,
  DeployInstructionsDtoSchema,
  type ArsenalEntryDto,
  type CatalogDto,
  type DeployInstructionsDto,
  type DeployModeDto,
} from "@/contexts/bc_arsenal/schemas";
import { EMPTY_FILTERS, filterEntries, type ArsenalFilters } from "./arsenalFilters";

export type ApiFetch = (url: string, options?: RequestInit) => Promise<Response>;

async function errorText(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : `Błąd ${res.status}`;
}

export function useArsenal(apiFetch: ApiFetch) {
  const [catalog, setCatalog] = useState<CatalogDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ArsenalFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/arsenal");
      if (!res.ok) throw new Error(await errorText(res));
      setCatalog(CatalogDtoSchema.parse(await res.json()));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać Arsenału");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const allEntries = useMemo<ArsenalEntryDto[]>(() => catalog?.entries ?? [], [catalog]);
  const entries = useMemo(() => filterEntries(allEntries, filters), [allEntries, filters]);
  const selected = useMemo(
    () => allEntries.find((e) => e.id === selectedId) ?? null,
    [allEntries, selectedId]
  );

  const fetchInstructions = useCallback(
    async (slug: string, project: string, mode: DeployModeDto): Promise<DeployInstructionsDto> => {
      const url = `/api/arsenal/skills/${encodeURIComponent(slug)}/deploy?project=${encodeURIComponent(project)}&mode=${mode}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(await errorText(res));
      return DeployInstructionsDtoSchema.parse(await res.json());
    },
    [apiFetch]
  );

  const markDeployed = useCallback(
    async (slug: string, project: string, mode: DeployModeDto): Promise<void> => {
      const res = await apiFetch(`/api/arsenal/skills/${encodeURIComponent(slug)}/deployed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, mode }),
      });
      if (!res.ok) throw new Error(await errorText(res));
      await load();
    },
    [apiFetch, load]
  );

  return {
    loading,
    error,
    total: allEntries.length,
    skipped: catalog?.skipped ?? 0,
    targets: catalog?.targets ?? [],
    allEntries,
    entries,
    filters,
    setFilters,
    selected,
    selectedId,
    setSelectedId,
    fetchInstructions,
    markDeployed,
  };
}
```

- [ ] **Step 4: Uruchom test**

Run: `npx vitest run tests/unit/features/arsenal/useArsenal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/arsenal/useArsenal.ts tests/unit/features/arsenal/useArsenal.test.tsx
git commit -m "feat(arsenal): hook useArsenal (katalog, filtry, instrukcje wdrożenia)"
```

---

## Task 10: UI: komponenty widoku „Skille i prompty”

**Files:**

- Create: `src/features/arsenal/CopyButton.tsx`, `ArsenalFilterBar.tsx`, `DeployPanel.tsx`, `ArsenalDetail.tsx`, `ArsenalSkillsView.tsx`, `arsenal.css`
- Test: `tests/unit/features/arsenal/ArsenalSkillsView.test.tsx`

- [ ] **Step 1: Napisz test widoku**

```tsx
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArsenalSkillsView } from "@/src/features/arsenal/ArsenalSkillsView";

afterEach(cleanup);

const catalog = {
  entries: [
    {
      kind: "skill",
      id: "skill:tdd",
      path: "Arsenal/Skills/tdd/skill.md",
      name: "test-driven-development",
      slug: "tdd",
      summary: "Najpierw test",
      body: "# TDD\nTreść skilla",
      origin: "global",
      deployed: [{ project: "p", mode: "full", date: "2026-11-14" }],
      templates: [{ name: "t.md", text: "szablon" }],
    },
    {
      kind: "prompt",
      id: "prompt:Rada",
      path: "Knowledge/prompty/Rada.md",
      name: "Rada ekspertów",
      summary: "Rada",
      body: "Treść promptu",
      projects: [],
    },
  ],
  targets: [
    { id: "p", name: "Projekt P", localPath: "~/p", owner: "personal" },
    { id: "w", name: "Projekt W", localPath: "~/w", owner: "work" },
  ],
  skipped: 2,
};

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

function setup() {
  const apiFetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return json({});
    if (url.includes("/deploy?")) {
      return json({
        mode: "full",
        text: "scripts/deploy-skill.sh tdd '~/w'",
        note: "Dane z firmy: sprawdź, gdzie wklejasz",
      });
    }
    return json(catalog);
  });
  render(<ArsenalSkillsView apiFetch={apiFetch} />);
  return apiFetch;
}

describe("ArsenalSkillsView", () => {
  it("pokazuje listę wpisów i licznik pominiętych", async () => {
    setup();
    expect(await screen.findByRole("button", { name: /test-driven-development/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Rada ekspertów/ })).toBeVisible();
    expect(screen.getByText(/pominięto 2/i)).toBeVisible();
  });

  it("filtr „prompty” ukrywa skille", async () => {
    setup();
    await screen.findByRole("button", { name: /test-driven-development/ });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "prompty" }));
    expect(screen.queryByRole("button", { name: /test-driven-development/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Rada ekspertów/ })).toBeVisible();
  });

  it("wybór skilla pokazuje treść, szablony i wdrożenia", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /test-driven-development/ }));
    expect(screen.getByRole("heading", { name: "test-driven-development" })).toBeVisible();
    expect(screen.getByText(/Treść skilla/)).toBeVisible();
    expect(screen.getByText("t.md")).toBeVisible();
    expect(screen.getByText(/Projekt P/, { selector: ".asv-deployed *" })).toBeVisible();
  });

  it("generuje polecenie dla projektu z etatu z notą ostrzegawczą", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /test-driven-development/ }));
    await user.selectOptions(screen.getByLabelText("Projekt docelowy"), "w");
    await user.click(screen.getByRole("button", { name: "Generuj" }));
    expect(await screen.findByText("scripts/deploy-skill.sh tdd '~/w'")).toBeVisible();
    expect(screen.getByText("Dane z firmy: sprawdź, gdzie wklejasz")).toBeVisible();
  });

  it("„Oznacz jako wdrożone” wysyła POST z projektem i trybem", async () => {
    const apiFetch = setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /test-driven-development/ }));
    await user.selectOptions(screen.getByLabelText("Projekt docelowy"), "w");
    await user.click(screen.getByRole("button", { name: "Generuj" }));
    await user.click(await screen.findByRole("button", { name: "Oznacz jako wdrożone" }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/arsenal/skills/tdd/deployed",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ project: "w", mode: "full" }),
        })
      )
    );
  });

  it("przełączenie projektu czyści wygenerowany tekst", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /test-driven-development/ }));
    await user.click(screen.getByRole("button", { name: "Generuj" }));
    await screen.findByText("scripts/deploy-skill.sh tdd '~/w'");
    await user.selectOptions(screen.getByLabelText("Projekt docelowy"), "w");
    expect(screen.queryByText("scripts/deploy-skill.sh tdd '~/w'")).toBeNull();
  });
});
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/features/arsenal/ArsenalSkillsView.test.tsx`
Expected: FAIL (brak modułu `ArsenalSkillsView`).

- [ ] **Step 3: Napisz `CopyButton.tsx`**

```tsx
import React, { useState } from "react";

export function CopyButton({ text, label = "Kopiuj" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };
  return (
    <button type="button" className="asv-btn" onClick={copy}>
      {done ? "Skopiowano" : label}
    </button>
  );
}
```

- [ ] **Step 4: Napisz `ArsenalFilterBar.tsx`**

```tsx
import React from "react";
import type { DeployTargetDto } from "@/contexts/bc_arsenal/schemas";
import { EMPTY_FILTERS, isFiltered, type ArsenalFilters, type KindFilter } from "./arsenalFilters";

const KINDS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "wszystkie" },
  { id: "skill", label: "skille" },
  { id: "prompt", label: "prompty" },
];

type Props = {
  filters: ArsenalFilters;
  onChange: (filters: ArsenalFilters) => void;
  targets: DeployTargetDto[];
  models: string[];
};

export function ArsenalFilterBar({ filters, onChange, targets, models }: Props) {
  const set = (patch: Partial<ArsenalFilters>) => onChange({ ...filters, ...patch });
  return (
    <div className="asv-filters">
      <input
        type="search"
        className="asv-search"
        aria-label="Szukaj skilla lub promptu"
        placeholder="Szukaj skilla lub promptu..."
        value={filters.query}
        onChange={(e) => set({ query: e.target.value })}
      />
      <div className="asv-chips">
        {KINDS.map((kind) => (
          <button
            key={kind.id}
            type="button"
            className="asv-chip"
            aria-pressed={filters.kind === kind.id}
            onClick={() => set({ kind: kind.id })}
          >
            {kind.label}
          </button>
        ))}
      </div>
      <select
        aria-label="Projekt"
        value={filters.project ?? ""}
        onChange={(e) => set({ project: e.target.value === "" ? null : e.target.value })}
      >
        <option value="">Wszystkie projekty</option>
        {targets.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {models.length > 0 && (
        <select
          aria-label="Model"
          value={filters.model ?? ""}
          onChange={(e) => set({ model: e.target.value === "" ? null : e.target.value })}
        >
          <option value="">Wszystkie modele</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}
      <label className="asv-check">
        <input
          type="checkbox"
          checked={filters.undeployedOnly}
          onChange={(e) => set({ undeployedOnly: e.target.checked })}
        />
        niewdrożone nigdzie
      </label>
      {isFiltered(filters) && (
        <button type="button" className="asv-btn" onClick={() => onChange(EMPTY_FILTERS)}>
          Wyczyść filtry
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Napisz `DeployPanel.tsx`**

```tsx
import React, { useState } from "react";
import type {
  DeployInstructionsDto,
  DeployModeDto,
  DeployTargetDto,
  SkillEntryDto,
} from "@/contexts/bc_arsenal/schemas";
import { CopyButton } from "./CopyButton";

type Props = {
  skill: SkillEntryDto;
  targets: DeployTargetDto[];
  fetchInstructions: (
    slug: string,
    project: string,
    mode: DeployModeDto
  ) => Promise<DeployInstructionsDto>;
  markDeployed: (slug: string, project: string, mode: DeployModeDto) => Promise<void>;
};

const message = (err: unknown): string => (err instanceof Error ? err.message : "Błąd");

export function DeployPanel({ skill, targets, fetchInstructions, markDeployed }: Props) {
  const [project, setProject] = useState(targets[0]?.id ?? "");
  const [mode, setMode] = useState<DeployModeDto>("full");
  const [result, setResult] = useState<DeployInstructionsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [marked, setMarked] = useState(false);

  if (targets.length === 0) return <p className="asv-empty">Brak projektów w rejestrze.</p>;

  const reset = () => {
    setResult(null);
    setError(null);
    setMarked(false);
  };

  const generate = async () => {
    setBusy(true);
    reset();
    try {
      setResult(await fetchInstructions(skill.slug, project, mode));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const mark = async () => {
    setBusy(true);
    setError(null);
    try {
      await markDeployed(skill.slug, project, mode);
      setMarked(true);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="asv-deploy" aria-label="Wdrażanie do projektu">
      <h3>Wdrażanie do projektu</h3>
      <label>
        Projekt docelowy
        <select
          value={project}
          onChange={(e) => {
            setProject(e.target.value);
            reset();
          }}
        >
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.owner === "work" ? " (etat)" : ""}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="asv-modes">
        <legend>Tryb</legend>
        <label>
          <input
            type="radio"
            name={`mode-${skill.slug}`}
            checked={mode === "full"}
            onChange={() => {
              setMode("full");
              reset();
            }}
          />
          W całości (polecenie skryptu)
        </label>
        <label>
          <input
            type="radio"
            name={`mode-${skill.slug}`}
            checked={mode === "adapted"}
            onChange={() => {
              setMode("adapted");
              reset();
            }}
          />
          Zredagowany (prompt dla agenta)
        </label>
      </fieldset>
      <button type="button" className="asv-btn" disabled={busy} onClick={generate}>
        Generuj
      </button>
      {error !== null && (
        <p role="alert" className="asv-error">
          {error}
        </p>
      )}
      {result !== null && (
        <div className="asv-result">
          {result.note !== undefined && <p className="asv-note">{result.note}</p>}
          {result.mode === "full" && (
            <p className="asv-hint">Uruchom z katalogu Monolith. Aplikacja niczego nie wykonuje.</p>
          )}
          <pre className="asv-body">{result.text}</pre>
          <div className="asv-actions">
            <CopyButton text={result.text} />
            <button type="button" className="asv-btn" disabled={busy} onClick={mark}>
              Oznacz jako wdrożone
            </button>
            {marked && <span className="asv-ok">Zapisano w skill.md</span>}
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Napisz `ArsenalDetail.tsx`**

```tsx
import React from "react";
import type {
  ArsenalEntryDto,
  DeployInstructionsDto,
  DeployModeDto,
  DeployTargetDto,
} from "@/contexts/bc_arsenal/schemas";
import { CopyButton } from "./CopyButton";
import { DeployPanel } from "./DeployPanel";

type Props = {
  entry: ArsenalEntryDto | null;
  targets: DeployTargetDto[];
  fetchInstructions: (
    slug: string,
    project: string,
    mode: DeployModeDto
  ) => Promise<DeployInstructionsDto>;
  markDeployed: (slug: string, project: string, mode: DeployModeDto) => Promise<void>;
};

const MODE_LABEL: Record<DeployModeDto, string> = { full: "w całości", adapted: "zredagowany" };

export function projectName(targets: DeployTargetDto[], id: string): string {
  return targets.find((t) => t.id === id)?.name ?? id;
}

export function ArsenalDetail({ entry, targets, fetchInstructions, markDeployed }: Props) {
  if (entry === null) return <p className="asv-empty">Wybierz wpis z listy.</p>;
  return (
    <article className="asv-detail">
      <h2>{entry.name}</h2>
      <p className="asv-meta">
        {entry.kind === "skill" ? "Skill" : "Prompt"}
        {entry.kind === "skill" && entry.origin !== undefined && ` · pochodzenie: ${entry.origin}`}
        {entry.kind === "prompt" && entry.model !== undefined && ` · model: ${entry.model}`}
      </p>
      {entry.summary !== "" && <p>{entry.summary}</p>}
      <div className="asv-actions">
        <h3>Treść</h3>
        <CopyButton text={entry.body} />
      </div>
      <pre className="asv-body">{entry.body}</pre>

      {entry.kind === "prompt" && entry.projects.length > 0 && (
        <p className="asv-meta">
          Projekty: {entry.projects.map((id) => projectName(targets, id)).join(", ")}
        </p>
      )}

      {entry.kind === "skill" && (
        <>
          <section aria-label="Szablony">
            <h3>Szablony</h3>
            {entry.templates.length === 0 ? (
              <p className="asv-empty">Brak szablonów.</p>
            ) : (
              <ul className="asv-templates">
                {entry.templates.map((template) => (
                  <li key={template.name}>
                    <span>{template.name}</span>
                    <CopyButton text={template.text} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-label="Wdrożenia">
            <h3>Wdrożenia</h3>
            {entry.deployed.length === 0 ? (
              <p className="asv-empty">Niewdrożone nigdzie.</p>
            ) : (
              <ul className="asv-deployed">
                {entry.deployed.map((d) => (
                  <li key={d.project}>
                    <span>{projectName(targets, d.project)}</span> · {MODE_LABEL[d.mode]} · {d.date}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <DeployPanel
            key={entry.id}
            skill={entry}
            targets={targets}
            fetchInstructions={fetchInstructions}
            markDeployed={markDeployed}
          />
        </>
      )}
    </article>
  );
}
```

- [ ] **Step 7: Napisz `ArsenalSkillsView.tsx`**

```tsx
import React from "react";
import { Loader2 } from "lucide-react";
import "@/src/features/resources/resources.css";
import "./arsenal.css";
import { ArsenalDetail, projectName } from "./ArsenalDetail";
import { ArsenalFilterBar } from "./ArsenalFilterBar";
import { promptModels } from "./arsenalFilters";
import { useArsenal, type ApiFetch } from "./useArsenal";

export function ArsenalSkillsView({ apiFetch }: { apiFetch: ApiFetch }) {
  const a = useArsenal(apiFetch);

  return (
    <div className="ars asv" data-card="arsenal">
      <header className="ars-head">
        <div>
          <p className="ars-eyebrow">Alt+7 · Arsenał</p>
          <h1 className="ars-title">Skille i prompty</h1>
          <p className="ars-sub">
            {a.total} wpisów
            {a.skipped > 0 && ` · pominięto ${a.skipped} (uszkodzone lub nieznane wdrożenia)`}
          </p>
        </div>
      </header>

      {a.loading ? (
        <Loader2 className="animate-spin" aria-label="Ładowanie" />
      ) : a.error !== null ? (
        <p role="alert" className="asv-error">
          {a.error}
        </p>
      ) : (
        <>
          <ArsenalFilterBar
            filters={a.filters}
            onChange={a.setFilters}
            targets={a.targets}
            models={promptModels(a.allEntries)}
          />
          <div className="asv-layout">
            <ul className="asv-list" role="list">
              {a.entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="asv-item"
                    aria-pressed={entry.id === a.selectedId}
                    onClick={() => a.setSelectedId(entry.id)}
                  >
                    <span className="asv-badge" data-kind={entry.kind}>
                      {entry.kind === "skill" ? "Skill" : "Prompt"}
                    </span>
                    <strong>{entry.name}</strong>
                    <span className="asv-summary">{entry.summary}</span>
                    {entry.kind === "skill" && entry.deployed.length > 0 && (
                      <span className="asv-chips-row">
                        {entry.deployed.map((d) => (
                          <span key={d.project} className="asv-chip-static">
                            {projectName(a.targets, d.project)}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {a.entries.length === 0 && (
                <li className="asv-empty">Brak wpisów dla tych filtrów.</li>
              )}
            </ul>
            <ArsenalDetail
              entry={a.selected}
              targets={a.targets}
              fetchInstructions={a.fetchInstructions}
              markDeployed={a.markDeployed}
            />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Napisz `arsenal.css`** (tokeny `--line`, `--surface`, `--muted`, `--accent`, `--s-*`, `--fs-*`, `--r-md` pochodzą z `.ars` w `resources.css`)

```css
.asv-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  align-items: center;
  margin-bottom: var(--s-4);
}
.asv-search {
  min-width: 240px;
  flex: 1;
}
.asv-chips {
  display: flex;
  gap: var(--s-2);
}
.asv-chip,
.asv-btn {
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text);
  border-radius: var(--r-md);
  padding: var(--s-2) var(--s-3);
  font-size: var(--fs-sm);
  cursor: pointer;
}
.asv-chip[aria-pressed="true"] {
  border-color: var(--accent);
  color: var(--accent-text, var(--accent));
}
.asv-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.asv-check {
  font-size: var(--fs-sm);
  color: var(--muted);
}

.asv-layout {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr);
  gap: var(--s-4);
  align-items: start;
}
@media (max-width: 900px) {
  .asv-layout {
    grid-template-columns: 1fr;
  }
}

.asv-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--s-2);
}
.asv-item {
  display: grid;
  gap: var(--s-1, 4px);
  width: 100%;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: var(--s-3);
  color: var(--text);
  cursor: pointer;
}
.asv-item[aria-pressed="true"] {
  border-color: var(--accent);
}
.asv-badge {
  font-size: var(--fs-xs);
  color: var(--accent);
  text-transform: uppercase;
}
.asv-badge[data-kind="prompt"] {
  color: #38bdf8;
}
.asv-summary,
.asv-meta,
.asv-hint {
  color: var(--muted);
  font-size: var(--fs-sm);
}
.asv-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}
.asv-chip-static {
  font-size: var(--fs-xs);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 0 var(--s-2);
}

.asv-detail {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: var(--s-4);
  display: grid;
  gap: var(--s-3);
}
.asv-body {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  background: var(--surface-2);
  border-radius: var(--r-md);
  padding: var(--s-3);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 420px;
  overflow: auto;
  margin: 0;
}
.asv-actions {
  display: flex;
  gap: var(--s-3);
  align-items: center;
  flex-wrap: wrap;
}
.asv-templates,
.asv-deployed {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--s-2);
}
.asv-templates li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.asv-deploy {
  display: grid;
  gap: var(--s-3);
}
.asv-modes {
  border: 0;
  padding: 0;
  display: grid;
  gap: var(--s-2);
}
.asv-note {
  color: #fbbf24;
  font-size: var(--fs-sm);
}
.asv-error {
  color: #f87171;
}
.asv-ok {
  color: #4ade80;
  font-size: var(--fs-sm);
}
.asv-empty {
  color: var(--muted);
}
```

- [ ] **Step 9: Uruchom test widoku i wszystkie testy `features/arsenal`**

Run: `npx vitest run tests/unit/features/arsenal/`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/features/arsenal tests/unit/features/arsenal/ArsenalSkillsView.test.tsx
git commit -m "feat(arsenal): widok Skille i prompty (lista, szczegóły, panel wdrożenia)"
```

---

## Task 11: Rejestracja zakładki w karcie Arsenał

**Files:**

- Modify: `src/features/planowanie/planningTab.ts`, `src/features/cards/cards.ts`, `src/features/planowanie/PlanowanieView.tsx`, `src/translations.ts`, `src/components/layout/MobileMoreDrawer.tsx`
- Test: `tests/unit/features/cards/cards.test.ts`

- [ ] **Step 1: Zaktualizuj `cards.test.ts` (czerwony)**

Linie 63–64 (`cardForView`): dodaj pod nimi

```ts
expect(cardForView("planowanie", "skills")).toBe("arsenal");
```

Linia 99–101 — zmień nazwę testu i oczekiwanie:

```ts
  test("subtabsForCard('plotno') = ['board','mindmaps'], 'arsenal' = ['resources','skills','tags'], 'kokpit' = []", () => {
```

```ts
expect(subtabsForCard("arsenal")).toEqual(["resources", "skills", "tags"]);
```

Linia 109 (mapa `CARD_SUBTABS`):

```ts
      arsenal: ["resources", "skills", "tags"],
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/unit/features/cards/cards.test.ts`
Expected: FAIL (m.in. `cardForView("planowanie","skills")` i lista zakładek).

- [ ] **Step 3: Dodaj `"skills"` do `PlanningTab` (`planningTab.ts`)**

```ts
export type PlanningTab =
  | "tasks"
  | "notes"
  | "activity"
  | "calendar"
  | "tags"
  | "resources"
  | "skills"
  | "mindmaps"
  | "board";
```

- [ ] **Step 4: Zmień `cards.ts`**

W `TAB_TO_CARD` dopisz `skills: "arsenal",` po `resources: "arsenal",`. W `CARD_SUBTABS`:

```ts
  arsenal: ["resources", "skills", "tags"],
```

Cel karty (`target: { kind: "planning", tab: "resources" }`) zostaje bez zmian.

- [ ] **Step 5: Tłumaczenia (`src/translations.ts`)**

W słowniku angielskim, po `tabResources: "Resources",` (ok. linii 122): `tabSkills: "Skills & prompts",`. W polskim, po `tabResources: "Zasoby",` (ok. linii 368): `tabSkills: "Skille i prompty",`.

- [ ] **Step 6: `PlanowanieView.tsx`**

Import (przy `ResourceSection`, linia 11): `import { ArsenalSkillsView } from "@/src/features/arsenal/ArsenalSkillsView";`

W mapowaniu etykiet zakładek (linie ok. 177–192) wstaw gałąź przed `tab === "tags"`:

```tsx
                : tab === "skills"
                  ? ((t.tabSkills as string) ?? "Skille i prompty")
                  : tab === "tags"
                    ? t.tabTags
                    : tab,
```

(zastępuje fragment `: tab === "tags" ? t.tabTags : tab,`; dopasuj wcięcia do Prettiera).

Przed gałęzią `planningTab === "mindmaps"` (linia ok. 279) dodaj:

```tsx
        ) : planningTab === "skills" ? (
          <div className="flex-1 flex flex-col overflow-auto bg-[var(--bg)]">
            <ArsenalSkillsView apiFetch={apiFetch} />
          </div>
```

- [ ] **Step 7: `MobileMoreDrawer.tsx`**

W imporcie z `lucide-react` dodaj `Sparkles`: `import { Link, Briefcase, Tag, Map, LayoutDashboard, Sparkles } from "lucide-react";` i w tablicy `items` po pozycji `resources`:

```tsx
    {
      id: "skills",
      icon: <Sparkles className="w-5 h-5" />,
      labelPl: "Skille i prompty",
      labelEn: "Skills & prompts",
    },
```

- [ ] **Step 8: Typecheck i testy (delegacja do `cursor`)**

Run: `npx tsc --noEmit` — Expected: bez błędów (każdy `Record<PlanningTab, …>` i `switch` po `PlanningTab`, który pęknie, trzeba uzupełnić o `skills`; to jedyny dopuszczalny rodzaj poprawek w tym kroku).
Run: `npx vitest run tests/unit/features tests/unit/components` — Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/features/planowanie src/features/cards src/translations.ts src/components/layout tests/unit/features/cards
git commit -m "feat(arsenal): zakładka Skille i prompty w karcie Arsenał"
```

---

## Task 12: Spec, weryfikacja końcowa i opis PR

**Files:**

- Modify: `docs/superpowers/specs/2026-11-14-karta-arsenal-design.md`

- [ ] **Step 1: Uzupełnij spec o ustalenia 1, 2, 3, 4 i 5 z początku planu**

- §3.1 (tabela frontmattera): dodaj wiersz `| description | opis do aktywacji skilla (zachowany z oryginalnego SKILL.md; źródło zastępczego summary) |`.
- §3.4: zdanie o „W całości” zastąp: „aplikacja generuje polecenie `scripts/deploy-skill.sh <slug> '<local_path>'`, które kopiuje `skill.md` jako `SKILL.md` (bez kluczy `type`, `slug`, `summary`, `origin`, `deployed`) i zawartość `templates/` obok niego do `<local_path>/.claude/skills/<slug>/`”; w „Zredagowany” zastąp „np. wywołanie `ask-helper --role task`” zdaniem „aplikacja generuje sam prompt do skopiowania (do wklejenia dowolnemu agentowi, także przez `ask-helper --role task`)”. Dopisz: „Jeden wpis `deployed` na projekt; ponowne oznaczenie zastępuje wpis.”
- §7: zdanie o zakładkach: „w etapie 2 lista to `resources`, `skills`, `tags` (wejście z `Alt+7` zostaje na `resources`); docelowy zestaw czterech zakładek powstaje po etapach 3–4”.

- [ ] **Step 2: Pełna weryfikacja (delegacja do `cursor`, `--tier light`)**

Run kolejno: `npx tsc --noEmit`, `npx vitest run`, `npm run lint`, `npm run build`.
Expected: każde „przeszło”. Pełny output czytać tylko, gdy podsumowanie nie wystarcza.

- [ ] **Step 3: Review diffa przez pomocnika (`--role review`, `agy`, `--tier deep`)**

Prompt: „Przejrzyj `git diff main...HEAD` pod kątem: błędów w `contexts/bc_arsenal/` (zapis frontmattera nie gubi kluczy; walidacja slugu i ścieżek), zgodności z regułami 1–7 z CLAUDE.md, wycieku danych z etatu do plików repo, testów, które nic nie sprawdzają. Format: `plik:linia + problem`.” Opinie traktować jak hipotezy i zweryfikować w kodzie.

- [ ] **Step 4: Commit specu**

```bash
git add docs/superpowers/specs/2026-11-14-karta-arsenal-design.md
git commit -m "docs(arsenal): spec etapu 2 zsynchronizowany z planem"
```

- [ ] **Step 5: Opis PR**

Opis PR musi zawierać tabelę „Przekazane innym kartom” z §8 specu (Projekty, Notatki, Kodeks, Mapa) oraz listę ustaleń z początku tego planu (szczególnie 5: domyślna zakładka). Atrybucja na końcu zgodnie z konfiguracją sesji.

---

## Task 13: Migracja skilli do Vaulta (zadanie dla agenta, po merge'u kodu)

To **nie jest kod aplikacji** (spec §3.5). Wykonuje agent w osobnym zadaniu, z kontrolą `git diff` w repo NEXUS; commit w NEXUS decyduje użytkownik (w NEXUS leży już lokalny, niewypchnięty `cbbcbe9`, a `Vault/Inbox/inbox.md` jest niezacommitowany: nie mieszać).

**Files (poza Monolith):**

- Create: `~/projects/Brain_7224/NEXUS/Vault/Arsenal/Skills/<slug>/skill.md` (+ `templates/`)
- Źródła (tylko odczyt): `Monolith/.claude/skills/*` (14), `NEXUS/.claude/skills/*` (8), skille globalne wskazane przez użytkownika

- [ ] **Step 1: Sprawdź, czy skille NEXUS skanują cały `Vault/`**

Run: `grep -rn "Vault" ~/projects/Brain_7224/NEXUS/.claude/skills --include=*.md --include=*.py --include=*.sh | grep -v "Vault/Knowledge\|Vault/Projects\|Vault/Inbox\|Vault/Resources\|Vault/Notes"`
Expected: brak trafień skanujących `Vault/` rekurencyjnie (`kb_audit.py` czyta tylko `Vault/Knowledge`, potwierdzone `kb_audit.py:22`). Każde trafienie opisać użytkownikowi, zanim powstanie `Vault/Arsenal/`.

- [ ] **Step 2: Dla każdego skilla utwórz `skill.md`**

Slug = nazwa folderu skilla (kebab-case). Frontmatter:

```yaml
---
name: <name z oryginalnego SKILL.md>
slug: <nazwa folderu>
type: skill-doc
summary: <jedno zdanie, do 90 znaków>
origin: monolith | nexus | global
description: <description z oryginału, bez zmian>
---
```

Treść po frontmatterze: treść oryginalnego `SKILL.md` bez zmian. Bez klucza `deployed` (puste do czasu przeglądu projektów).

- [ ] **Step 3: Skopiuj pliki pomocnicze**

Wszystko, co leży w folderze skilla poza `SKILL.md` (np. `plan-document-reviewer-prompt.md`, `scripts/`), do `Vault/Arsenal/Skills/<slug>/templates/` z zachowaniem struktury podkatalogów (lista w UI pokaże tylko pliki z najwyższego poziomu; wdrożenie skopiuje wszystko).

- [ ] **Step 4: Weryfikacja**

Run: `git -C ~/projects/Brain_7224/NEXUS status --short` i `git -C ~/projects/Brain_7224/NEXUS diff --stat`
Expected: tylko nowe pliki w `Vault/Arsenal/`. W aplikacji (`Alt+7` → Skille i prompty): licznik „pominięto” = 0, liczba skilli = liczba skopiowanych, żaden skill nie jest „wdrożony”.

- [ ] **Step 5: Przekaż użytkownikowi**

Raport: lista skopiowanych skilli, pominięte pliki, trafienia z kroku 1. Dalej użytkownik przechodzi przez projekty i decyduje, gdzie który skill ma być wdrożony (wynik zapisują przyciski „Oznacz jako wdrożone”; ten sam zapis posłuży karcie Mapa, zob. pamięć `mapa-odlozone-decyzje`).

---

## Samoocena planu względem specu

| Wymaganie specu (etap 2)                                              | Zadanie                                    |
| --------------------------------------------------------------------- | ------------------------------------------ |
| §3.1 dokument skilla, frontmatter, `summary` zastępcze                | Task 3 (+ ustalenie 1, spec w Task 12)     |
| §3.1 szablony: lista plików i kopiowanie treści                       | Task 2 (`readTemplates`), Task 10 (UI)     |
| §3.2 prompty z `Knowledge/prompty/`, filtr po modelu i projekcie      | Task 3, 8, 10                              |
| §3.3 widok: chipy projektów z `deployed`, filtry, panel szczegółów    | Task 8, 10                                 |
| §3.4 wdrożenie w całości / zredagowane, „Oznacz jako wdrożone”        | Task 4, 5, 7, 10                           |
| §3.4 lista projektów z `listProjects()`, projekty work, ostrzeżenie   | Task 3, 4, 10                              |
| §3.5 migracja skilli (zadanie agenta)                                 | Task 13                                    |
| §6 błędy: uszkodzony `skill.md` pomijany z licznikiem, ścieżki Vaulta | Task 3 (`skipped`), `vault-fs` (walidacja) |
| §6 test architektury osobnym commitem                                 | Task 1                                     |
| §7 zakładki karty dostosowane                                         | Task 11 (ustalenie 5)                      |
| §9 „Do sprawdzenia”: skille NEXUS skanujące `Vault/`                  | Task 13 krok 1                             |

Spójność nazw: `readSkillFiles`, `readPromptFiles`, `readTemplates`, `writeDeployed` (repo); `listArsenal`, `getDeployInstructions`, `markDeployed`, `buildDeployCommand`, `buildAdaptPrompt`, `parseDeployments`, `truncate`, `firstSentence`, `firstBodyLine` (serwis); `getCatalog`, `getDeployInstructions`, `postDeployed` (router); `CatalogDtoSchema`, `DeployQuerySchema`, `toCatalogDto`, `toEntryDto`, `toInstructionsDto` (schemas); `useArsenal`, `filterEntries`, `promptModels`, `isFiltered`, `projectName` (UI). Handler routera i funkcja serwisu `getDeployInstructions` mają tę samą nazwę w osobnych modułach (router woła `services.getDeployInstructions`), jak w `bc_nexus_docs`.
