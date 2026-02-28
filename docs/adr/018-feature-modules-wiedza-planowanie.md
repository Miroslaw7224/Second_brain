# ADR-018: Osobne moduły Wiedza i Planowanie (feature modules)

## Status

Zaakceptowany

## Kontekst

Obecnie jeden duży `App.tsx` (~1158 linii) łączy oba tryby aplikacji (Wiedza i Planowanie), sidebar zależny od trybu, header z przełącznikiem, auth, tłumaczenia, listę dokumentów w sidebarze (Wiedza), zakładki Planowanie (kalendarz / aktywność / zadania / tagi), chat, notatki, zasoby oraz pasek Plan AI. Trudniej to utrzymywać i testować — rozbudowa jednego trybu wymaga grzebania we wspólnym pliku.

Planowanie ma już wydzielone komponenty (CalendarView, ActivityLog, TasksSection, TagsSection) oraz `planService` po stronie backendu (`/api/plan/ask`). Wiedza pozostaje w dużej mierze w `App.tsx` (sidebar z dokumentami, chat, notatki, ResourceSection) bez wyraźnej granicy „moduł”. Brak spójnej architektury: jeden tryb jest już rozbity na komponenty i serwis, drugi — nie.

## Decyzja

Wprowadzamy **podział na moduły (features)** bez zmiany zachowania na start: nadal dwa przyciski w headerze (Wiedza / Planowanie), bez obowiązkowego React Router. **App.tsx** po refaktorze odpowiada tylko za: layout (header z przełącznikiem trybów, globalny sidebar), auth, stan `appMode` oraz render warunkowy:

- `appMode === 'wiedza'` → `<WiedzaView ... />`
- `appMode === 'planowanie'` → `<PlanowanieView ... />`

Dane współdzielone (user, apiFetch, lang, t, tagi) przekazujemy propsami lub kontekstem.

**Mapowanie na foldery:**

| Moduł | Lokalizacja | Zawartość |
|-------|-------------|-----------|
| Wiedza | `src/features/wiedza/` | `WiedzaView.tsx` — cały content trybu Wiedza (sidebar wiedzy, chat, notatki z edytorem TipTap w `NoteEditor`, zasoby, lista dokumentów). `components/` — np. ChatPanel, NotesList, NoteEditor, ResourceSection (przeniesiony), lista dokumentów jako komponent. Stan: activeTab, documents, notes, messages, input, selectedNote itd. w WiedzaView lub w kontekście/hooku `useWiedza`. |
| Planowanie | `src/features/planowanie/` | `PlanowanieView.tsx` — content trybu Planowanie (sidebar z zakładkami, CalendarView / ActivityLog / TasksSection / TagsSection, pasek Plan AI). `components/` — opcjonalnie CalendarView, ActivityLog, TasksSection, TagsSection (albo pozostają w `src/components`, jeśli używane wyłącznie tutaj). Stan: planningTab, planAskInput, planAskResponse, planAskLoading w PlanowanieView lub hooku `usePlanowanie`. |

Backend bez zmian: Next.js Route Handlers w `app/api/` + services (ragService, planService itd.) zgodnie z ADR-014.

**Edytor notatek (TipTap)**

Notatki w trybie Wiedza korzystają z komponentu **NoteEditor** (`src/components/NoteEditor.tsx`) opartego o **TipTap** (v3). Używane rozszerzenia: StarterKit, Underline, TextAlign, TextStyle, Color, FontFamily oraz własna rozszerzenie FontSize. Treść zapisywana jest w formacie TipTap (HTML/JSON) przez istniejące API notatek; persystencja w Firestore bez zmian. Decyzja o TipTap dotyczy wyłącznie warstwy UI w module Wiedza (zgodnie z ADR-014).

**Zalety podziału:**

- Mniejszy App.tsx; czytelność i utrzymanie — „wiedza = ten folder”, „planowanie = ten folder”; nowe funkcje w danym trybie dodaje się w jednym miejscu.
- Lepsze testy: moduły Wiedza i Planowanie można testować osobno, z mniejszym kontekstem i mockami.
- Możliwość lazy loadingu przy ewentualnym routingu (`/wiedza`, `/planowanie`) — React.lazy + Suspense, mniejszy pierwszy load.
- Spójna architektura: oba tryby w jednym wzorcu (moduł = folder z komponentami + stanem + ewentualnie serwisem po stronie klienta).

**Kiedy można zostać przy jednym pliku:**

- Aplikacja ma zostać mała i bez większych rozszerzeń.
- Zespół jest bardzo mały i nikt nie narzeka na rozmiar App.tsx.
- Nie planuje się osobnych ścieżek URL ani deep linków do Wiedzy/Planowania.

**Opcja na przyszłość:** React Router z trasami `/wiedza`, `/planowanie` oraz `Navigate` przy wyborze trybu — wtedy naturalnie wejście lazy loading dla każdego modułu (React.lazy + Suspense). Decyzja o wprowadzeniu routingu pozostaje oddzielna; na start wystarczy przełącznik `appMode` i dwa widoki.

## Rozważane alternatywy

- **Zostawienie jednego App.tsx** — szybsze na teraz, ale przy planowanej rozbudowie i już dużym pliku utrudnia utrzymanie i testy; odrzucone.
- **Pełny React Router od razu** — możliwe, ale nie wymagane na start; wystarczy przełącznik `appMode` i dwa widoki; routing i lazy loading można dodać później.

## Konsekwencje

**Pozytywne:**

- Wyraźne granice między trybami — łatwiejsze rozwijanie i onboardowanie (lub Cursor).
- Testowanie modułów osobno, z mniejszym kontekstem.
- Możliwość lazy loadingu po ewentualnym wprowadzeniu routingu.
- Jednolity wzorzec: każdy tryb = jeden folder z widokiem, komponentami i stanem.

**Negatywne:**

- Więcej plików; jednorazowy refaktor App.tsx (wyciągnięcie treści do WiedzaView i PlanowanieView).
- Trzeba przekazywać dane współdzielone (user, apiFetch, lang, t, tagi) — propsami lub kontekstem.

## Stan aplikacji (luty 2026)

Decyzja zaakceptowana. Refaktor do `src/features/wiedza` i `src/features/planowanie` do wykonania. Obecnie całość UI obu trybów pozostaje w `App.tsx`; po wdrożeniu ADR-018 App.tsx ograniczy się do layoutu, auth i renderu `<WiedzaView />` / `<PlanowanieView />`. Edytor notatek (TipTap) jest wdrożony w `src/components/NoteEditor.tsx` i używany w widoku notatek w trybie Wiedza.
