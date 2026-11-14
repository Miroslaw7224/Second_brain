# Karta Kodeks, część B: czytnik i checklisty. Plan implementacji

> **Dla agentów wykonujących:** WYMAGANY PODSKILL: superpowers:subagent-driven-development (zalecany) albo superpowers:executing-plans. Kroki mają składnię checkboxów (`- [ ]`).

**Cel:** Karta Kodeks (`Alt+9`) czyta `Vault/Knowledge/kodeks.md`, pokazuje reguły MUST/SHOULD z wyszukiwarką i filtrem, spis treści oraz ostrzeżenia parsera, a do tego uruchamia i odhacza checklisty z jednolinijkową notatką, zapisując zdarzenia w dzienniku JSONL. Wszystkie elementy makiety `docs/mockups/karty/cards/09-kodeks.html` (poza paskiem trybów demo) trafiają do pierwszej wersji; co okaże się zbędne, usuwamy po obejrzeniu w przeglądarce.

**Architektura:** Nowy kontekst `contexts/bc_codex/` (pięć plików wg ADR-021). `repositories.ts` jako jedyny czyta `kodeks.md` i dopisuje do `Checklists/RRRR-MM.jsonl` (osobny katalog dla `owner: work` za `assertWorkAccess`). `services.ts` zawiera parser reguł, odtwarzanie stanu z dziennika i kolejkę zapisów. Do `lib/nexus/vault-fs.ts` dochodzą dwie małe funkcje (dopisanie linii, `mtime`). UI w `src/features/codex/` importuje z kontekstu tylko `schemas`; karta jest widokiem samodzielnym (`CardTarget` `{ kind: "codex" }`), tak jak Mapa.

**Stos:** Next.js 14, TypeScript, zod, Vitest + Testing Library (`tests/unit/**`), `markdown-it` przez istniejące `lib/markdown/html-markdown.ts` (`html: false`).

**Spec:** `docs/superpowers/specs/2026-11-12-karta-kodeks-design.md` §4, §5, §8 (część B i treść z części C z makiety). Wszystkie komendy z katalogu `~/projects/Brain_7224/Monolith`. Zgodnie z CLAUDE.md testy, lint, typecheck i build uruchamia `cursor` (`scripts/ask-helper.sh --role task --tier light --approve-allowed cursor "..."`) i zwraca „przeszło” albo listę `plik:linia + przyczyna`; w krokach podano same komendy. Wyszukiwanie w wielu plikach i review diffa zleca się `agy`. Zmiany `tests/unit/architecture.static.test.ts` idą osobnym commitem, nigdy razem z kodem.

---

## Ustalenia z odczytu kodu (zmieniają albo uzupełniają założenia specu)

1. **Renderer Markdowna: `markdown-it`, nie `react-markdown`.** Spec §4.4 wymienia `react-markdown` + `remark-gfm`, ale repo ma już `markdown-it` z `html: false` (`lib/markdown/html-markdown.ts:22`, użyty w `NexusDocView.tsx`). Brak nowej zależności. Do specu w Task 0.
2. **Parser i dziennik żyją w `contexts/bc_codex/services.ts`, nie w `lib/nexus/codex.ts` i `lib/nexus/checklists.ts`.** Spec §4.4 pochodzi sprzed ADR-021 (reguły domeny w `services`). `lib/nexus/` dostaje tylko małe prymitywy I/O (Task 2).
3. **W `lib/nexus/` nie ma pomocnika dopisywania linii ani odczytu `mtime`.** Spec §4.2 zakładał, że istnieje. `appendRecord` z `record-helpers.ts` dotyczy list YAML. Dodajemy `appendVaultLine` i `vaultFileMtimeMs` do `vault-fs.ts` (Task 2).
4. **`allowWork` wolno wpisać tylko w `lib/nexus/vault-fs.ts` i `lib/workGuard.ts`** (`tests/unit/allow-work.static.test.ts`). Repozytorium woła `assertWorkAccess()` z `lib/workGuard` i przekazuje zwróconą wartość dalej, bez wpisywania słowa `allowWork`. Dziś nikt w `contexts/` jeszcze tego nie robi: Task 6 sprawdza, czy test reguły 5 (`lib/nexus` tylko z `repositories`/`workGuard`) przepuszcza import `lib/workGuard` z repozytorium; jeśli nie, zmiana testu idzie osobnym commitem przed kodem.
5. **Nowy importer `vault-fs`:** `contexts/bc_codex/repositories` trafia do `VAULT_FS_IMPORTERS` w teście architektury (`tests/unit/architecture.static.test.ts:491`), osobnym commitem przed kodem (Task 1; test czerwony do Task 6).
6. **Czwarty typ zdarzenia `end`.** Makieta ma przycisk „Zapisz sesję”, a spec zakłada zapis po każdym zdarzeniu. `end` (z polami `done`, `total`) zamyka uruchomienie: po nim panel zaczyna nowe uruchomienie. Do specu §4.2 w Task 0.
7. **Uruchomienie powstaje przy pierwszym zdarzeniu.** Makieta nie ma przycisku „Rozpocznij”. Klient przy pierwszej interakcji (odhaczenie, notatka) wysyła najpierw `start` (serwer nadaje `run` i `ts`), potem właściwe zdarzenie. Pole „Zadanie” (opis) jest edytowalne przed pierwszą interakcją.
8. **Pominięte względem makiety (świadomie):** pasek trybów demo (`btn-mode-*`, tylko makieta) oraz chipy „Projekt/Gałąź” w pasku pliku (ShellStatusBar pod każdą kartą już je pokazuje; zob. `src/features/home/ShellStatusBar.tsx`). `projectId` w zdarzeniach zostaje opcjonalny i w v1 UI go nie ustawia. Wszystko inne z makiety jest w planie.
9. **Treść `kodeks.md` (część C) pochodzi z makiety:** 11 reguł (TDD-1..2, ASERCJE-1..3, DOWODY-1..2, ZAKRES-1..2, AGENT-1..2) i dwie checklisty (DoD: 6 punktów, Przed PR: 4 punkty). `ZAPIS-1` z propozycji w specu §5 **nie** wchodzi do pliku, dopóki użytkownik jej nie zatwierdzi. Plik leży w repo NEXUS (osobne repo, osobny commit).
10. **Po wdrożeniu nie zostaje żadna zaślepka.** `CardTarget` `placeholder` i `CardPlaceholder.tsx` stają się martwym kodem; Task 10 je usuwa (testy: dziś `CardPlaceholder.test.tsx`, `cards.test.ts:31`, `useCardNavigation.test.ts:28-30, 84-101` zakładają Kodeks jako zaślepkę).

## Mapa plików

| Plik                                                                                                                                                      | Rola                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `lib/nexus/vault-fs.ts` (zmiana)                                                                                                                          | `appendVaultLine`, `vaultFileMtimeMs`                                                     |
| `contexts/bc_codex/models.ts` (nowy)                                                                                                                      | typy domeny, stałe ścieżek                                                                |
| `contexts/bc_codex/repositories.ts` (nowy)                                                                                                                | odczyt `kodeks.md` + `mtime`, odczyt i dopisywanie dziennika (strefy `personal` / `work`) |
| `contexts/bc_codex/services.ts` (nowy)                                                                                                                    | `parseCodex`, `replayJournal`, `getCodex`, `getChecklistState`, `recordEvent` (kolejka)   |
| `contexts/bc_codex/schemas.ts` (nowy)                                                                                                                     | zod wejścia (`ChecklistEventInputSchema`), DTO, mapery                                    |
| `contexts/bc_codex/router.ts` (nowy)                                                                                                                      | `getCodex`, `getChecklists`, `postChecklistEvent`                                         |
| `app/api/nexus/codex/route.ts`, `app/api/nexus/checklists/route.ts` (nowe)                                                                                | tylko re-eksport handlerów                                                                |
| `src/features/codex/codex.css` (nowy)                                                                                                                     | style przeniesione z makiety (`<style>` L15-741, bez stylów paska demo)                   |
| `src/features/codex/codexFilters.ts` (nowy)                                                                                                               | czysta logika: filtr poziomu, wyszukiwanie, liczniki                                      |
| `src/features/codex/useCodex.ts`, `useChecklistRun.ts` (nowe)                                                                                             | pobieranie kodeksu (odświeżanie `mtime`), stan uruchomienia i zapis zdarzeń               |
| `src/features/codex/CodexView.tsx`, `CodexToc.tsx`, `CodexRules.tsx`, `ChecklistPanel.tsx`, `CodexAlerts.tsx`, `CodexStates.tsx`, `CodexToast.tsx` (nowe) | widok i jego części                                                                       |
| `src/features/cards/cards.ts`, `useCardNavigation.ts`, `src/App.tsx` (zmiany)                                                                             | wariant `{ kind: "codex" }`, `codexOpen`, render `CodexView`                              |
| `NEXUS/Vault/Knowledge/kodeks.md`, `NEXUS/Vault/Knowledge/_index.md` (osobne repo)                                                                        | treść kodeksu i wpis w indeksie                                                           |

---

### Task 0: Korekta specu (osobny commit, tylko dokumentacja)

**Files:** Modify: `docs/superpowers/specs/2026-11-12-karta-kodeks-design.md` (§4.2, §4.4), `docs/superpowers/specs/2026-11-11-asystent-lokalny-nexus-design.md` (§6.6, już dopisane o Zadaniach), `docs/mockups/karty/STAN-W-KODZIE.md`.

- [ ] **Step 1:** W §4.2 specu Kodeksu dopisz czwarty typ `end` (`done`, `total`, zamyka uruchomienie) oraz regułę „uruchomienie powstaje przy pierwszym zdarzeniu” (ustalenia 6 i 7).
- [ ] **Step 2:** W §4.4 zamień `react-markdown`/`remark-gfm` na `markdown-it` przez `lib/markdown/html-markdown.ts` i przenieś parser i dziennik z `lib/nexus/codex.ts`/`checklists.ts` do `contexts/bc_codex/services.ts` (ustalenia 1 i 2). Dopisz w §4.4, że `lib/nexus/vault-fs.ts` dostaje `appendVaultLine` i `vaultFileMtimeMs`.
- [ ] **Step 3:** Dopisz w specu nową sekcję „Odstępstwa od makiety” z ustaleniem 8.
- [ ] **Step 4:** Commit (razem z już zmienionymi w tej sesji sekcją o Zadaniach/Projektach w specu nadrzędnym i propozycją `ZAPIS-1`):

```bash
git add docs/superpowers/specs docs/mockups/karty/STAN-W-KODZIE.md docs/superpowers/plans/2026-11-14-karta-kodeks-czesc-b.md
git commit -m "docs(kodeks): plan części B, korekta specu, podział Zadania/Projekty, propozycja ZAPIS-1"
```

### Task 1: Test architektury, osobny commit (czerwony do Task 6)

**Files:** Modify: `tests/unit/architecture.static.test.ts` (tablica `VAULT_FS_IMPORTERS`, ok. L491-503).

- [ ] **Step 1:** Dodaj `"contexts/bc_codex/repositories",` do `VAULT_FS_IMPORTERS` w porządku alfabetycznym (po `bc_board`, przed `bc_calendar`: kolejność `bc_arsenal`, `bc_board`, `bc_calendar`, `bc_codex`, `bc_inbox`...).
- [ ] **Step 2:** `npx vitest run tests/unit/architecture.static.test.ts`. Oczekiwane: FAIL (wpis dotyczy pliku, którego jeszcze nie ma). Wynik wpisz w opisie commita.
- [ ] **Step 3:** Commit tylko tego pliku:

```bash
git add tests/unit/architecture.static.test.ts
git commit -m "test(architektura): bc_codex/repositories na liście importerów vault-fs (czerwony do implementacji)"
```

### Task 2: Prymitywy I/O w `lib/nexus/vault-fs.ts`

**Files:** Modify: `lib/nexus/vault-fs.ts`; Test: `tests/unit/lib/nexus/vault-fs-append.test.ts` (nowy, wzoruj się na `vault-fs.test.ts`, korzysta z `setupTempVault` z `tests/unit/helpers/tempVault.ts`).

Sygnatury (małe, współdzielone, więc pełny kod):

```ts
/** `mtime` pliku w ms (liczba), `null` gdy plik nie istnieje. Ścieżka przez resolveInsideVault. */
export function vaultFileMtimeMs(rel: string, opts?: VaultFsOptions): number | null {
  const abs = resolveInsideVault(rootOf(opts), rel, opts);
  try {
    return fs.statSync(abs).mtimeMs;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Dopisuje jedną linię (bez `\n` w środku) i kończy ją `\n`. Gdy istniejący plik nie kończy się `\n`
 * (niedokończona linia z innego procesu), najpierw dopisuje `\n`, żeby nowa linia nie skleiła się ze starą.
 * Tworzy katalogi i plik. Tryb dopisywania, bez przepisywania pliku.
 */
export function appendVaultLine(rel: string, line: string, opts?: VaultFsOptions): void {
  if (line.includes("\n") || line.includes("\r"))
    throw new Error("Linia dziennika nie może zawierać końca linii");
  const abs = resolveInsideVault(rootOf(opts), rel, opts);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  let prefix = "";
  try {
    const size = fs.statSync(abs).size;
    if (size > 0) {
      const fd = fs.openSync(abs, "r");
      try {
        const last = Buffer.alloc(1);
        fs.readSync(fd, last, 0, 1, size - 1);
        if (last[0] !== 0x0a) prefix = "\n";
      } finally {
        fs.closeSync(fd);
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  fs.appendFileSync(abs, `${prefix}${line}\n`, { encoding: "utf8" });
}
```

- [ ] **Step 1 (czerwony):** Napisz testy i uruchom `npx vitest run tests/unit/lib/nexus/vault-fs-append.test.ts` (FAIL: funkcji nie ma). Przypadki:
  1. `appendVaultLine("Checklists/2026-11.jsonl", '{"a":1}')` na pustym vaulcie tworzy katalog i plik; `read` daje `'{"a":1}\n'`.
  2. Druga linia `'{"a":2}'` daje `'{"a":1}\n{"a":2}\n'` (nie przepisuje pierwszej: sprawdź, że `ino` pliku się nie zmienił).
  3. Plik `'{"a":1}'` bez końcowego `\n` (zapisany przez `write`) + dopisanie `'{"a":2}'` daje `'{"a":1}\n{"a":2}\n'`.
  4. Linia z `\n` w środku rzuca błąd, plik bez zmian.
  5. `appendVaultLine("Work/Checklists/x.jsonl", "{}")` bez `allowWork` rzuca `WorkAreaBlockedError`.
  6. `vaultFileMtimeMs("nie-ma.md")` daje `null`; po `write` daje liczbę > 0.
  7. `appendVaultLine("../x", "{}")` rzuca `PathOutsideVaultError`.
- [ ] **Step 2:** Dodaj funkcje do `vault-fs.ts` (kod wyżej, pod `listVaultFilesRecursive`).
- [ ] **Step 3 (zielony):** `npx vitest run tests/unit/lib/nexus` (cały katalog: pilnuje też `static.test.ts`, który skanuje `vault-fs.ts` pod kątem zakazanych słów i procesów).
- [ ] **Step 4:** Commit:

```bash
git add lib/nexus/vault-fs.ts tests/unit/lib/nexus/vault-fs-append.test.ts
git commit -m "feat(nexus): appendVaultLine i vaultFileMtimeMs w vault-fs"
```

### Task 3: Treść `kodeks.md` w NEXUS (osobne repo)

**Files:** Create: `../NEXUS/Vault/Knowledge/kodeks.md`; Modify: `../NEXUS/Vault/Knowledge/_index.md`.

- [ ] **Step 1: Wyciąg treści zleć `agy`** (CLAUDE.md: czytanie wielu linii dla znalezienia treści; wynik wraca jako gotowy tekst):

```bash
scripts/ask-helper.sh --role advice --fresh --max-lines 0 agy "Tylko odczyt. Z docs/mockups/karty/cards/09-kodeks.html (sekcje reguł L985-1390 i checklist L1408-1960) wyciągnij treść do pliku Markdown w formacie: frontmatter (name: Kodeks pracy nad kodem, slug: kodeks, type: knowledge, categories: [engineering, guardrails], status: active); nagłówek '# Kodeks pracy nad kodem'; sekcje '## 1. Zasady kardynalne TDD' itd. w kolejności i z tytułami z makiety; każda reguła jako JEDNA linia '- **[ID] MUST|SHOULD** treść' (ID i poziom z makiety), a punkty podrzędne z makiety jako WCIĘTE co najmniej 2 spacjami linie '  - ...' pod regułą; HTML zamień na Markdown (<b>→**, <code>→\`\`, <strong>→**), bez zmiany sensu i brzmienia; na końcu '## Checklisty' z '### Definition of Done' i '### Przed PR' jako punktami '- [ ] [ID] opis' (wszystkie punkty i odwołania z makiety, także odwołanie do reguły, której nie ma w rejestrze: wypisz je na końcu osobno jako listę 'odwołania bez reguły'). Zwróć sam gotowy plik w bloku kodu oraz osobno liczby: reguł MUST, SHOULD, punktów DoD, punktów Przed PR."
```

- [ ] **Step 2:** Zapisz zwrócony plik jako `../NEXUS/Vault/Knowledge/kodeks.md` (poprawki brzmienia zrób sam). Zweryfikuj ręcznie (nie delegując) komendą `grep -cE '^- \*\*\[[A-Z][A-Z0-9]*-[0-9]+\] (MUST|SHOULD)\*\*' ../NEXUS/Vault/Knowledge/kodeks.md`. Oczekiwane: `11` (6 MUST, 5 SHOULD wg `data-level` w makiecie; liczniki 7/4 i „2 MUST” przy TDD w makiecie są błędne). Punkty checklist: `10`. Odwołanie `[SEC-4]` z makiety (reguły SEC nie ma) zostało usunięte, punkt został bez odwołania: kodeks nie ma demonstracyjnych błędów. **Wykonane 2026-11-14, commit `3ce7f65` w NEXUS.**
- [ ] **Step 3:** Dopisz wpis w `../NEXUS/Vault/Knowledge/_index.md` w formacie sąsiednich wpisów (skopiuj format wiersza `ai-coding-guardrails`) z `[[ai-coding-guardrails]]` jako powiązaniem; w treści `kodeks.md` dodaj linię `Powiązanie: [[ai-coding-guardrails]]` pod nagłówkiem H1 (makieta pokazuje ją w bloku metadanych spisu treści).
- [ ] **Step 4:** Commit w repo NEXUS (`git -C ../NEXUS`): `feat(knowledge): kodeks pracy nad kodem (11 reguł, 2 checklisty)`. **Nie pushuj bez zgody użytkownika.**

### Task 4: Parser reguł i checklist (`services.ts`, część czysta)

**Files:** Create: `contexts/bc_codex/models.ts`, `contexts/bc_codex/services.ts` (na razie tylko `parseCodex`); Test: `tests/unit/contexts/bc_codex/parseCodex.test.ts`.

Interfejsy (`models.ts`):

```ts
export type RuleLevel = "MUST" | "SHOULD";
export type CodexRule = { id: string; level: RuleLevel; text: string; line: number };
export type SectionBlock = { kind: "rule"; ruleId: string } | { kind: "text"; text: string };
export type CodexSection = { id: string; title: string; blocks: SectionBlock[] };
export type ChecklistItem = { id: string; text: string; ruleRefs: string[] };
export type Checklist = { id: string; title: string; items: ChecklistItem[] };
export type CodexWarning = { kind: "duplicate-id" | "unknown-ref"; message: string; line: number };
export type ParsedCodex = {
  title: string;
  sections: CodexSection[];
  rules: CodexRule[];
  checklists: Checklist[];
  warnings: CodexWarning[];
  wikilinks: string[];
};
export const CODEX_PATH = "Knowledge/kodeks.md";
```

`parseCodex(text: string): ParsedCodex` (czysta, bez I/O). Reguły działania:

1. Frontmatter (`---` na pierwszej linii do następnego `---`) pomijany; numeracja linii (`line`) liczy się od początku pliku.
2. `# Tytuł` → `title`; `## Nagłówek` otwiera sekcję (`id` = `sec-` + `slugify(tytuł bez prefiksu "N. ")` z `lib/nexus/slug.ts`); nagłówek pasujący do `/^(\d+\.\s*)?Checklisty$/i` przełącza w tryb checklist; w nim `### Nazwa` otwiera checklistę (`id` = `slugify(nazwa)`).
3. Wzorzec reguły (z §4.1): `^- \*\*\[([A-Z][A-Z0-9]*-[0-9]+)\] (MUST|SHOULD)\*\*[ \t]+(.+)$`. Linie wcięte co najmniej 2 spacjami (po regule) należą do `text` (wcięcie 2 spacji obcięte, łączone `\n`). Zagnieżdżone punkty są częścią tekstu, nie osobnymi regułami.
4. Linia spoza wzorca w trybie reguł trafia do `blocks` jako `{kind:"text"}` (kolejne zwykłe linie łączone w jeden blok); puste linie rozdzielają bloki; nic nie ginie.
5. Duplikat ID: zostaje pierwsza definicja, drugi wpis daje `warning` `duplicate-id` z numerem linii i **nie** trafia do `rules` ani `blocks`.
6. Punkt checklisty: `^- \[( |x|X)\] (.+)$`; `ruleRefs` = wszystkie `\[([A-Z][A-Z0-9]*-[0-9]+)\]` z tekstu; `id` punktu = `<id checklisty>-<n>` (n od 1). Odwołanie do ID, którego nie ma w `rules`, daje `unknown-ref` (po przejściu całego pliku, linia punktu).
7. `wikilinks`: unikalne `[[nazwa]]` z całego pliku, w kolejności wystąpienia.

- [ ] **Step 1 (czerwony):** napisz `parseCodex.test.ts` i uruchom `npx vitest run tests/unit/contexts/bc_codex/parseCodex.test.ts` (FAIL: brak modułu). Przypadki (tekst wejściowy w teście, oczekiwane wartości):
  1. Poprawna reguła: `"## 1. TDD\n- **[TDD-1] MUST** Brak kodu bez testu\n"` → `rules` = `[{id:"TDD-1", level:"MUST", text:"Brak kodu bez testu", line:2}]`, `sections[0].id === "sec-tdd"`, `sections[0].title === "1. TDD"`.
  2. Kontynuacja: reguła + `"  - podpunkt\n  druga linia\n"` → `text === "Brak kodu bez testu\n- podpunkt\ndruga linia"`, a `rules.length === 1`.
  3. Poziom spoza MUST/SHOULD (`**[TDD-1] MAY**`) i ID z małymi literami (`[tdd-1]`) → `rules` puste, linia w `blocks` jako `text`.
  4. Duplikat: dwie reguły `[TDD-1]` (linie 2 i 5) → `rules.length === 1`, `warnings === [{kind:"duplicate-id", line:5, message: <zawiera "TDD-1">}]`.
  5. Polskie znaki w tytule sekcji (`## 2. Jakość asercji`) → `id === "sec-jakosc-asercji"` (zgodnie z `slugify`; sprawdź w `tests/unit/lib/nexus/slug.test.ts`, że ą→a, ś→s).
  6. Checklisty: `"## Checklisty\n### Definition of Done\n- [ ] [TDD-1] Czerwony test\n- [x] Bez odwołania\n"` + reguła TDD-1 → checklista `id:"definition-of-done"`, 2 punkty, pierwszy `ruleRefs:["TDD-1"]`, `id:"definition-of-done-1"`, drugi `ruleRefs:[]`; brak ostrzeżeń.
  7. Odwołanie `[SEC-4]` bez reguły → `warnings` zawiera `{kind:"unknown-ref", line:<linia punktu>}`.
  8. Frontmatter nie psuje numeracji: dokument z frontmatterem 5-liniowym i regułą w 8. linii daje `line: 8`.
  9. Wikilinki: `"Powiązanie: [[ai-coding-guardrails]] i [[ddd]] i [[ddd]]"` → `["ai-coding-guardrails","ddd"]`.
  10. Pusty plik `""` → pusta struktura (`sections:[]`, `rules:[]`, `checklists:[]`, brak błędu).
- [ ] **Step 2:** Zaimplementuj `models.ts` i `parseCodex` w `services.ts` do zielonych testów.
- [ ] **Step 3:** Test na prawdziwym pliku: jednorazowy test integracyjny `parseCodex(fs.readFileSync(<NEXUS>/Vault/Knowledge/kodeks.md))` **nie** wchodzi do repo (zależność od prywatnego repo); zamiast tego sprawdź ręcznie `node`-owym oneliner w kroku weryfikacji Task 11, że daje 11 reguł i 0 ostrzeżeń.
- [ ] **Step 4:** `npx vitest run tests/unit/contexts/bc_codex` → PASS. Commit: `feat(kodeks): parser reguł i checklist (bc_codex/services)`.

### Task 5: Dziennik zdarzeń (`services.ts`, część czysta) i schematy wejścia

**Files:** Modify: `contexts/bc_codex/models.ts`, `contexts/bc_codex/services.ts`; Create: `contexts/bc_codex/schemas.ts` (część wejściowa); Test: `tests/unit/contexts/bc_codex/replayJournal.test.ts`, `tests/unit/contexts/bc_codex/schemas.test.ts`.

Interfejsy:

```ts
export type OwnerZone = "personal" | "work";
export type ChecklistEvent =
  | {
      run: string;
      ts: string;
      owner: OwnerZone;
      projectId?: string;
      type: "start";
      checklist: string;
      task: string;
    }
  | {
      run: string;
      ts: string;
      owner: OwnerZone;
      projectId?: string;
      type: "toggle";
      item: string;
      checked: boolean;
    }
  | {
      run: string;
      ts: string;
      owner: OwnerZone;
      projectId?: string;
      type: "note";
      item: string;
      text: string;
    }
  | {
      run: string;
      ts: string;
      owner: OwnerZone;
      projectId?: string;
      type: "end";
      done: number;
      total: number;
    };
export type RunState = {
  run: string;
  owner: OwnerZone;
  checklist: string;
  task: string;
  startedAt: string;
  ended: boolean;
  items: Record<string, { checked: boolean; note: string }>;
};
export type JournalState = {
  runs: RunState[];
  eventCount: number;
  skippedLines: number;
  unterminatedTail: boolean;
};
```

`replayJournal(text: string | null): JournalState` (czysta):

1. `null` albo `""` → `{runs:[], eventCount:0, skippedLines:0, unterminatedTail:false}`.
2. Tekst dzielony po `\n`; jeśli nie kończy się `\n`, ostatni fragment jest **ignorowany** i `unterminatedTail: true` (nie liczy się do `skippedLines`).
3. Linia niepoprawna jako JSON albo niezgodna ze schematem zdarzenia (brak `owner`, nieznany `type`, zdarzenie `toggle` bez `run` itd.) → pomijana, `skippedLines += 1`. Puste linie ignorowane bez liczenia.
4. Kolejność zdarzeń = kolejność w pliku (`ts` informacyjnie). Dla pary (run, item) obowiązuje ostatnie `toggle`; ostatnia `note` zastępuje notatkę (`text` pusty czyści). Zdarzenie dla `run`, którego `start` nie ma w pliku, jest liczone w `eventCount`, ale bez `RunState` (nie zgadujemy checklisty).
5. `eventCount` = liczba poprawnych zdarzeń.

Schematy wejścia (`schemas.ts`): `ChecklistEventInputSchema` = unia po `type` bez `ts` (nadaje serwer); `owner` **wymagane** (`z.enum(["personal","work"])`), `run` wymagane dla `toggle|note|end`, niedozwolone dla `start`; `task` max 300 znaków, `note.text` max 300 znaków bez `\n`/`\r`; `item` niepuste; `checklist` niepuste.

- [ ] **Step 1 (czerwony):** testy `replayJournal` i `schemas`. Przypadki replay:
  1. Pusty/`null` → stan pusty.
  2. `start` + 2×`toggle` (item `dod-1` true, potem false) + `note` → `items["dod-1"] = {checked:false, note:"x"}`, `eventCount: 4`.
  3. Dwa uruchomienia (`r1` ended, `r2` otwarty) → `runs.length === 2`, `runs[0].ended === true`, `runs[1].ended === false`.
  4. Linia `{niepoprawny json` w środku → `skippedLines: 1`, reszta odtworzona.
  5. Zdarzenie bez `owner` → pominięte i policzone w `skippedLines`.
  6. Plik bez końcowego `\n` z poprawnym JSON-em w ostatniej linii → ta linia zignorowana, `unterminatedTail: true`, `skippedLines: 0`.
  7. `toggle` dla nieznanego `run` → `eventCount` rośnie, `runs` puste.
  8. Notatka z `text: ""` czyści notatkę.
     Przypadki schematów: `start` bez `owner` → odrzucone; `toggle` bez `run` → odrzucone; `start` z `run` → odrzucone; `note.text` z `\n` → odrzucone; `task` 301 znaków → odrzucone; `owner:"company"` → odrzucone; poprawne zdarzenie każdego typu → przechodzi.
- [ ] **Step 2:** implementacja do zielonych. `npx vitest run tests/unit/contexts/bc_codex`.
- [ ] **Step 3:** Commit: `feat(kodeks): odtwarzanie stanu z dziennika i schematy zdarzeń`.

### Task 6: Repozytorium, usługi z I/O, router, trasy

**Files:** Create: `contexts/bc_codex/repositories.ts`, `contexts/bc_codex/router.ts`, `app/api/nexus/codex/route.ts`, `app/api/nexus/checklists/route.ts`; Modify: `contexts/bc_codex/services.ts`, `contexts/bc_codex/schemas.ts` (DTO + mapery); Test: `tests/unit/contexts/bc_codex/repositories.test.ts`, `services.test.ts`, `router.test.ts`.

Interfejsy:

`repositories.ts` (jedyny dostęp do vaulta):

- `readCodexFile(): { text: string; mtimeMs: number } | null`: `readVaultFile(CODEX_PATH)` + `vaultFileMtimeMs`.
- `readJournal(owner: OwnerZone, month: string): string | null`: `personal` → `Checklists/${month}.jsonl`; `work` → `assertWorkAccess()` (z `@/lib/workGuard`), potem `Work/Checklists/${month}.jsonl` z opcjami zwróconymi przez strażnika.
- `appendJournalLine(owner: OwnerZone, month: string, line: string): void`: ten sam routing; `work` bez pozytywnego `assertWorkAccess()` rzuca `WorkAccessBlockedError` **przed** zapisem.
- `month` walidowany wzorcem `^\d{4}-(0[1-9]|1[0-2])$` w `services` (400 przy błędzie).

`services.ts`:

- `getCodex(): CodexResult`: `{ status: "ok", path, mtimeMs, parsed } | { status: "missing", path } | { status: "config-error", message }` (`VaultConfigError` z `lib/nexus/vault-path` → `config-error`; inne błędy lecą dalej).
- `getChecklistState(month?: string): { month; personal: JournalState; work: JournalState | { blocked: string } }`: `month` domyślnie z `nowIso().slice(0,7)`; `work` przy `WorkAccessBlockedError` → `{ blocked: message }` (strefa personal działa dalej).
- `recordEvent(input: ChecklistEventInput): Promise<ChecklistEvent>`: nadaje `ts = nowIso()`, dla `start` także `run = generateId(...)` (z `lib/nexus/record-helpers`; zbiór zajętych = `run` z bieżącego miesiąca dziennika danej strefy), serializuje do jednej linii `JSON.stringify`, dopisuje przez `appendJournalLine(owner, ts.slice(0,7), line)`. **Kolejka:** zapisy w procesie idą przez łańcuch obietnic (`let tail = Promise.resolve()`; każde wywołanie `tail = tail.then(job, job)`), żeby linie nie przeplatały się; błąd jednego zapisu nie blokuje następnych.
- `events` ze ścieżki `work` **nigdy** nie trafiają do pliku `personal` i odwrotnie (routing wyłącznie z `owner`).

`router.ts`: `getCodex()` → `NextResponse.json(toCodexDto(...))` (status `200` także dla `missing` i `config-error`; DTO ma pole `status`); `getChecklists(request)` czyta `?month=`; `postChecklistEvent(request)` używa `parseBody(request, ChecklistEventInputSchema, { details: false })`, odpowiada `201` ze zdarzeniem (`run` w odpowiedzi dla `start`). Trasy: `export { getCodex as GET } from "@/contexts/bc_codex/router"; export const dynamic = "force-dynamic";` oraz `{ getChecklists as GET, postChecklistEvent as POST }`.

DTO (`schemas.ts`, bezpieczne dla klienta): `CodexDtoSchema` (unia po `status`; `ok` ma `path`, `mtimeMs`, `title`, `sections` (z `blocks`: tekst zwykły, bez HTML), `rules`, `checklists`, `warnings`, `wikilinks`, `counts: { must, should }`), `ChecklistStateDtoSchema`.

- [ ] **Step 1 (czerwony):** testy z `setupTempVault`. Przypadki:
  1. `getCodex()` bez pliku → `{status:"missing", path:"Knowledge/kodeks.md"}`.
  2. Z plikiem (2 reguły) → `status:"ok"`, `counts: {must:1, should:1}`, `mtimeMs` > 0.
  3. Bez `NEXUS_VAULT_PATH` (usuń zmienną w teście; `setupTempVault` przywraca) → `status:"config-error"`.
  4. `recordEvent` `start` (owner personal) tworzy `Checklists/<RRRR-MM>.jsonl` z jedną linią JSON zawierającą `run` (niepusty), `ts`, `owner:"personal"`; zwrócone zdarzenie ma ten sam `run`.
  5. Po `start` kolejne `toggle` z tym `run` → `getChecklistState().personal.runs[0].items[...]` odzwierciedla ostatni `toggle`.
  6. **Prywatność:** `recordEvent` `owner:"work"` w vaulcie, w którym `Work/` nie jest ignorowane przez git (zwykły katalog tmp bez repo) → rzuca `WorkAccessBlockedError`; plik `Work/Checklists/...` nie powstał, a `Checklists/` nie ma żadnego pliku. Wariant z poprawnym repo git (użyj `tests/unit/helpers/tempGit.ts`; `git init` w korzeniu vaulta, `.gitignore` z `/Work/` — sprawdź ścieżkę ignorowania względem `PROBE = "Work/probe.yaml"` w `lib/workGuard.ts`, bo strażnik testuje wzorzec względem korzenia vaulta) → zdarzenie ląduje w `Work/Checklists/<RRRR-MM>.jsonl`, a `Checklists/` pozostaje pusty.
  7. `getChecklistState` przy zablokowanym `work` → `work: {blocked: <komunikat>}`, `personal` normalnie.
  8. Kolejka: `await Promise.all([...20 × recordEvent(toggle)])` → plik ma dokładnie 20 poprawnych linii JSON (żadna nie sklejona), `replayJournal` daje `skippedLines: 0`.
  9. `getChecklistState("2026-13")` rzuca błąd walidacji o kodzie 400 (`DomainError`).
  10. Router: `POST` bez `owner` → 400 (bez zapisu pliku); `POST start` → 201 z `run`; `GET /api/nexus/codex` zwraca `status` z DTO (mock `services` jak w `tests/unit/contexts/bc_map/router.test.ts`).
- [ ] **Step 2:** implementacja do zielonych: `npx vitest run tests/unit/contexts/bc_codex`.
- [ ] **Step 3:** `npx vitest run tests/unit/architecture.static.test.ts tests/unit/allow-work.static.test.ts`. Oczekiwane: PASS (Task 1 przestaje być czerwony). Jeśli reguła 5 nie przepuszcza `lib/workGuard` z `repositories`, **zatrzymaj się**: poprawka testu idzie osobnym commitem przed kodem, a opis powodu wraca do użytkownika (CLAUDE.md: pękający test naprawia się kodem; jeśli reguła nie przewiduje tej drogi, to decyzja użytkownika).
- [ ] **Step 4:** Commit: `feat(kodeks): repozytorium, usługi, router i trasy /api/nexus/codex, /api/nexus/checklists`.

### Task 7: UI, część czysta i hooki

**Files:** Create: `src/features/codex/codexFilters.ts`, `useCodex.ts`, `useChecklistRun.ts`; Test: `tests/unit/features/codex/codexFilters.test.ts`, `useCodex.test.tsx`, `useChecklistRun.test.tsx`.

Interfejsy:

```ts
export type LevelFilter = "all" | "must" | "should";
export function filterCodex(
  sections: CodexSectionDto[],
  rules: CodexRuleDto[],
  level: LevelFilter,
  query: string
): CodexSectionDto[];
// zwraca sekcje z blokami reguł spełniającymi filtr; sekcje bez widocznych reguł są pomijane; bloki `text` zostają tylko, gdy query jest pusty i level === "all".
export function countLevels(rules: CodexRuleDto[]): { all: number; must: number; should: number };
export function checklistProgress(
  items: { id: string }[],
  run: RunStateDto | undefined
): { done: number; total: number; pct: number };
```

- `useCodex(apiFetch)`: ładuje `GET /api/nexus/codex` (parsuje `CodexDtoSchema`), zwraca `{ state: "loading" | "ok" | "missing" | "config-error" | "error", data, reload }`; odświeża po `visibilitychange`/`focus` oraz co 15 s (`setInterval`); przy niezmienionym `mtimeMs` nie zmienia referencji danych (brak migotania).
- `useChecklistRun(apiFetch, { checklist, owner, task })`: ładuje `GET /api/nexus/checklists`, wybiera ostatnie nieukończone (`ended:false`) uruchomienie dla pary (checklista, owner); `toggle(itemId, checked)`, `setNote(itemId, text)`, `end()`; przy pierwszej interakcji bez uruchomienia wysyła najpierw `start` (ustalenie 7). Po każdym POST odświeża stan z serwera. Zwraca `{ run, progress, eventCount, skippedLines, workBlocked, error, ... }`.

- [ ] **Step 1 (czerwony):** testy czystych funkcji: `filterCodex` — poziom `must` zostawia tylko MUST; zapytanie `"tdd-1"` (bez względu na wielkość liter) dopasowuje po ID; zapytanie `"czerwon"` dopasowuje po tekście; sekcja bez dopasowań znika; blok tekstowy znika przy aktywnym filtrze; `countLevels` zlicza (np. 6/5/11); `checklistProgress` z 6 punktami i 4 odhaczonymi daje `{done:4,total:6,pct:67}` (zaokrąglenie `Math.round`); bez `run` daje `{done:0,total:6,pct:0}`; puste `items` daje `pct:0` (bez dzielenia przez zero). Testy hooków z `fetch` zamockowanym wg wzorca `tests/unit/features/map/`: pierwszy `toggle` bez uruchomienia wysyła kolejno `POST start` i `POST toggle`; drugi `toggle` wysyła tylko `POST toggle` z tym samym `run`; odpowiedź 403 z `work` ustawia `error` z komunikatem serwera, bez wyjątku; `useCodex` z odpowiedzią `{status:"missing"}` zwraca stan `missing`.
- [ ] **Step 2:** implementacja do zielonych. `npx vitest run tests/unit/features/codex`.
- [ ] **Step 3:** Commit: `feat(kodeks): filtry, hooki kodeksu i uruchomień checklist`.

### Task 8: UI, komponenty według makiety

**Files:** Create: `src/features/codex/codex.css`, `CodexView.tsx`, `CodexToc.tsx`, `CodexRules.tsx`, `ChecklistPanel.tsx`, `CodexAlerts.tsx`, `CodexStates.tsx`, `CodexToast.tsx`; Test: `tests/unit/features/codex/CodexView.test.tsx`, `ChecklistPanel.test.tsx`.

Układ i klasy (`kod-*`) przenieś 1:1 z makiety. **CSS:** skopiuj `<style>` z `docs/mockups/karty/cards/09-kodeks.html` L15-741 do `codex.css`, usuń style paska demo (zaczynają się od klas `demo-*`/`#btn-mode-*`; sprawdź `grep -n "demo" docs/mockups/karty/cards/09-kodeks.html`); import `./codex.css` na górze `CodexView.tsx` (wzór: `MapView.tsx:4`). Zmienne `--c-kodeks` i motyw `[data-card="kodeks"]` już istnieją (część A).

Odwzorowanie elementów makiety (wszystkie wchodzą):

| Element makiety                                                            | Komponent / zachowanie                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nagłówek: eyebrow `Alt+9 · Kodeks`, tytuł, podtytuł z ścieżką              | `CodexView`                                                                                                                                                                                                                                  |
| „Odśwież mtime”, „Kopiuj ścieżkę”                                          | `reload()` z `useCodex` + toast „Odświeżono: plik aktualny/zmieniony”; `navigator.clipboard.writeText("Vault/Knowledge/kodeks.md")` + toast (błąd schowka → toast z błędem)                                                                  |
| Pasek pliku: „Tylko do odczytu”, ścieżka, `mtime`                          | `CodexView`; data z `mtimeMs` w `pl-PL` (`toLocaleString("pl-PL", {dateStyle:"full", timeStyle:"medium"})`)                                                                                                                                  |
| 4 kafle: reguły (MUST/SHOULD), uruchomiona checklista, dziennik, walidacja | `CodexView`; kafel 2: `done / total` i nazwa wybranej checklisty z `useChecklistRun`; kafel 3: `eventCount` i nazwa pliku `RRRR-MM.jsonl`; kafel 4: liczba ostrzeżeń (parsera + `skippedLines` + `unterminatedTail`), kolor `--warn` gdy > 0 |
| Panel ostrzeżeń (duplikat ID, brakująca reguła, uszkodzone linie)          | `CodexAlerts`; znika, gdy brak ostrzeżeń; każde z tagiem (`Zduplikowany identyfikator`, `Brakująca reguła`, `Dziennik zdarzeń`)                                                                                                              |
| Spis treści z odznakami i blokiem metadanych                               | `CodexToc`; link = kotwica `#sec-...`; odznaka = `N MUST · M SHOULD` (sekcja checklist: `N zestawy`); aktywny link ustawia klik i `IntersectionObserver`; metadane: plik, `wikilinks` z `ParsedCodex` jako „Powiązanie”, parser              |
| Wyszukiwarka + filtr Wszystkie/MUST/SHOULD z licznikami                    | `CodexRules` + `filterCodex`/`countLevels`; `aria-pressed` na przyciskach filtra                                                                                                                                                             |
| Karta reguły: kotwica `#ID`, odznaka MUST/SHOULD, chip, treść              | `CodexRules`; treść przez `markdownToHtml` z `lib/markdown/html-markdown.ts` i `dangerouslySetInnerHTML` (jak `NexusDocView.tsx`); chip = prefiks ID (np. `TDD`)                                                                             |
| Link `[ID]` w checkliście przewija i podświetla regułę                     | `ChecklistPanel`: `scrollIntoView({block:"center"})` + klasa podświetlenia na 2 s; odwołanie do nieistniejącej reguły: wyszarzone z `title` „brak reguły w rejestrze”                                                                        |
| Zakładki checklist (DoD / Przed PR) z tytułem uruchomienia                 | `ChecklistPanel`, zakładki z `checklists` kodeksu                                                                                                                                                                                            |
| Przełącznik `owner` personal/work + informacja o strefie zapisu            | `ChecklistPanel`; tekst z `personal`: ścieżka `Vault/Checklists/<RRRR-MM>.jsonl`; `work`: „[Dane z firmy] Vault/Work/Checklists/ …”; gdy `workBlocked`, komunikat serwera i wyłączone odhaczanie w `work`                                    |
| Pole „Zadanie” (opis)                                                      | pole tekstowe (max 300) w `ChecklistPanel`; wysyłane w `start`; po rozpoczęciu uruchomienia tylko do odczytu                                                                                                                                 |
| Pasek postępu `N z M odhaczone`, `%`                                       | `checklistProgress`, `role="progressbar"` z `aria-valuenow`                                                                                                                                                                                  |
| Punkt: checkbox, etykieta, znacznik statusu, pole notatki                  | zapis przez `toggle`/`setNote`; notatka wysyłana na `blur` albo Enter, nie po każdym znaku                                                                                                                                                   |
| „Zapisz sesję”                                                             | `end()` (zdarzenie `end` z `done`/`total`) + toast; po sukcesie panel pokazuje puste, nowe uruchomienie                                                                                                                                      |
| Toasty                                                                     | `CodexToast` (lokalny, `aria-live="polite"`, znika po 3 s); bez nowej zależności                                                                                                                                                             |
| Widok „Brak pliku kodeksu” z szablonem i „Kopiuj instrukcję”               | `CodexStates` dla `status:"missing"`; szablon (blok kodu): `mkdir -p`, `cat <<'EOF'`, frontmatter, reguły **z wcięciami podpunktów (2 spacje)** i jedna checklista; kopiuje do schowka                                                       |
| Widok „Błąd konfiguracji NEXUS_VAULT_PATH” z „Sprawdź ponownie”            | `CodexStates` dla `config-error`; przycisk wywołuje `reload()`                                                                                                                                                                               |
| Pasek trybów demo                                                          | **pominięty** (ustalenie 8)                                                                                                                                                                                                                  |

- [ ] **Step 1 (czerwony):** testy komponentów (Testing Library, `apiFetch` jako `vi.fn` z odpowiedziami DTO). Przypadki:
  1. `CodexView` z DTO (2 reguły: MUST i SHOULD) pokazuje 4 kafle, `Wszystkie (2)`, `MUST (1)`, `SHOULD (1)`; klik `MUST (1)` ukrywa regułę SHOULD.
  2. Wpisanie `tdd-1` w wyszukiwarkę zostawia jedną regułę; wyniki puste → komunikat „Brak reguł dla filtra”.
  3. Reguła z treścią `<script>alert(1)</script>` w tekście renderuje się jako tekst (brak elementu `script` w DOM).
  4. `status:"missing"` pokazuje widok „Brak pliku kodeksu” i przycisk kopiujący szablon (`navigator.clipboard.writeText` wywołane tekstem zawierającym `Knowledge/kodeks.md` i `- **[TDD-1] MUST**`); `status:"config-error"` pokazuje komunikat z serwera.
  5. Ostrzeżenia: DTO z `duplicate-id` i `skippedLines: 2` pokazuje panel z 2 pozycjami (1 z parsera, 1 zbiorcza za uszkodzone linie dziennika) i kafel walidacji `2` (kafel = liczba pozycji panelu: ostrzeżenia parsera + 1, gdy `skippedLines > 0` + 1, gdy `unterminatedTail`); bez ostrzeżeń panel nie istnieje, a kafel pokazuje `0`.
  6. `ChecklistPanel`: klik checkboxa wysyła `POST start` (z polem `task`) i `POST toggle`; pasek pokazuje `1 z N odhaczone`; po przełączeniu na `work` z `workBlocked` odhaczanie jest wyłączone i widać komunikat.
  7. Wpisanie notatki i `blur` wysyła `POST note` z `text`; Enter robi to samo, a pusta zmiana (ten sam tekst) niczego nie wysyła.
  8. Klik `[TDD-1]` wywołuje `scrollIntoView` na elemencie `#rule-tdd-1` (mock `Element.prototype.scrollIntoView`); odwołanie do nieistniejącej reguły nie jest linkiem.
  9. „Zapisz sesję” wysyła `POST end` z `done` i `total` i czyści panel.
- [ ] **Step 2:** implementacja do zielonych: `npx vitest run tests/unit/features/codex`.
- [ ] **Step 3:** Commit: `feat(kodeks): widok karty Kodeks wg makiety 09-kodeks`.

### Task 9: Podpięcie karty (`cards.ts`, nawigacja, `App.tsx`)

**Files:** Modify: `src/features/cards/cards.ts`, `src/features/cards/useCardNavigation.ts`, `src/App.tsx`; Test: `tests/unit/features/cards/cards.test.ts` (L31), `useCardNavigation.test.ts` (L28-30, 84-101).

- [ ] **Step 1 (czerwony):** zmień asercje: `getCard("kodeks").target` ma być `{ kind: "codex" }`; `useCardNavigation`: `selectCard("kodeks")` ustawia `codexOpen: true`, `placeholder: null`, `activeCard: "kodeks"`, adres kończy się `#kodeks`; przejście Projekty → Kodeks zachowuje poprawną kartę i adres; `cardFromHash("#kodeks")` nadal działa. Uruchom: `npx vitest run tests/unit/features/cards` (FAIL).
- [ ] **Step 2:** `CardTarget` dostaje `{ kind: "codex" }`; wpis Kodeksu ma `target: { kind: "codex" }`; `useCardNavigation`: `selectCard` traktuje `codex` jak `projects`/`map` (`setStandalone(id)`), hook zwraca `codexOpen`; `App.tsx`: gałąź `codexOpen ? <CodexView apiFetch={apiFetch} />` przed `placeholder`, warunek ekranu głównego uwzględnia `!codexOpen`. **Jeszcze nie usuwamy** wariantu `placeholder`.
- [ ] **Step 3 (zielony):** `npx vitest run tests/unit/features/cards tests/unit/features/codex` → PASS; `npx tsc --noEmit` → PASS.
- [ ] **Step 4:** Commit: `feat(kodeks): karta Kodeks podpięta pod Alt+9 jako widok samodzielny`.

### Task 10: Usunięcie martwej zaślepki

**Files:** Delete: `src/features/cards/CardPlaceholder.tsx`, `tests/unit/features/cards/CardPlaceholder.test.tsx`; Modify: `cards.ts` (usuń wariant `placeholder`), `useCardNavigation.ts` (usuń `placeholder`), `App.tsx`, testy odwołujące się do `placeholder`.

- [ ] **Step 1:** `grep -rn "placeholder\|CardPlaceholder" src tests --include=*.ts --include=*.tsx` i upewnij się, że poza wymienionymi plikami nikt nie używa wariantu (pole HTML `placeholder` w inputach pomiń).
- [ ] **Step 2:** usuń kod i testy zaślepki; zaktualizuj `STAN-W-KODZIE.md` (karta Kodeks: JEST, z odnośnikiem do `contexts/bc_codex/` i `src/features/codex/`), tabelę §6.6 w specu nadrzędnym (kolumna „Punkt wyjścia w kodzie” dla Kodeksu, zdanie o zaślepkach „Projekty, Mapa, Kodeks”) oraz kryteria §8 specu Kodeksu (część B: odhacz).
- [ ] **Step 3:** `npx tsc --noEmit`, `npx vitest run`, `npm run lint` (przez `cursor`). Oczekiwane: PASS.
- [ ] **Step 4:** Commit: `refactor(karty): usunięcie zaślepki CardPlaceholder (wszystkie karty mają widok)`.

### Task 11: Weryfikacja, review, obejrzenie w przeglądarce

- [ ] **Step 1 (cursor, tier light, bez zapisu):**

```bash
scripts/ask-helper.sh --role task --tier light --approve-allowed cursor "W katalogu Monolith uruchom po kolei: npx tsc --noEmit; npx vitest run; npm run lint; npm run build. Odpowiedz 'przeszło' albo listą plik:linia + przyczyna dla każdej porażki. Nie edytuj plików."
```

- [ ] **Step 2 (parser na prawdziwym pliku, ręcznie):** `npx tsx -e` z jednorazowym skryptem w katalogu scratchpad (nie w repo): `parseCodex(fs.readFileSync("../NEXUS/Vault/Knowledge/kodeks.md","utf8"))` ma dać 11 reguł (6 MUST, 5 SHOULD), 2 checklisty (6 i 4 punkty), 0 ostrzeżeń.
- [ ] **Step 3 (review diffa, agy, nowy kontekst):**

```bash
scripts/ask-helper.sh --role review --fresh agy "Zrób niezależny review diffa gałęzi feat/karta-kodeks względem main (git diff main...HEAD). Cel: karta Kodeks wg docs/superpowers/specs/2026-11-12-karta-kodeks-design.md i planu docs/superpowers/plans/2026-11-14-karta-kodeks-czesc-b.md. Szukaj: wycieku danych strefy work do Vault/Checklists, zapisów poza kolejką, parsera gubiącego treść, XSS w renderowaniu reguł, niezgodności z makietą docs/mockups/karty/cards/09-kodeks.html. Odpowiedź: lista plik:linia + problem + dlaczego, najpierw najpoważniejsze."
```

Opinie traktuj jak hipotezy: zweryfikuj w kodzie przed zmianą (CLAUDE.md).

- [ ] **Step 4 (przeglądarka, ręcznie przez użytkownika):** `npm run dev`, `Alt+9`: sprawdź wszystkie elementy z tabeli Task 8, w tym stan „Brak pliku” (zmień tymczasowo nazwę pliku w kopii vaulta, nie w prawdziwym) i przełącznik `work` (oczekiwany komunikat blokady, jeśli `Work/` nie jest ignorowane). **Próbne zapisy robimy w tymczasowym vaulcie (`NEXUS_VAULT_PATH` na kopię), nie w prawdziwym NEXUS** (propozycja `ZAPIS-1`). Zapisz uwagi o elementach zbędnych: usuwamy je w osobnym commicie.
- [ ] **Step 5:** otwarcie PR dopiero na prośbę użytkownika; w opisie sekcja „Przekazane innym kartom” z pamięci projektu (pkt 3: reguły MUST/SHOULD i checklista bezpieczeństwa agenta → Kodeks, część B/C).

---

## Samoprzegląd planu względem specu

- §4.1 format i parser → Task 4 (przypadki 1-10). Ostrzeżenia w UI → Task 8 (`CodexAlerts`).
- §4.2 checklisty i dziennik → Task 5 (odtwarzanie), Task 6 (dopisywanie, kolejka), Task 2 (dopisywanie linii).
- §4.3 prywatność → Task 6 przypadki 6-7 i `assertWorkAccess`; `owner` wymagane w Task 5.
- §4.4 warstwy → odstępstwa jawnie w „Ustaleniach” 1-3 i skorygowane w Task 0.
- §4.5 błędy (brak vaulta, brak pliku, `mtime`) → Task 6 przypadki 1-3, Task 7 `useCodex`, Task 8 `CodexStates`.
- §4.6 testy → rozłożone po zadaniach; testy komponentów: filtr, odhaczanie, notatka (Task 8).
- §4.7 makieta → tabela odwzorowania w Task 8; pominięcia wymienione w ustaleniu 8.
- §8 część B → Task 11; część C (treść) → Task 3.
- Poza planem (świadomie): `ZAPIS-1` w `kodeks.md` (czeka na zatwierdzenie), integracja z Kokpitem/Projektami (spec §6), `projectId` w UI.
