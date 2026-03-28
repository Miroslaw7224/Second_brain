# Second Brain (Freelancer Edition)

Aplikacja do zarządzania wiedzą i planowaniem z wykorzystaniem AI (RAG, planowanie). Stack: Next.js 14 (App Router), Firebase (Auth, Firestore), Gemini.

## Uruchomienie lokalne

**Wymagania:** Node.js 18+

1. Zainstaluj zależności: `npm install --legacy-peer-deps`
2. Skopiuj [.env.example](.env.example) do `.env` i uzupełnij:
   - `GEMINI_API_KEY` — klucz API Gemini
   - `NEXT_PUBLIC_FIREBASE_*` — konfiguracja Firebase (klient)
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin (serwer)
3. Uruchom: `npm run dev` — aplikacja pod adresem http://localhost:3100
4. Build: `npm run build`; produkcja: `npm start`

## Skrypty

- `npm run dev` — serwer deweloperski Next.js
- `npm run build` — build produkcyjny
- `npm start` — uruchomienie zbudowanej aplikacji
- `npm run lint` — lint (Next.js)
- `npm run test` — testy jednostkowe (Vitest)
- `npm run test:e2e` — testy E2E (Playwright)
- `npm run migrate:sqlite-to-firestore` — migracja SQLite → Firestore (skrypt)

## Hosting

Docelowo Vercel (`vercel link` + deploy). Zmienne środowiskowe ustaw w panelu Vercel zgodnie z `.env.example`.

## Moduły i kluczowe funkcje

Struktura frontendu (komponenty, hooki, podfoldery `resources/` i `calendar/`) jest opisana w **ADR-018** (moduły Wiedza/Planowanie) i **ADR-019** (refaktoryzacja dużych plików). Wspólna utilita klas CSS: `src/lib/cn.ts`.

- **Wiedza** (`src/features/wiedza/`):
  - Chat z własną bazą wiedzy (RAG na dokumentach użytkownika) — `ChatPanel`.
  - Notatki z edytorem TipTap — `NotesPanel`, `NoteEditor`.
  - **Mapy myśli** (`src/features/mind-maps/`): drzewo poziome, notatki per węzeł (TipTap), AI (węzeł / poddrzewo), **import** tekstu i/lub obrazu (np. screenshot) przez `/api/mind-maps/import`, eksport do samodzielnego HTML, przeciąganie węzła na inny węzeł w celu **zagnieżdżenia** pod rodzicem.
  - **Zasoby** (`src/components/ResourceSection.tsx` + `src/components/resources/`):
    - Lista linków w Firestore (`users/{userId}/resources`), filtr po tagach + wyszukiwarka (tytuł, opis, URL).
    - Pasek **Ulubionych stron** (kafelki z faviconami), akcje: **Ulubione | Open link | Copy URL | Delete**, modal edycji. Ulubione (`isFavorite`) zapisywane w Firestore, sortowane na górę.

- **Planowanie** (`src/features/planowanie/`):
  - Kalendarz (`src/components/CalendarView.tsx` + `src/components/calendar/`): zdarzenia przechodzące przez północ są **dzielone na segmenty dni** (`expandEventToSegments` w `calendarUtils.ts`), żeby paski nie wychodziły poza siatkę godzin.
  - Log aktywności, **zadania** (lista + modal szczegółów `TaskDetailModal`: edycja tytułu, statusu, terminu i **notatki** zapisywanej w polu `description`; niebieska kropka na liście, gdy notatka jest wypełniona), tagi.
  - Pasek Plan AI z historią rozmowy (patrz ADR-018).
