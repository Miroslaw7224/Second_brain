# ADR-019: Refaktoryzacja dużych plików frontendu (komponenty, hooki, utils)

## Status

Zaakceptowany, **wdrożony** (marzec 2026)

## Kontekst

Po wdrożeniu ADR-018 (moduły Wiedza i Planowanie) największe pliki UI nadal miały po 400–800+ linii: `ResourceSection.tsx` (~821), `WiedzaView.tsx` (~602), `CalendarView.tsx` (~503), `PlanowanieView.tsx` (~435). Utrudnia to utrzymanie, przegląd kodu i testowanie. Potrzebna była decyzja: jak rozbić te pliki bez wprowadzania niepotrzebnej złożoności (np. kontekstu tam, gdzie wystarczą props).

## Decyzja

Wprowadzamy refaktoryzację w pięciu fazach: wspólna utilita, rozbicie ResourceSection na hook + komponenty w podfolderze, wydzielenie logiki kalendarza i kolumny dnia, rozbicie WiedzaView na hook + panele, wydzielenie sidebara Planowania. **Bez Providera/kontekstu w ResourceSection** — `useResources` zwraca stan i handlery, ResourceSection przekazuje je do dzieci przez props. Kontekst rezerwujemy na przyszłość tylko dla głęboko zagnieżdżonych drzew.

### 1. Wspólna utilita `cn`

- **Problem:** Funkcja `cn` (clsx + tailwind-merge) zduplikowana w AppHeader, WiedzaView, PlanowanieView.
- **Decyzja:** Jeden plik **`src/lib/cn.ts`** z eksportowaną funkcją `cn`; we wszystkich trzech miejscach usunięto lokalną definicję i dodano import z `@/src/lib/cn`.

### 2. ResourceSection – bez kontekstu, typy i logika w osobnych plikach

- **Typy:** Osobny plik **`src/components/resources/resourceTypes.ts`** — `NoteResource`, `ParsedResourceBlock`, `ResourceSectionProps`, `TranslationDict`. Importowany w useResources, ResourceFilterSidebar, ResourceAddForm, ResourceListItem, ResourceEditModal.
- **Parsowanie:** **`src/components/resources/resourceParsing.ts`** — czyste funkcje: `getFaviconUrl`, `parseBlockFormat`, `parseMultipleBlocks`. Testy jednostkowe w **`tests/unit/components/resources/resourceParsing.test.ts`** (dodane od razu przy wydzielaniu).
- **Hook:** **`src/components/resources/useResources.ts`** — fetch, stan (resources, loading, search, selectedTags, formularze, editing), `filteredResources`/`allTags`, handlery (add, addFromBlock, copy, delete, openEdit, closeEdit, saveEdit, toggleFavorite, toggleTag, clearTagFilter). Zwraca jeden obiekt przekazywany przez props.
- **Komponenty w `resources/`:**
  - `ResourceFilterSidebar.tsx` — przyjmuje props (allTags, selectedTags, toggleTag, clearTagFilter, loading, resourcesLength, etykiety). Używany **tylko wewnątrz ResourceSection** (zweryfikowane: nigdzie nie jest renderowany w App ani WiedzaView).
  - `ResourceAddForm.tsx` — formularz dodawania (opis, URL, tagi) + sekcja „wklej blok”.
  - `ResourceFavoritesBar.tsx` — ikonki ulubionych z faviconami.
  - `ResourceListItem.tsx` — jedna karta zasobu (favicon, tytuł, opis, tagi, przyciski).
  - `ResourceEditModal.tsx` — modal edycji zasobu (tytuł, opis, URL, tagi, ulubione).
- **ResourceSection.tsx** — import z `./resources/`, wywołuje `useResources(apiFetch, t)`, renderuje layout (nagłówek + search, lewa kolumna: ResourceFilterSidebar + ResourceAddForm, prawa: ResourceFavoritesBar + lista ResourceListItem + ResourceEditModal). **Brak Providera.** Sygnatura bez zmian: `ResourceSection({ apiFetch, t })`.

### 3. CalendarView – utils i CalendarDayColumn

- **`src/components/calendar/calendarUtils.ts`** — typ `CalendarEvent`, funkcje `getDaysInMonth`, `assignLanes`, `getOverlapCounts`, stałe `MONTH_NAMES`, `DAY_NAMES`, `CALENDAR_MAX_STACK`.
- **`src/components/calendar/CalendarDayColumn.tsx`** — przyjmuje dzień, eventy dnia, cellWidth, lang, dayNames, callbacks (onAddClick, onEventClick, onEndSession), activeSession, todayStr, nowMinutes, t. Renderuje paski eventów **inline** (bez osobnego komponentu CalendarEventBar na start). Osobny plik na pasek eventu tylko przy wzroście złożoności (np. drag-and-drop, duplikacja kodu).
- **CalendarView.tsx** — importuje z `./calendar/calendarUtils` i `./calendar/CalendarDayColumn`, zarządza stanem i fetchem, renderuje nagłówek i listę dni jako CalendarDayColumn. Re-eksport `CalendarEvent` z calendarUtils.

### 4. WiedzaView – useWiedzaData (Faza 4a) i panele

- **`src/features/wiedza/useWiedzaData.ts`** — hook zwracający `documents`, `notes`, `fetchDocuments`, `fetchNotes`. Obowiązkowy do zejścia WiedzaView poniżej ~250 linii.
- **WiedzaSidebarContent.tsx** — zakładki (chat / notes / resources) + lista dokumentów + upload.
- **ChatPanel.tsx** — lista wiadomości, input, handleSend, isLoading, chatEndRef, welcome/prompts; pasek inputu na dole.
- **NotesPanel.tsx** — lista notatek, selectedNote, NoteEditor, handleSaveNote, handleDeleteNote.
- **WiedzaView.tsx** — wywołuje useWiedzaData, renderuje AppSidebar z WiedzaSidebarContent, AppHeader, oraz przełącza main content między ChatPanel, ResourceSection i NotesPanel. Re-eksportuje typy Document, Note, Message.

### 5. PlanowanieView – PlanowanieSidebarContent

- **`src/features/planowanie/PlanowanieSidebarContent.tsx`** — zawartość sidebara: nagłówek „Planowanie” + przyciski zakładek (Kalendarz, Aktywność, Zadania, Tagi). Używa `cn` z `@/src/lib/cn`.
- **PlanowanieView.tsx** — renderuje AppSidebar z PlanowanieSidebarContent, AppHeader, oraz główny content (CalendarView, ActivityLog, TasksSection, TagsSection) i pasek Plan AI. Import `cn` z lib.

## Konsekwencje

**Pozytywne:**

- Mniejsze pliki (ResourceSection ~177 linii, WiedzaView i CalendarView znacząco skrócone), łatwiejsze utrzymanie i przegląd.
- Jedna źródłowa prawda dla typów zasobów i parsowania; testy jednostkowe dla resourceParsing od razu.
- Brak kontekstu w ResourceSection — prostszy przepływ danych (props w dół), mniej pułapek.
- Spójna struktura: podfoldery `resources/` i `calendar/` przy dużych feature’ach; hooki i komponenty w jednym miejscu.

**Negatywne:**

- Więcej plików i importów; jednorazowy wysiłek refaktoryzacji już wykonany.

## Powiązane dokumenty

- ADR-018 (moduły Wiedza i Planowanie) — stan aplikacji zaktualizowany o strukturę po ADR-019.
- Plan refaktoryzacji: `.cursor/plans/refaktoryzacja_dużych_plików_94a46ca6.plan.md`.
