# Arsenał, etap 1: Zasoby. Plan implementacji

> **Dla agentów wykonujących:** WYMAGANY PODSKILL: superpowers:subagent-driven-development (zalecany) albo superpowers:executing-plans. Kroki mają składnię checkboxów (`- [ ]`).

**Cel:** Dziewięć usprawnień listy zasobów (spec §5) oraz most zasób → notatka w Bazie wiedzy NEXUS, bez nowych danych i bez nowego kontekstu.

**Architektura:** Zmiany w `src/features/resources/` (UI, czysta logika filtrów) i w `contexts/bc_resources/` (normalizacja tagów, odrzucanie tytułu Cloudflare, dołączanie `notePath`). Most woła `contexts/bc_nexus_docs/services.ts` (jedyna dozwolona droga między kontekstami, reguła 1–7). Wejście do notatki: nowy prop `initialNexusPath` w `NotesPanel`, sterowany z `PlanowanieView`.

**Stos:** Next.js 14, TypeScript, zod, Vitest + Testing Library (`tests/unit/**`), YAML w vaulcie (`lib/nexus/`).

**Spec:** `docs/superpowers/specs/2026-11-14-karta-arsenal-design.md` §5. Wszystkie komendy z katalogu `~/projects/Brain_7224/Monolith`.

---

## Ustalenia z odczytu kodu (zmieniają założenia specu)

1. **Źródło „Just a moment…” to `contexts/bc_resources/services.ts` (`fetchPageMetadata`), nie `resourceParsing.ts`.** `resourceParsing.ts` tylko parsuje wklejone bloki „Opis/URL/Tagi”. Tytuł pobiera serwer regexem `<title>` z odpowiedzi strony; strona Cloudflare zwraca `<title>Just a moment...</title>`. Ten sam regex nie dekoduje encji HTML (`&amp;`), stąd 14 wystąpień encji. Punkt 8 specu dotyka więc `services.ts`.
2. **Formularz dodawania już jest zwijany** (`formExpanded` w `useResources.ts`, domyślnie `true`, przycisk w `ResourceAddForm.tsx:92`). Punkt 2 sprowadza się do: domyślnie zwinięty + kolumna 350 px znika (`.ars-layout` w `resources.css:327`).
3. **Klik w wiersz dziś otwiera edycję** (`ResourceListItem.tsx:35`). Punkt 1 odwraca to zachowanie; istniejące testy nie sprawdzają kliknięcia w wiersz, więc nie pękną.
4. **Serwerowe `searchResources` już uwzględnia tagi.** Punkt 4 dotyczy tylko filtra klienckiego `filterResourcesBySearch`.
5. **`note_id` w modelu nie ma zdefiniowanego znaczenia** (zasoby są na poziomie użytkownika, nie notatki). Plan przyjmuje: `note_id` = ścieżka dokumentu względem vaulta, np. `Knowledge/semantic-kernel.md`; gdy dokumentu nie ma na liście widocznych, jest ignorowany i działa dopasowanie po hoście. **Do potwierdzenia przy review specu.**
6. **`source_urls` nie jest dziś nigdzie czytane** (`grep` w `contexts/`, `lib/`, `src/` pusty). Frontmatter jest już parsowany w `RawNexusDoc.meta`, więc nie trzeba nowego parsera; w repo `NEXUS/Vault/Knowledge` pole występuje jako lista URL-i albo `[]`.
7. **Pliki w `contexts/bc_resources/`:** test architektury wymusza pięć plików (`router`, `schemas`, `models`, `services`, `repositories`). Dlatego `normalizeTags` i mapa scalania idą do `services.ts` i `models.ts`, nie do nowego pliku.

## Proponowana mapa scalania tagów (punkt 9, do zatwierdzenia)

Dane z 2026-11-14: 74 zasoby, 25 różnych tagów. Realne warianty: `kurs` (1), `nauka` (2), `Learning` (4); `Moje projekty` (1), `Projekty` (2). Reszta jest spójna.

| Wariant (porównanie bez wielkości liter) | Tag docelowy |
| ---------------------------------------- | ------------ |
| `kurs`, `kursy`, `nauka`                 | `Learning`   |
| `moje projekty`                          | `Projekty`   |

Dodatkowo każdy zestaw tagów jest deduplikowany bez względu na wielkość liter (zostaje pierwsza forma). Zmiana mapy to edycja jednej stałej w `models.ts`. Normalizacja działa **przy zapisie**; istniejące rekordy poprawia osobne zadanie agenta (zadanie 11), nie aplikacja.

## Mapa plików

| Plik                                                    | Zmiana                                                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/resources/resourceFilters.ts`             | + `countResourceTags`, + `resourceNeedsFix`, + `filterResourcesNeedingFix`; wyszukiwanie z tagami                              |
| `src/features/resources/useResources.ts`                | + `tagCounts`, `fixOnly`/`toggleFixOnly`, `dense`/`setDense`, `clearAllFilters`, `searchRef`; `formExpanded` domyślnie `false` |
| `src/features/resources/useResourceShortcuts.ts` (nowy) | skróty `/` i `Esc`                                                                                                             |
| `src/features/resources/ResourceListItem.tsx`           | klik = otwarcie URL; tryb gęsty; link „notatka”                                                                                |
| `src/features/resources/ResourceFavoritesBar.tsx`       | kompaktowe chipy                                                                                                               |
| `src/features/resources/ResourceFilterSidebar.tsx`      | liczniki, chip „Do poprawy”                                                                                                    |
| `src/features/resources/ResourceSection.tsx`            | układ jednokolumnowy, `searchRef`, skróty, przełącznik gęstości, prop `onOpenNote`                                             |
| `src/features/resources/resources.css`                  | układ, tryb gęsty, chipy ulubionych                                                                                            |
| `contexts/bc_resources/models.ts`                       | + `TAG_MERGE_MAP`, + `notePath?` w `Resource`                                                                                  |
| `contexts/bc_resources/services.ts`                     | `normalizeTags`, `isBlockedTitle`, `decodeHtmlEntities`, `fallbackTitle`, `fetchPageMetadata`, `getResources` z `notePath`     |
| `contexts/bc_resources/schemas.ts`                      | + `notePath?` w `ResourceDto` i mapperze                                                                                       |
| `contexts/bc_nexus_docs/services.ts`                    | + `buildKnowledgeLinkIndex`                                                                                                    |
| `src/features/notes/NotesPanel.tsx`                     | + `initialNexusPath`, `onInitialNexusPathConsumed`                                                                             |
| `src/features/planowanie/PlanowanieView.tsx`            | stan `pendingNexusPath`, `onOpenNote`                                                                                          |

Nowe testy: `tests/unit/features/resources/resourceFilters.test.ts`, `useResourceShortcuts.test.tsx`, `ResourceSection.test.tsx`, `tests/unit/contexts/bc_nexus_docs/services.linkIndex.test.ts`; rozszerzane: `ResourceListItem.test.tsx`, `useResources.test.ts`, `services.resources.test.ts`, `NotesPanel.nexus.test.tsx`.

**Zasady z CLAUDE.md obowiązujące w całym planie:** `tests/unit/architecture.static.test.ts` nie jest zmieniany (gdyby pękł: naprawa kodem, nie testem). Testy, lint, typecheck i build zleca się `cursor --role task --approve-allowed --tier light`; pełny output czyta się tylko, gdy podsumowanie nie wystarcza.

---

## Zadanie 1: Wyszukiwarka obejmuje tagi (punkt 4)

**Pliki:**

- Modyfikacja: `src/features/resources/resourceFilters.ts:17-30`
- Test (nowy): `tests/unit/features/resources/resourceFilters.test.ts`

- [ ] **Krok 1: Napisz test (czerwony)**

```ts
import { describe, expect, it } from "vitest";
import { filterResourcesBySearch } from "@/src/features/resources/resourceFilters";
import type { NoteResource } from "@/src/features/resources/resourceTypes";

function res(overrides: Partial<NoteResource>): NoteResource {
  return {
    id: "r",
    description: "",
    url: "https://example.com",
    title: "Title",
    tags: [],
    ...overrides,
  };
}

describe("filterResourcesBySearch", () => {
  const list = [
    res({ id: "1", title: "Docs", tags: ["VectorDB"] }),
    res({ id: "2", title: "Other", tags: ["Chat"] }),
  ];

  it("dopasowuje po tagu, bez wielkości liter", () => {
    expect(filterResourcesBySearch(list, "vectordb").map((r) => r.id)).toEqual(["1"]);
  });

  it("nadal dopasowuje po tytule i pustym zapytaniu zwraca wszystko", () => {
    expect(filterResourcesBySearch(list, "other").map((r) => r.id)).toEqual(["2"]);
    expect(filterResourcesBySearch(list, "  ")).toHaveLength(2);
  });
});
```

- [ ] **Krok 2: Uruchom i potwierdź porażkę**

Run: `npx vitest run tests/unit/features/resources/resourceFilters.test.ts`
Expected: FAIL (`dopasowuje po tagu`: zwraca `[]`).

- [ ] **Krok 3: Implementacja** (w `filterResourcesBySearch` dodaj warunek tagów)

```ts
return resources.filter(
  (r) =>
    (r.title ?? "").toLowerCase().includes(q) ||
    (r.description ?? "").toLowerCase().includes(q) ||
    (r.url ?? "").toLowerCase().includes(q) ||
    (r.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
);
```

- [ ] **Krok 4: Test zielony**

Run: `npx vitest run tests/unit/features/resources/resourceFilters.test.ts`
Expected: PASS.

- [ ] **Krok 5: Commit**

```bash
git add tests/unit/features/resources/resourceFilters.test.ts src/features/resources/resourceFilters.ts
git commit -m "feat(zasoby): wyszukiwarka obejmuje tagi"
```

---

## Zadanie 2: Liczniki tagów i sortowanie po częstości (punkt 3)

**Pliki:**

- Modyfikacja: `src/features/resources/resourceFilters.ts`, `useResources.ts`, `ResourceFilterSidebar.tsx`, `ResourceSection.tsx`
- Test: `tests/unit/features/resources/resourceFilters.test.ts`, `useResources.test.ts`

Interfejs: `export type TagCount = { tag: string; count: number }`; `countResourceTags(resources): TagCount[]` sortuje malejąco po `count`, remisy rosnąco po `tag` (`localeCompare(b, "pl")`).

- [ ] **Krok 1: Dopisz test (czerwony)** do `resourceFilters.test.ts` (dodaj `countResourceTags` do importu)

```ts
describe("countResourceTags", () => {
  it("liczy wystąpienia i sortuje po częstości, remis alfabetycznie", () => {
    const list = [
      res({ id: "1", tags: ["b", "a"] }),
      res({ id: "2", tags: ["b"] }),
      res({ id: "3", tags: ["c", "b"] }),
      res({ id: "4", tags: [] }),
    ];
    expect(countResourceTags(list)).toEqual([
      { tag: "b", count: 3 },
      { tag: "a", count: 1 },
      { tag: "c", count: 1 },
    ]);
  });
});
```

- [ ] **Krok 2:** `npx vitest run tests/unit/features/resources/resourceFilters.test.ts`. Expected: FAIL (`countResourceTags is not a function`).

- [ ] **Krok 3: Implementacja** w `resourceFilters.ts`

```ts
export type TagCount = { tag: string; count: number };

/** Tagi z liczbą zasobów, od najczęstszych; remis rozstrzyga alfabet. */
export function countResourceTags(resources: readonly NoteResource[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const r of resources) {
    for (const tag of r.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "pl"));
}
```

- [ ] **Krok 4: Hook.** W `useResources.ts` dodaj `countResourceTags` do importu z `./resourceFilters` oraz `TagCount`; w `UseResourcesResult` dodaj `tagCounts: TagCount[];`; pod `allTags`:

```ts
const tagCounts = useMemo(() => countResourceTags(resources), [resources]);
```

i dopisz `tagCounts,` do zwracanego obiektu. `allTags` zostaje (istniejące testy).

- [ ] **Krok 5: Sidebar.** W `ResourceFilterSidebar.tsx` zamień prop `allTags: string[]` na `tagCounts: TagCount[]` (import typu z `./resourceFilters`) i pętlę:

```tsx
{
  tagCounts.map(({ tag, count }) => {
    const isSelected = selectedTags.includes(tag);
    return (
      <button
        key={tag}
        type="button"
        onClick={() => toggleTag(tag)}
        className={`chip ${isSelected ? "chip--accent" : ""}`}
        aria-pressed={isSelected}
      >
        <span className="ars-hash" aria-hidden="true">
          #
        </span>
        {tag} ({count})
      </button>
    );
  });
}
```

W `ResourceSection.tsx` przekaż `tagCounts={tagCounts}` zamiast `allTags={allTags}` (dopisz `tagCounts` do destrukturyzacji `useResources`, usuń `allTags`).

- [ ] **Krok 6: Test hooka (czerwony → zielony).** Dopisz do `useResources.test.ts`

```ts
test("tagCounts liczy tagi wczytanych zasobów", async () => {
  apiFetch.mockImplementation(async () => ({
    ok: true,
    json: async () => [
      { id: "1", description: "", url: "https://a", title: "A", tags: ["x", "y"] },
      { id: "2", description: "", url: "https://b", title: "B", tags: ["x"] },
    ],
  }));
  const { result } = renderHook(() => useResources(apiFetch, {}));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.tagCounts).toEqual([
    { tag: "x", count: 2 },
    { tag: "y", count: 1 },
  ]);
});
```

Run: `npx vitest run tests/unit/features/resources`. Expected: PASS (po kroku 4 test przechodzi; wcześniej sprawdź czerwony, odkładając `tagCounts`).

- [ ] **Krok 7: Typecheck** (zlecić `cursor`): `npx tsc --noEmit`. Expected: bez błędów (m.in. `ResourceSection` nie używa już `allTags`).

- [ ] **Krok 8: Commit**

```bash
git add src/features/resources tests/unit/features/resources
git commit -m "feat(zasoby): liczniki przy tagach i sortowanie po częstości"
```

---

## Zadanie 3: Klik w wiersz otwiera URL, edycja pod ołówkiem (punkt 1)

**Pliki:**

- Modyfikacja: `src/features/resources/ResourceListItem.tsx:33-39`
- Test: `tests/unit/features/resources/ResourceListItem.test.tsx`

Reguła: klik i Enter/spacja w głównym obszarze wiersza wołają `window.open(r.url, "_blank", "noopener,noreferrer")`. Ołówek nadal woła `onOpenEdit`. Obszar główny nie jest już przyciskiem edycji, ale zachowuje `role="link"` dla czytników ekranu.

- [ ] **Krok 1: Dopisz testy (czerwone)** do `ResourceListItem.test.tsx` (importy `vi`, `userEvent`, `within` już są; dodaj `afterEach`)

```tsx
describe("ResourceListItem: otwieranie i edycja", () => {
  const baseProps = {
    titleUnavailableLabel: "(brak)",
    resourceFavoriteLabel: "Ulubione",
    resourceEditLabel: "Edytuj",
    onToggleFavorite: vi.fn(),
    onCopy: vi.fn(),
    onDelete: vi.fn(),
  };

  afterEach(() => vi.restoreAllMocks());

  it("klik w wiersz otwiera URL w nowej karcie i nie otwiera edycji", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const onOpenEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <ul>
        <ResourceListItem
          {...baseProps}
          resource={mockResource({ url: "https://open.me" })}
          onOpenEdit={onOpenEdit}
        />
      </ul>
    );
    await user.click(screen.getByText("Example Title"));
    expect(open).toHaveBeenCalledWith("https://open.me", "_blank", "noopener,noreferrer");
    expect(onOpenEdit).not.toHaveBeenCalled();
  });

  it("ołówek otwiera edycję i nie otwiera URL", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const onOpenEdit = vi.fn();
    const user = userEvent.setup();
    const resource = mockResource();
    render(
      <ul>
        <ResourceListItem {...baseProps} resource={resource} onOpenEdit={onOpenEdit} />
      </ul>
    );
    await user.click(screen.getByRole("button", { name: "Edytuj" }));
    expect(onOpenEdit).toHaveBeenCalledWith(resource);
    expect(open).not.toHaveBeenCalled();
  });
});
```

- [ ] **Krok 2:** `npx vitest run tests/unit/features/resources/ResourceListItem.test.tsx`. Expected: FAIL (klik woła `onOpenEdit`, `open` nie wywołane).

- [ ] **Krok 3: Implementacja.** W `ResourceListItem.tsx` dodaj nad `return`

```tsx
const openUrl = () => window.open(r.url, "_blank", "noopener,noreferrer");
```

i zamień `div.ars-res-main`:

```tsx
      <div
        className="ars-res-main"
        onClick={openUrl}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openUrl();
          }
        }}
        role="link"
        tabIndex={0}
        aria-label={r.title || r.url}
      >
```

- [ ] **Krok 4:** ten sam test, Expected: PASS (w tym stare cztery testy).

- [ ] **Krok 5: Commit**

```bash
git add src/features/resources/ResourceListItem.tsx tests/unit/features/resources/ResourceListItem.test.tsx
git commit -m "feat(zasoby): klik w wiersz otwiera URL, edycja pod ołówkiem"
```

---

## Zadanie 4: Widok „do poprawy” (punkt 7)

**Pliki:**

- Modyfikacja: `src/features/resources/resourceFilters.ts`, `useResources.ts`, `ResourceFilterSidebar.tsx`, `ResourceSection.tsx`
- Test: `resourceFilters.test.ts`, `useResources.test.ts`

Interfejsy:

- `resourceNeedsFix(r: NoteResource): boolean`: prawda, gdy tytuł (po `trim`, bez wielkości liter) zaczyna się od `just a moment`, **albo** tytuł jest równy `url` (po `trim`), **albo** brak `thumbnailUrl`.
- `filterResourcesNeedingFix(resources): NoteResource[]`.
- Hook: `fixOnly: boolean`, `toggleFixOnly: () => void`, `fixCount: number`.

> Uwaga do przeglądu: spec §5 punkt 7 łączy trzy warunki (OR). Przy 27 zasobach bez miniatury widok wyniesie ok. 30 z 74 pozycji; jeśli to za szeroko, usunięcie warunku miniatury to zmiana jednej linii w `resourceNeedsFix` i jednego testu.

- [ ] **Krok 1: Testy (czerwone)** w `resourceFilters.test.ts` (importy: `resourceNeedsFix`, `filterResourcesNeedingFix`)

```ts
describe("resourceNeedsFix", () => {
  const ok = { title: "Fine", url: "https://a.com", thumbnailUrl: "https://a.com/i.png" };

  it("false dla zasobu z tytułem i miniaturą", () => {
    expect(resourceNeedsFix(res(ok))).toBe(false);
  });
  it("true dla tytułu Cloudflare (także wielokropek znakiem i bez wielkości liter)", () => {
    expect(resourceNeedsFix(res({ ...ok, title: "Just a moment…" }))).toBe(true);
    expect(resourceNeedsFix(res({ ...ok, title: "just a moment..." }))).toBe(true);
  });
  it("true, gdy tytuł równa się URL", () => {
    expect(resourceNeedsFix(res({ ...ok, title: "https://a.com" }))).toBe(true);
  });
  it("true bez miniatury", () => {
    expect(resourceNeedsFix(res({ ...ok, thumbnailUrl: undefined }))).toBe(true);
  });
  it("filterResourcesNeedingFix zostawia tylko takie zasoby", () => {
    const list = [res({ ...ok, id: "good" }), res({ ...ok, id: "bad", thumbnailUrl: undefined })];
    expect(filterResourcesNeedingFix(list).map((r) => r.id)).toEqual(["bad"]);
  });
});
```

- [ ] **Krok 2:** `npx vitest run tests/unit/features/resources/resourceFilters.test.ts`. Expected: FAIL.

- [ ] **Krok 3: Implementacja** w `resourceFilters.ts`

```ts
const CLOUDFLARE_TITLE = /^just a moment/i;

/** Zasób do poprawy: tytuł ze strony Cloudflare, tytuł równy URL-owi albo brak miniatury. */
export function resourceNeedsFix(r: NoteResource): boolean {
  const title = (r.title ?? "").trim();
  return CLOUDFLARE_TITLE.test(title) || title === (r.url ?? "").trim() || !r.thumbnailUrl;
}

export function filterResourcesNeedingFix(resources: readonly NoteResource[]): NoteResource[] {
  return resources.filter(resourceNeedsFix);
}
```

- [ ] **Krok 4: Hook.** W `useResources.ts`: import `filterResourcesNeedingFix`; stan `const [fixOnly, setFixOnly] = useState(false);`; w `filteredResources` (kolejność: tagi → „do poprawy” → szukanie → ulubione):

```ts
const fixCount = useMemo(() => filterResourcesNeedingFix(resources).length, [resources]);

const filteredResources = useMemo(() => {
  const byTags = filterResourcesByTags(resources, selectedTags);
  const byFix = fixOnly ? filterResourcesNeedingFix(byTags) : byTags;
  return sortResourcesByFavorite(filterResourcesBySearch(byFix, searchQuery));
}, [resources, selectedTags, fixOnly, searchQuery]);

const toggleFixOnly = () => setFixOnly((v) => !v);
```

Dopisz `fixOnly`, `toggleFixOnly`, `fixCount` do `UseResourcesResult` (typy `boolean`, `() => void`, `number`) i do zwracanego obiektu.

- [ ] **Krok 5: Test hooka** w `useResources.test.ts`

```ts
test("toggleFixOnly zawęża listę do zasobów do poprawy", async () => {
  apiFetch.mockImplementation(async () => ({
    ok: true,
    json: async () => [
      {
        id: "ok",
        description: "",
        url: "https://a",
        title: "A",
        tags: [],
        thumbnailUrl: "https://i",
      },
      {
        id: "bad",
        description: "",
        url: "https://b",
        title: "Just a moment...",
        tags: [],
        thumbnailUrl: "https://i",
      },
    ],
  }));
  const { result } = renderHook(() => useResources(apiFetch, {}));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.fixCount).toBe(1);
  act(() => result.current.toggleFixOnly());
  expect(result.current.filteredResources.map((r) => r.id)).toEqual(["bad"]);
});
```

- [ ] **Krok 6: UI.** Do `ResourceFilterSidebar` dodaj propsy `fixOnly: boolean`, `fixCount: number`, `onToggleFix: () => void`, `fixLabel: string` i wewnątrz `ars-filter-chips`, przed tagami:

```tsx
<button
  type="button"
  onClick={onToggleFix}
  className={`chip ${fixOnly ? "chip--accent" : ""}`}
  aria-pressed={fixOnly}
>
  {fixLabel} ({fixCount})
</button>
```

W `ResourceSection` przekaż `fixOnly`, `fixCount`, `onToggleFix={toggleFixOnly}`, `fixLabel="Do poprawy"`; sidebar przyjmuje etykietę jako prop, żeby komponent pozostał bez tekstów na sztywno. Przycisk „Wyczyść” w sidebarze pokazuj, gdy `selectedTags.length > 0 || fixOnly`; `clearTagFilter` w hooku zerować także `fixOnly` (`setFixOnly(false)`).

- [ ] **Krok 7:** `npx vitest run tests/unit/features/resources`. Expected: PASS. Potem `npx tsc --noEmit` (zlecić `cursor`).

- [ ] **Krok 8: Commit**

```bash
git add src/features/resources tests/unit/features/resources
git commit -m "feat(zasoby): widok do poprawy (tytuł Cloudflare, tytuł równy URL, brak miniatury)"
```

---

## Zadanie 5: Skróty `/` i `Esc` (punkt 5)

**Pliki:**

- Nowy: `src/features/resources/useResourceShortcuts.ts`
- Modyfikacja: `useResources.ts`, `ResourceSection.tsx`
- Test (nowy): `tests/unit/features/resources/useResourceShortcuts.test.tsx`

Reguły:

- `/` przenosi fokus do pola wyszukiwania i blokuje wpisanie znaku, **tylko gdy** fokus nie jest w `input`, `textarea`, `select` ani `contenteditable`.
- `Esc` czyści zapytanie i filtry (tagi, „do poprawy”) oraz zdejmuje fokus z wyszukiwarki, **tylko gdy** `enabled` (modal edycji zamknięty); inaczej `Esc` obsługuje modal.
- Skróty działają tylko, gdy panel zasobów jest zamontowany (App montuje go warunkowo, więc listener znika razem z panelem).

Interfejs: `useResourceShortcuts(opts: { searchRef: React.RefObject<HTMLInputElement>; onClear: () => void; enabled: boolean }): void`.

- [ ] **Krok 1: Sprawdź konflikt z globalnymi skrótami**

Run: `grep -rn "key === \"/\"\|key === \"Escape\"" src app --include=*.ts --include=*.tsx | grep -v features/resources`
Expected: zapisz wynik. Jeśli globalny handler (paleta poleceń) już przechwytuje `/` lub `Esc` na `document`, w `useResourceShortcuts` użyj `{ capture: false }` i `if (e.defaultPrevented) return;`; kod poniżej już tak robi.

- [ ] **Krok 2: Test (czerwony)**

```tsx
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useResourceShortcuts } from "@/src/features/resources/useResourceShortcuts";

function Harness({ onClear, enabled = true }: { onClear: () => void; enabled?: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);
  useResourceShortcuts({ searchRef: ref, onClear, enabled });
  return (
    <div>
      <input ref={ref} aria-label="szukaj" />
      <textarea aria-label="inne" />
      <button type="button">btn</button>
    </div>
  );
}

describe("useResourceShortcuts", () => {
  it("/ przenosi fokus do wyszukiwarki", async () => {
    const user = userEvent.setup();
    render(<Harness onClear={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "btn" }));
    await user.keyboard("/");
    expect(screen.getByLabelText("szukaj")).toHaveFocus();
    expect(screen.getByLabelText("szukaj")).toHaveValue("");
  });

  it("/ w polu tekstowym wpisuje znak i nie zmienia fokusu", async () => {
    const user = userEvent.setup();
    render(<Harness onClear={vi.fn()} />);
    await user.click(screen.getByLabelText("inne"));
    await user.keyboard("/");
    expect(screen.getByLabelText("inne")).toHaveFocus();
    expect(screen.getByLabelText("inne")).toHaveValue("/");
  });

  it("Esc woła onClear i zdejmuje fokus z wyszukiwarki", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<Harness onClear={onClear} />);
    await user.click(screen.getByLabelText("szukaj"));
    await user.keyboard("{Escape}");
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("szukaj")).not.toHaveFocus();
  });

  it("Esc nic nie robi, gdy enabled=false", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<Harness onClear={onClear} enabled={false} />);
    await user.keyboard("{Escape}");
    expect(onClear).not.toHaveBeenCalled();
  });
});
```

- [ ] **Krok 3:** `npx vitest run tests/unit/features/resources/useResourceShortcuts.test.tsx`. Expected: FAIL (brak modułu).

- [ ] **Krok 4: Implementacja** `src/features/resources/useResourceShortcuts.ts`

```ts
import { useEffect, type RefObject } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/** `/` → fokus na wyszukiwarkę; `Esc` → wyczyść zapytanie i filtry. Tylko dla zamontowanego panelu. */
export function useResourceShortcuts(opts: {
  searchRef: RefObject<HTMLInputElement>;
  onClear: () => void;
  enabled: boolean;
}): void {
  const { searchRef, onClear, enabled } = opts;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape" && enabled) {
        onClear();
        searchRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [searchRef, onClear, enabled]);
}
```

- [ ] **Krok 5:** ten sam test. Expected: PASS (4 testy).

- [ ] **Krok 6: Podpięcie.** W `useResources.ts` dodaj

```ts
const clearAllFilters = () => {
  setSelectedTags([]);
  setFixOnly(false);
  setSearchQuery("");
};
```

i zwróć `clearAllFilters` (w typie `() => void`). W `ResourceSection.tsx`:

```tsx
const searchRef = React.useRef<HTMLInputElement>(null);
useResourceShortcuts({
  searchRef,
  onClear: clearAllFilters,
  enabled: editingResource == null,
});
```

oraz `ref={searchRef}` na `<input type="search" …>`; podpowiedź w `placeholder` zostaje, dopisz `title="/ — szukaj, Esc — wyczyść"` na polu.

- [ ] **Krok 7: Test komponentu `ResourceSection`** (nowy `tests/unit/features/resources/ResourceSection.test.tsx`)

```tsx
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResourceSection } from "@/src/features/resources/ResourceSection";

const data = [
  {
    id: "1",
    description: "d1",
    url: "https://a.com",
    title: "Alfa",
    tags: ["x"],
    thumbnailUrl: "https://i",
  },
  {
    id: "2",
    description: "d2",
    url: "https://b.com",
    title: "Beta",
    tags: ["y"],
    thumbnailUrl: "https://i",
  },
];

function setup() {
  const apiFetch = vi.fn(async () => ({ ok: true, json: async () => data }) as Response);
  render(<ResourceSection apiFetch={apiFetch} t={{}} />);
  return screen.findByText("Alfa");
}

describe("ResourceSection", () => {
  it("Esc czyści zapytanie wyszukiwarki", async () => {
    await setup();
    const user = userEvent.setup();
    const search = screen.getByRole("searchbox");
    await user.type(search, "beta");
    expect(screen.queryByText("Alfa")).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByText("Alfa")).toBeInTheDocument());
    expect(search).toHaveValue("");
  });

  it("/ ustawia fokus na wyszukiwarce", async () => {
    await setup();
    const user = userEvent.setup();
    await user.click(document.body);
    await user.keyboard("/");
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});
```

Run: `npx vitest run tests/unit/features/resources`. Expected: PASS.

- [ ] **Krok 8: Commit**

```bash
git add src/features/resources tests/unit/features/resources
git commit -m "feat(zasoby): skróty / i Esc w panelu zasobów"
```

---

## Zadanie 6: Zwijany formularz bez stałej kolumny (punkt 2)

**Pliki:**

- Modyfikacja: `useResources.ts` (domyślnie zwinięty), `ResourceSection.tsx` (kolejność w układzie), `resources.css:327-360`
- Test: `useResources.test.ts`, `ResourceSection.test.tsx`

Zmiana: formularz przenosi się **nad listę** w kolumnie głównej i jest domyślnie zwinięty. Siatka `.ars-layout` staje się jednokolumnowa, a `.ars-sidebar` traci `position: sticky` i szerokość kolumny. Nazwy klas bez zmian.

- [ ] **Krok 1: Testy (czerwone)**

W `useResources.test.ts`:

```ts
test("formularz dodawania jest domyślnie zwinięty", async () => {
  const { result } = renderHook(() => useResources(apiFetch, {}));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.formExpanded).toBe(false);
});
```

W `ResourceSection.test.tsx`:

```tsx
it("pole URL formularza pojawia się dopiero po rozwinięciu", async () => {
  await setup();
  const user = userEvent.setup();
  expect(screen.queryByPlaceholderText("URL")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /add resource/i }));
  expect(screen.getByPlaceholderText("URL")).toBeInTheDocument();
});
```

Jeśli przycisk w `ResourceAddForm.tsx:92` ma inną nazwę dostępną (sprawdź `aria-label`/tekst wokół linii 92-99 i dopasuj `name`), popraw selektor w teście, nie komponent.

- [ ] **Krok 2:** `npx vitest run tests/unit/features/resources`. Expected: FAIL (`formExpanded` jest `true`).

- [ ] **Krok 3: Implementacja.** `useResources.ts`: `useState(true)` → `useState(false)` dla `formExpanded`. `ResourceSection.tsx`: przenieś blok `<aside className="ars-sidebar" …>…</aside>` w całości na początek `div.ars-col-main` (przed `ResourceFavoritesBar`), zamykając układ jedną kolumną. `resources.css`:

```css
.ars-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--s-4);
  align-items: start;
}

.ars-sidebar {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: var(--s-3) var(--s-4);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}
```

Usuń blok `@media (max-width: 960px) { .ars-layout … }` (jedna kolumna jest teraz zawsze).

- [ ] **Krok 4:** `npx vitest run tests/unit/features/resources`. Expected: PASS.

- [ ] **Krok 5: Podgląd** (skill `run`): uruchom aplikację, otwórz Alt+7, sprawdź zwinięty formularz nad listą i brak pustej kolumny po prawej. Opisz wynik w komunikacie commita.

- [ ] **Krok 6: Commit**

```bash
git add src/features/resources tests/unit/features/resources
git commit -m "feat(zasoby): formularz dodawania zwinięty, bez stałej kolumny"
```

---

## Zadanie 7: Tryb gęsty i kompaktowe ulubione (punkt 6)

**Pliki:**

- Modyfikacja: `ResourceListItem.tsx`, `ResourceFavoritesBar.tsx`, `useResources.ts`, `ResourceSection.tsx`, `resources.css`
- Test: `ResourceListItem.test.tsx`, `useResources.test.ts`

Reguły:

- `dense` (hook, domyślnie `false`) przechowywany w `localStorage` pod kluczem `monolith.resources.dense` (`"1"`/`"0"`); każdy odczyt i zapis w `try/catch`, bez storage lista działa normalnie.
- `ResourceListItem` dostaje opcjonalny `dense?: boolean`. Gdy `true`: klasa `ars-res-item--dense`, bez opisu i bez chipów tagów (tytuł + ikony akcji w jednej linii). W trybie normalnym wszystko jak dziś.
- Ulubione zawsze kompaktowe: wiersz chipów 28 px zamiast kafli 76×76 (tylko CSS + zmniejszenie ikony do 16 px).

- [ ] **Krok 1: Testy (czerwone)**

`ResourceListItem.test.tsx` (używa `baseProps` z zadania 3 w tym samym pliku; jeśli zadania wykonuje się osobno, skopiuj definicję):

```tsx
it("w trybie gęstym ukrywa opis i tagi", () => {
  render(
    <ul>
      <ResourceListItem {...baseProps} dense resource={mockResource()} onOpenEdit={vi.fn()} />
    </ul>
  );
  expect(screen.getByText("Example Title")).toBeInTheDocument();
  expect(screen.queryByText("Test description")).not.toBeInTheDocument();
  expect(screen.queryByText("tag1")).not.toBeInTheDocument();
});
```

`useResources.test.ts`:

```ts
test("dense zapamiętuje wybór w localStorage", async () => {
  localStorage.removeItem("monolith.resources.dense");
  const { result } = renderHook(() => useResources(apiFetch, {}));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.dense).toBe(false);
  act(() => result.current.setDense(true));
  expect(localStorage.getItem("monolith.resources.dense")).toBe("1");
  const again = renderHook(() => useResources(apiFetch, {}));
  await waitFor(() => expect(again.result.current.dense).toBe(true));
});
```

- [ ] **Krok 2:** `npx vitest run tests/unit/features/resources`. Expected: FAIL.

- [ ] **Krok 3: Implementacja hooka.** W `useResources.ts`:

```ts
const DENSE_KEY = "monolith.resources.dense";

function readDense(): boolean {
  try {
    return window.localStorage.getItem(DENSE_KEY) === "1";
  } catch {
    return false;
  }
}
```

w komponencie hooka:

```ts
const [dense, setDenseState] = useState(false);
useEffect(() => setDenseState(readDense()), []);
const setDense = (value: boolean) => {
  setDenseState(value);
  try {
    window.localStorage.setItem(DENSE_KEY, value ? "1" : "0");
  } catch {
    /* brak storage: wybór działa tylko do końca sesji */
  }
};
```

Dopisz `dense: boolean; setDense: (v: boolean) => void;` do `UseResourcesResult` i oba do zwracanego obiektu. (Odczyt w `useEffect`, nie w inicjalizatorze, żeby uniknąć różnicy SSR/klient.)

- [ ] **Krok 4: Wiersz.** `ResourceListItem.tsx`: prop `dense?: boolean` (domyślnie `false`); `<li className={`ars-res-item${dense ? " ars-res-item--dense" : ""}`}>`; opis i tagi owinąć warunkiem `!dense &&`.

- [ ] **Krok 5: Ulubione.** `ResourceFavoritesBar.tsx`: `Image` 32 → 16 (`width={16}`, `height={16}`, `style` z `width: 16, height: 16`). Etykieta zostaje.

- [ ] **Krok 6: Sekcja i CSS.** `ResourceSection.tsx`: przekaż `dense={dense}` do `ResourceListItem`; w `ars-head__actions` dodaj przełącznik

```tsx
<button
  type="button"
  className={`btn btn--sm ${dense ? "chip--accent" : "btn--ghost"}`}
  aria-pressed={dense}
  onClick={() => setDense(!dense)}
>
  Gęsto
</button>
```

`resources.css`: dopisz (wartości dopasuj do istniejących zmiennych `--s-*` w pliku)

```css
.ars-res-item--dense {
  padding-block: var(--s-1);
}
.ars-res-item--dense .ars-res-favicon__img {
  width: 20px !important;
  height: 20px !important;
}
.ars-fav-btn {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: var(--s-2);
  width: auto;
  height: 28px;
  padding: 0 var(--s-3);
}
```

Przed zmianą `.ars-fav-btn` przeczytaj obecną regułę w `resources.css` (grep `\.ars-fav-btn`) i **zastąp** jej `width`/`height`/`flex-direction` zamiast dopisywać duplikat; usuń też stałe 76×76.

- [ ] **Krok 7:** `npx vitest run tests/unit/features/resources`. Expected: PASS. Podgląd w aplikacji (skill `run`): ulubione jako chipy, przełącznik „Gęsto”.

- [ ] **Krok 8: Commit**

```bash
git add src/features/resources tests/unit/features/resources
git commit -m "feat(zasoby): tryb gęsty listy i kompaktowe ulubione"
```

---

## Zadanie 8: Odrzucanie tytułu Cloudflare i dekodowanie encji (punkt 8)

**Pliki:**

- Modyfikacja: `contexts/bc_resources/services.ts:44-57`
- Test: `tests/unit/contexts/bc_resources/services.resources.test.ts`

Reguły (`fetchPageMetadata`):

- Tytuł po `trim` pasujący do `/^(just a moment|attention required)/i` jest odrzucany; wynikiem jest **nazwa hosta bez `www.`** (np. `example.com`).
- Pozostałe tytuły przechodzą przez dekodowanie encji HTML (`&amp; &lt; &gt; &quot; &#39; &#x27; &nbsp;` oraz `&#NNN;`/`&#xHH;`), żeby nowe zasoby nie dostawały `&amp;` (spec §5, stan wyjściowy 14 wystąpień; poprawa starych danych jest w zadaniu 11). Dekodowanie jest dodatkiem do specu, bo ma tę samą przyczynę (regex `<title>`).
- Błąd sieci nadal daje `title = url` (istniejący test „uses URL as title when fetch fails” bez zmian).
- `thumbnailUrl` bez zmian.

Interfejsy (eksportowane z `services.ts` tylko na potrzeby testów): `isBlockedTitle(title: string): boolean`, `decodeHtmlEntities(text: string): string`, `hostTitle(url: string): string`.

- [ ] **Krok 1: Testy (czerwone)** w `services.resources.test.ts`. Rozszerz import o `decodeHtmlEntities, hostTitle, isBlockedTitle` i dopisz w `describe("addResource")`:

```ts
it("zastępuje tytuł Cloudflare nazwą domeny", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("<html><head><title>Just a moment...</title></head></html>", {
        status: 200,
      })
    )
  );
  mockAdd.mockImplementation(async (payload: Record<string, unknown>) => ({
    id: "r3",
    ...payload,
  }));

  await addResource({ description: "x", url: "https://www.example.com/page" });

  expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ title: "example.com" }));
});

it("dekoduje encje HTML w tytule", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("<html><head><title>Q&amp;A &#8211; Docs</title></head></html>", {
        status: 200,
      })
    )
  );
  mockAdd.mockImplementation(async (payload: Record<string, unknown>) => ({
    id: "r4",
    ...payload,
  }));

  await addResource({ description: "x", url: "https://qa.example" });

  expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ title: "Q&A – Docs" }));
});
```

oraz nowy blok:

```ts
describe("pomocnicze tytułu", () => {
  it("isBlockedTitle rozpoznaje strony Cloudflare", () => {
    expect(isBlockedTitle("Just a moment...")).toBe(true);
    expect(isBlockedTitle("Just a moment…")).toBe(true);
    expect(isBlockedTitle("  attention required! | Cloudflare")).toBe(true);
    expect(isBlockedTitle("Moment of truth")).toBe(false);
  });
  it("hostTitle zwraca host bez www i URL przy błędnym adresie", () => {
    expect(hostTitle("https://www.example.com/a?b=1")).toBe("example.com");
    expect(hostTitle("nie-url")).toBe("nie-url");
  });
  it("decodeHtmlEntities", () => {
    expect(decodeHtmlEntities("A &lt;b&gt; &quot;c&quot; &#39;d&#39; &#x27;e&#x27; &nbsp;f")).toBe(
      "A <b> \"c\" 'd' 'e'  f"
    );
  });
});
```

- [ ] **Krok 2:** `npx vitest run tests/unit/contexts/bc_resources/services.resources.test.ts`. Expected: FAIL (brak eksportów; tytuł Cloudflare nie jest zastępowany).

- [ ] **Krok 3: Implementacja** w `services.ts` (zastąp `fetchPageMetadata`)

```ts
const BLOCKED_TITLE = /^(just a moment|attention required)/i;

/** Tytuł strony ochronnej (Cloudflare), nie właściwej treści. */
export function isBlockedTitle(title: string): boolean {
  return BLOCKED_TITLE.test(title.trim());
}

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39|#x27);/gi, (m) => NAMED_ENTITIES[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)));
}

/** Host bez `www.` jako tytuł zastępczy; przy nieprawidłowym adresie sam adres. */
export function hostTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

async function fetchPageMetadata(url: string): Promise<{ title: string; thumbnailUrl?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    const rawTitle = decodeHtmlEntities(titleMatch?.[1]?.trim() ?? "");
    return {
      title: rawTitle === "" ? url : isBlockedTitle(rawTitle) ? hostTitle(url) : rawTitle,
      thumbnailUrl: ogImage?.[1],
    };
  } catch {
    return { title: url };
  }
}
```

Uwaga: `\&#8211;` w teście = „–” (U+2013); `String.fromCodePoint(8211)` daje ten znak.

- [ ] **Krok 4:** ten sam test. Expected: PASS (z istniejącymi trzema testami `addResource`).

- [ ] **Krok 5: Commit**

```bash
git add contexts/bc_resources/services.ts tests/unit/contexts/bc_resources/services.resources.test.ts
git commit -m "fix(zasoby): odrzucaj tytuł Cloudflare i dekoduj encje HTML przy dodawaniu"
```

---

## Zadanie 9: Normalizacja tagów przy zapisie (punkt 9)

**Pliki:**

- Modyfikacja: `contexts/bc_resources/models.ts`, `contexts/bc_resources/services.ts` (`addResource`, `updateResource`)
- Test: `tests/unit/contexts/bc_resources/services.resources.test.ts`

Reguły `normalizeTags(tags: readonly string[]): string[]`:

1. `trim`, odrzucenie pustych;
2. klucz mapy = tag małymi literami; trafienie w `TAG_MERGE_MAP` zastępuje tag docelowym;
3. deduplikacja bez względu na wielkość liter, zostaje pierwsza forma (po kroku 2), kolejność zachowana.

`updateResource` normalizuje tylko, gdy `data.tags !== undefined`.

- [ ] **Krok 1: Testy (czerwone)** (import `normalizeTags`)

```ts
describe("normalizeTags", () => {
  it("scala warianty wg mapy bez względu na wielkość liter", () => {
    expect(normalizeTags(["kurs", "Nauka", "Learning", "Moje projekty"])).toEqual([
      "Learning",
      "Projekty",
    ]);
  });
  it("trimuje, usuwa puste i duplikaty bez względu na wielkość liter, zachowuje kolejność", () => {
    expect(normalizeTags([" AI ", "", "ai", "Chat", "API", "api"])).toEqual(["AI", "Chat", "API"]);
  });
  it("zwraca pustą tablicę dla pustego wejścia", () => {
    expect(normalizeTags([])).toEqual([]);
  });
});

describe("tagi w addResource/updateResource", () => {
  it("addResource zapisuje znormalizowane tagi", async () => {
    mockAdd.mockImplementation(async (p: Record<string, unknown>) => ({ id: "r5", ...p }));
    await addResource({ description: "d", url: "https://example.com", tags: ["kurs", "nauka"] });
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ tags: ["Learning"] }));
  });
  it("updateResource normalizuje tagi, a bez tagów ich nie dotyka", async () => {
    mockUpdate.mockResolvedValue(undefined);
    await updateResource("r1", { tags: ["Kursy", "kurs"] });
    expect(mockUpdate).toHaveBeenCalledWith("r1", { tags: ["Learning"] });
    await updateResource("r1", { isFavorite: true });
    expect(mockUpdate).toHaveBeenLastCalledWith("r1", { isFavorite: true });
  });
});
```

Test `addResource` zakłada, że `beforeEach` stubuje `fetch` (jest w pliku); umieść blok wewnątrz głównego `describe`.

- [ ] **Krok 2:** `npx vitest run tests/unit/contexts/bc_resources/services.resources.test.ts`. Expected: FAIL.

- [ ] **Krok 3: Implementacja.** `models.ts` (dopisz na końcu):

```ts
/** Scalanie wariantów tagów przy zapisie: klucz = tag małymi literami, wartość = tag docelowy. */
export const TAG_MERGE_MAP: Readonly<Record<string, string>> = {
  kurs: "Learning",
  kursy: "Learning",
  nauka: "Learning",
  "moje projekty": "Projekty",
};
```

`services.ts`: import `TAG_MERGE_MAP` z `./models` i

```ts
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const trimmed = raw.trim();
    if (trimmed === "") continue;
    const tag = TAG_MERGE_MAP[trimmed.toLowerCase()] ?? trimmed;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}
```

W `addResource`: `tags: normalizeTags(data.tags ?? []),`. W `updateResource` zastąp `return repositories.updateResource(resourceId, data);` przez

```ts
return repositories.updateResource(resourceId, {
  ...data,
  ...(data.tags !== undefined && { tags: normalizeTags(data.tags) }),
});
```

- [ ] **Krok 4:** Expected: PASS (testy z zadania 8 i istniejące bez zmian; `updateResource("r1", { isFavorite: true })` nadal woła repo z samym `{ isFavorite: true }`).

- [ ] **Krok 5: Commit**

```bash
git add contexts/bc_resources tests/unit/contexts/bc_resources/services.resources.test.ts
git commit -m "feat(zasoby): normalizacja tagów przy zapisie (mapa scalania, deduplikacja)"
```

---

## Zadanie 10: Most zasób → notatka w Bazie wiedzy

**Pliki:**

- Modyfikacja: `contexts/bc_nexus_docs/services.ts`, `contexts/bc_resources/models.ts`, `schemas.ts`, `services.ts`; `src/features/resources/ResourceListItem.tsx`, `ResourceSection.tsx`; `src/features/notes/NotesPanel.tsx`; `src/features/planowanie/PlanowanieView.tsx`
- Test (nowe/rozszerzone): `tests/unit/contexts/bc_nexus_docs/services.linkIndex.test.ts`, `services.resources.test.ts`, `ResourceListItem.test.tsx`, `tests/unit/features/notes/NotesPanel.nexus.test.tsx`

Reguły (spec §5): jeśli zasób ma `noteId`, wygrywa (jako ścieżka widocznego dokumentu `Knowledge/…`); w przeciwnym razie host URL zasobu (małe litery, bez `www.`) porównywany z hostami z `source_urls` dokumentów `Knowledge/`; przy braku trafienia brak linku; przy wielu trafieniach pierwszy dokument w kolejności listy (obszar, grupa, tytuł, ścieżka, `localeCompare("pl")`). Błąd budowy indeksu nie psuje listy zasobów: zasoby wracają bez `notePath`.

Interfejs nexus:

```ts
export type KnowledgeLinkIndex = {
  /** Host (małe litery, bez `www.`) → ścieżka pierwszego dokumentu `Knowledge/` z takim hostem w `source_urls`. */
  hostToPath: ReadonlyMap<string, string>;
  /** Ścieżki widocznych dokumentów `Knowledge/`. */
  paths: ReadonlySet<string>;
};
export function normalizeHost(url: string): string | null;
export function buildKnowledgeLinkIndex(): KnowledgeLinkIndex;
```

### Część A: indeks po stronie `bc_nexus_docs`

- [ ] **Krok 1: Test (czerwony)** `tests/unit/contexts/bc_nexus_docs/services.linkIndex.test.ts` (wzorzec jak `services.test.ts`: prawdziwe pliki w tymczasowym vaulcie przez `useTempVault`, mock `bc_projects`)

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTempVault } from "../../helpers/tempVault";

const mockListProjects = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/bc_projects/services", () => ({
  listProjects: mockListProjects,
  isWorkProject: (entry: { owner: string }) => entry.owner === "work",
}));

import { buildKnowledgeLinkIndex, normalizeHost } from "@/contexts/bc_nexus_docs/services";

const vault = useTempVault();

beforeEach(() => {
  mockListProjects.mockReset();
  mockListProjects.mockReturnValue({ projects: [{ id: "p", owner: "personal" }], warnings: [] });
  vault.write(
    "Knowledge/a.md",
    "---\ntitle: Alfa\nsource_urls:\n  - https://www.github.com/x/y\n  - https://docs.example.com/p\n---\nTreść A"
  );
  vault.write(
    "Knowledge/b.md",
    "---\ntitle: Beta\nsource_urls:\n  - https://github.com/z\n---\nTreść B"
  );
  vault.write("Knowledge/c.md", "---\ntitle: Gamma\nsource_urls: []\n---\nTreść C");
  vault.write(
    "Knowledge/d.md",
    "---\ntitle: Delta\nsource_urls: https://single.example.com\n---\nTreść D"
  );
  vault.write(
    "Projects/p/notes.md",
    "---\ntitle: Projektowa\nsource_urls:\n  - https://skip.example.com\n---\nTreść P"
  );
});

describe("normalizeHost", () => {
  it("zdejmuje www i wielkość liter, zwraca null dla błędnego URL", () => {
    expect(normalizeHost("https://WWW.GitHub.com/a")).toBe("github.com");
    expect(normalizeHost("nie-url")).toBeNull();
  });
});

describe("buildKnowledgeLinkIndex", () => {
  it("hostToPath wskazuje pierwszy dokument w kolejności listy (tytuł: Alfa przed Beta)", () => {
    const idx = buildKnowledgeLinkIndex();
    expect(idx.hostToPath.get("github.com")).toBe("Knowledge/a.md");
    expect(idx.hostToPath.get("docs.example.com")).toBe("Knowledge/a.md");
  });

  it("obsługuje source_urls jako łańcuch i pomija dokumenty spoza Knowledge", () => {
    const idx = buildKnowledgeLinkIndex();
    expect(idx.hostToPath.get("single.example.com")).toBe("Knowledge/d.md");
    expect(idx.hostToPath.has("skip.example.com")).toBe(false);
  });

  it("paths zawiera dokumenty Knowledge, także bez source_urls", () => {
    expect([...buildKnowledgeLinkIndex().paths].sort()).toEqual([
      "Knowledge/a.md",
      "Knowledge/b.md",
      "Knowledge/c.md",
      "Knowledge/d.md",
    ]);
  });
});
```

Run: `npx vitest run tests/unit/contexts/bc_nexus_docs/services.linkIndex.test.ts`. Expected: FAIL (brak eksportów).

- [ ] **Krok 2: Implementacja** w `bc_nexus_docs/services.ts` (dopisz na końcu pliku)

```ts
export type KnowledgeLinkIndex = {
  hostToPath: ReadonlyMap<string, string>;
  paths: ReadonlySet<string>;
};

/** Host z URL-a: małe litery, bez `www.`; `null` dla nieprawidłowego adresu. */
export function normalizeHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function sourceUrls(meta: Record<string, unknown>): string[] {
  const value = meta.source_urls;
  const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return items.filter((item): item is string => typeof item === "string");
}

/**
 * Indeks do mostu zasób → notatka: hosty z `source_urls` dokumentów `Knowledge/`.
 * Kolejność dokumentów jak na liście (obszar, grupa, tytuł, ścieżka): pierwszy trafiony host wygrywa.
 */
export function buildKnowledgeLinkIndex(): KnowledgeLinkIndex {
  const entries: { path: string; group: string; title: string; hosts: string[] }[] = [];
  for (const rel of listVisiblePaths()) {
    if (!rel.startsWith("Knowledge/")) continue;
    const raw = readNexusDoc(rel);
    if (raw === null) continue;
    const hosts = sourceUrls(raw.meta)
      .map(normalizeHost)
      .filter((h): h is string => h !== null);
    entries.push({
      path: rel,
      group: docGroup(rel),
      title: docTitle(raw.meta, raw.body, rel),
      hosts,
    });
  }
  entries.sort((a, b) => cmp(a.group, b.group) || cmp(a.title, b.title) || cmp(a.path, b.path));
  const hostToPath = new Map<string, string>();
  for (const entry of entries) {
    for (const host of entry.hosts) if (!hostToPath.has(host)) hostToPath.set(host, entry.path);
  }
  return { hostToPath, paths: new Set(entries.map((e) => e.path)) };
}
```

- [ ] **Krok 3:** ten sam test. Expected: PASS.

- [ ] **Krok 4: Commit**

```bash
git add contexts/bc_nexus_docs/services.ts tests/unit/contexts/bc_nexus_docs/services.linkIndex.test.ts
git commit -m "feat(nexus-docs): indeks hostów z source_urls dla mostu zasób → notatka"
```

### Część B: `notePath` w kontekście zasobów

- [ ] **Krok 5: Testy (czerwone)** w `services.resources.test.ts`. Dodaj na górze (obok pozostałych `vi.hoisted`/`vi.mock`):

```ts
const mockLinkIndex = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/bc_nexus_docs/services", () => ({
  buildKnowledgeLinkIndex: (...a: unknown[]) => mockLinkIndex(...a),
  normalizeHost: (url: string) => {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return null;
    }
  },
}));
```

i testy:

```ts
describe("getResources: notePath", () => {
  const base = { description: "", title: "T", tags: [] as string[] };
  const index = {
    hostToPath: new Map([["github.com", "Knowledge/gh.md"]]),
    paths: new Set(["Knowledge/gh.md", "Knowledge/own.md"]),
  };

  it("noteId wskazujący widoczny dokument wygrywa nad hostem", async () => {
    mockLinkIndex.mockReturnValue(index);
    mockGetAll.mockResolvedValue([
      { id: "1", url: "https://github.com/a", noteId: "Knowledge/own.md", ...base },
    ]);
    expect((await getResources())[0].notePath).toBe("Knowledge/own.md");
  });

  it("noteId spoza listy jest ignorowany i działa host", async () => {
    mockLinkIndex.mockReturnValue(index);
    mockGetAll.mockResolvedValue([
      { id: "1", url: "https://www.github.com/a", noteId: "Knowledge/nie-ma.md", ...base },
    ]);
    expect((await getResources())[0].notePath).toBe("Knowledge/gh.md");
  });

  it("brak trafienia: brak notePath", async () => {
    mockLinkIndex.mockReturnValue(index);
    mockGetAll.mockResolvedValue([{ id: "1", url: "https://nigdzie.example", ...base }]);
    expect((await getResources())[0].notePath).toBeUndefined();
  });

  it("błąd budowy indeksu nie psuje listy", async () => {
    mockLinkIndex.mockImplementation(() => {
      throw new Error("vault");
    });
    mockGetAll.mockResolvedValue([{ id: "1", url: "https://github.com/a", ...base }]);
    const result = await getResources();
    expect(result).toHaveLength(1);
    expect(result[0].notePath).toBeUndefined();
  });
});
```

Istniejący test `delegates to Firestore helpers` (`getResources()` → `[]`) zostaje zielony, bo pusta lista nie ma `notePath`; w `beforeEach` dodaj `mockLinkIndex.mockReset(); mockLinkIndex.mockReturnValue({ hostToPath: new Map(), paths: new Set() });`.

Run: `npx vitest run tests/unit/contexts/bc_resources/services.resources.test.ts`. Expected: FAIL.

- [ ] **Krok 6: Implementacja.**

`models.ts`: do typu `Resource` dodaj `notePath?: string; // pochodne: ścieżka dokumentu Knowledge/, nie zapisywane w YAML`.

`services.ts`: import `{ buildKnowledgeLinkIndex, normalizeHost } from "@/contexts/bc_nexus_docs/services";` i

```ts
function attachNotePaths(resources: Resource[]): Resource[] {
  if (resources.length === 0) return resources;
  let index: ReturnType<typeof buildKnowledgeLinkIndex>;
  try {
    index = buildKnowledgeLinkIndex();
  } catch {
    return resources; // most jest dodatkiem: lista zasobów ładuje się bez niego
  }
  return resources.map((r) => {
    const host = normalizeHost(r.url);
    const notePath =
      r.noteId !== undefined && index.paths.has(r.noteId)
        ? r.noteId
        : host !== null
          ? index.hostToPath.get(host)
          : undefined;
    return notePath === undefined ? r : { ...r, notePath };
  });
}

export async function getResources(): Promise<Resource[]> {
  return attachNotePaths(await repositories.getResources());
}
```

`schemas.ts`: w `ResourceDto` dodaj `notePath?: string;`, w `toResourceDto` `notePath: resource.notePath,`. **Test mappera** w `tests/unit/contexts/bc_resources/schemas.test.ts`:

```ts
it("toResourceDto przenosi notePath", () => {
  const dto = toResourceDto({
    id: "1",
    description: "",
    url: "https://a",
    title: "t",
    tags: [],
    notePath: "Knowledge/a.md",
  });
  expect(dto.notePath).toBe("Knowledge/a.md");
});
```

(dopasuj import `toResourceDto` do istniejącego w pliku). `searchResources` używa `repositories.getResources()` bezpośrednio i **nie** dostaje `notePath` (bez zmian: agent nie potrzebuje linku).

- [ ] **Krok 7:** `npx vitest run tests/unit/contexts`. Expected: PASS.

- [ ] **Krok 8: Test architektury** (zlecić `cursor`): `npx vitest run tests/unit/architecture.static.test.ts`. Expected: PASS (nowa krawędź `bc_resources/services → bc_nexus_docs/services` jest dozwolona; brak cyklu, bo `bc_nexus_docs` nie importuje `bc_resources`). **Jeśli pęknie: naprawa kodem, test nietknięty.**

- [ ] **Krok 9: Commit**

```bash
git add contexts/bc_resources tests/unit/contexts/bc_resources
git commit -m "feat(zasoby): notePath (note_id albo host z source_urls) w liście zasobów"
```

### Część C: link „notatka” i wejście do Notatek

- [ ] **Krok 10: Testy (czerwone).**

`ResourceListItem.test.tsx`:

```tsx
it("pokazuje link notatka tylko gdy jest notePath i woła onOpenNote", async () => {
  const onOpenNote = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(
    <ul>
      <ResourceListItem
        {...baseProps}
        resource={mockResource({ notePath: "Knowledge/a.md" })}
        onOpenEdit={vi.fn()}
        onOpenNote={onOpenNote}
      />
    </ul>
  );
  await user.click(screen.getByRole("button", { name: /notatka/i }));
  expect(onOpenNote).toHaveBeenCalledWith("Knowledge/a.md");

  rerender(
    <ul>
      <ResourceListItem
        {...baseProps}
        resource={mockResource()}
        onOpenEdit={vi.fn()}
        onOpenNote={onOpenNote}
      />
    </ul>
  );
  expect(screen.queryByRole("button", { name: /notatka/i })).not.toBeInTheDocument();
});
```

`NotesPanel.nexus.test.tsx` (dopisz w `describe("NotesPanel: baza wiedzy NEXUS")`; helpery `props`, `apiFetch`, `LIST`, `DOCS` już są w pliku):

```tsx
it("initialNexusPath otwiera dokument NEXUS i zgłasza zużycie dokładnie raz", async () => {
  const onConsumed = vi.fn();
  const utils = render(
    <NotesPanel
      {...props({ initialNexusPath: "Knowledge/a.md", onInitialNexusPathConsumed: onConsumed })}
    />
  );
  expect(await utils.findByTestId("nexus-readonly-badge")).toBeTruthy();
  expect(apiFetch).toHaveBeenCalledWith("/api/nexus-docs/Knowledge/a.md");
  expect(utils.container.querySelector(".not-kv")?.textContent ?? "").toContain("Knowledge/a.md");
  expect(onConsumed).toHaveBeenCalledTimes(1);
});
```

Run: `npx vitest run tests/unit/features/resources/ResourceListItem.test.tsx tests/unit/features/notes/NotesPanel.nexus.test.tsx`. Expected: FAIL.

- [ ] **Krok 11: Implementacja.**

`ResourceListItem.tsx`: prop `onOpenNote?: (notePath: string) => void`; w `ars-res-actions`, przed gwiazdką:

```tsx
{
  r.notePath && onOpenNote && (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenNote(r.notePath as string);
      }}
      className="btn btn--sm btn--ghost ars-action-btn"
      title="Otwórz notatkę w Bazie wiedzy"
      aria-label="Notatka"
    >
      notatka
    </button>
  );
}
```

`ResourceSectionProps` w `resourceTypes.ts`: `onOpenNote?: (notePath: string) => void;`; `ResourceSection` przekazuje go do każdego `ResourceListItem`.

`NotesPanel.tsx`: w `NotesPanelProps` dodaj

```ts
  /** Dokument NEXUS do otwarcia przy wejściu do panelu (np. z mostu w Arsenale). */
  initialNexusPath?: string | null;
  /** Wołane raz po zużyciu `initialNexusPath`, żeby rodzic wyczyścił stan. */
  onInitialNexusPathConsumed?: () => void;
```

`useState<string | null>(initialNexusPath ?? null)` zamiast `useState<string | null>(null)` dla `nexusPath`, oraz

```ts
useEffect(() => {
  if (initialNexusPath) onInitialNexusPathConsumed?.();
  // tylko przy montowaniu: panel jest montowany warunkowo przy wejściu na kartę Notatki
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

`PlanowanieView.tsx`: stan `const [pendingNexusPath, setPendingNexusPath] = useState<string | null>(null);`; w `NotesPanel` propsy `initialNexusPath={pendingNexusPath}` i `onInitialNexusPathConsumed={() => setPendingNexusPath(null)}`; w `ResourceSection`:

```tsx
<ResourceSection
  apiFetch={apiFetch}
  t={t as Record<string, string | string[]>}
  onOpenNote={(path) => {
    setPendingNexusPath(path);
    setPlanningTab("notes");
  }}
/>
```

Uwaga o czasie życia: `NotesPanel` montuje się dopiero po przełączeniu zakładki, więc `initialNexusPath` jest już ustawiony w pierwszym renderze; efekt zużycia czyści stan, więc kolejne wejście w Notatki z karty nie otwiera starego dokumentu.

- [ ] **Krok 12:** `npx vitest run tests/unit/features tests/unit/contexts`. Expected: PASS. Potem `npx tsc --noEmit` i `npm run lint` (zlecić `cursor`).

- [ ] **Krok 13: Podgląd w aplikacji** (skill `run`): w Arsenale znajdź zasób z hostem obecnym w `source_urls` (np. `github.com`, `learn.microsoft.com`), kliknij „notatka”; oczekiwany efekt: przełączenie na Notatki z otwartym dokumentem w sekcji „Baza wiedzy NEXUS”.

- [ ] **Krok 14: Commit**

```bash
git add src tests/unit/features
git commit -m "feat(zasoby): link notatka do Bazy wiedzy NEXUS (most zasób → notatka)"
```

---

## Zadanie 11: Jednorazowe sprzątanie danych (zadanie dla agenta, nie kod aplikacji)

Wykonuje agent **po** zadaniach 8 i 9, z kontrolą `git diff` w repo NEXUS (spec §5). Zakres: `~/projects/Brain_7224/NEXUS/Vault/Resources/resources.yaml`.

- [ ] **Krok 1:** Zrób kopię: `cp ../NEXUS/Vault/Resources/resources.yaml /tmp/claude-1000/-home-miro7224-projects-Brain-7224-Monolith/6a01a98e-7809-4597-9ac9-e665d8ed5ecd/scratchpad/resources.before.yaml` (bez nadpisywania repo przed przeglądem).
- [ ] **Krok 2:** Zgłoś użytkownikowi listę: 8 tytułów „Just a moment…” (propozycja nowego tytułu: host bez `www.`, albo tytuł wpisany ręcznie), 5 tytułów równych URL, 14 wystąpień encji HTML (proponowana wersja zdekodowana). Zmiany stosuj dopiero po akceptacji.
- [ ] **Krok 3:** Po akceptacji edytuj tylko pola `title` (i `tags`, jeśli użytkownik zatwierdzi scalenie z mapy z tego planu) w istniejących rekordach; nie zmieniaj `id`, `created`, `updated`.
- [ ] **Krok 4:** `git -C ../NEXUS diff --stat` i `git -C ../NEXUS diff Vault/Resources/resources.yaml`: tylko linie `title:`/`tags:`. Commit w repo NEXUS na prośbę użytkownika.

---

## Zadanie 12: Weryfikacja całości

- [ ] **Krok 1:** zlecić `cursor --role task --tier light --approve-allowed`: `npx tsc --noEmit`, `npx vitest run`, `npm run lint`, `npm run build`. Oczekiwane: „przeszło” albo lista `plik:linia + przyczyna`.
- [ ] **Krok 2:** niezależny review diffa (`agy --role review`) z pytaniami: (a) czy `buildKnowledgeLinkIndex` nie czyta plików spoza `Knowledge/`, (b) czy `GET /api/resources` nie degraduje się przy błędzie vaulta, (c) czy skróty `/` i `Esc` nie kolidują z paletą poleceń. Opinie traktować jak hipotezy, weryfikować w kodzie.
- [ ] **Krok 3:** pomiar czasu `GET /api/resources` z mostem (jednorazowo w `skill run`, zapis liczby w opisie PR); jeśli > 300 ms przy obecnym vaulcie, zgłosić użytkownikowi pomysł cache'u indeksu (poza zakresem tego planu).
- [ ] **Krok 4:** opis PR zawiera tabelę „Przekazane innym kartom” ze spec §8 i zdanie o odłożonych decyzjach (słownik tagów `tags.yaml`).

---

## Samokontrola względem specu

| Wymaganie (spec §5)                                           | Zadanie                                                           |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1. klik otwiera URL, edycja pod ołówkiem                      | 3                                                                 |
| 2. formularz zwijany zamiast panelu 350 px                    | 6                                                                 |
| 3. liczniki tagów, sortowanie po częstości                    | 2                                                                 |
| 4. wyszukiwarka obejmuje tagi                                 | 1                                                                 |
| 5. skróty `/`, `Esc`                                          | 5                                                                 |
| 6. tryb gęsty, kompaktowe ulubione                            | 7                                                                 |
| 7. widok „do poprawy”                                         | 4                                                                 |
| 8. odrzucanie „Just a moment…”, domena jako tytuł             | 8                                                                 |
| 9. normalizacja tagów, mapa scalania                          | 9 (mapa w sekcji „Proponowana mapa”)                              |
| Most do Bazy wiedzy (`note_id`, host z `source_urls`)         | 10                                                                |
| Sprzątnięcie obecnych danych (agent)                          | 11                                                                |
| Punkty „do sprawdzenia w planie” (źródło tytułów, mapa tagów) | sekcja „Ustalenia z odczytu kodu” p. 1; sekcja „Proponowana mapa” |

**Otwarte pytania do użytkownika (przed wykonaniem):** (1) zatwierdzenie mapy scalania tagów; (2) znaczenie `note_id` jako ścieżki dokumentu (ustalenie 5); (3) czy brak miniatury ma być częścią „do poprawy” (zadanie 4); (4) dekodowanie encji w zadaniu 8 to dodatek do specu: zostawić czy wyciąć.
