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

- **Wiedza** (`src/features/wiedza/`):
  - Chat z własną bazą wiedzy (RAG na dokumentach użytkownika).
  - Notatki z edytorem TipTap (`NoteEditor`).
  - **Zasoby (`ResourceSection`)**:
    - Lista linków powiązanych z notatkami / wiedzą, przechowywana w Firestore (`users/{userId}/resources`).
    - Filtr po tagach + wyszukiwarka w nagłówku zakładki (po tytule, opisie i URL), filtrowanie w czasie rzeczywistym.
    - Pasek **Ulubionych stron** nad listą — małe kafelki z faviconami działające jak skróty (kliknięcie otwiera stronę w nowej karcie).
    - Każdy element listy ma akcje: **Ulubione | Open link | Copy URL | Delete**; kliknięcie w treść otwiera modal pełnej edycji (tytuł, opis, URL, tagi, ulubione).
    - Informacja o ulubionych (`isFavorite`) jest trwale zapisywana w Firestore i ulubione są sortowane na górę listy.

- **Planowanie** (`src/features/planowanie/`):
  - Kalendarz pracy, log aktywności, kanban z zadaniami i zarządzanie tagami.
  - Pasek Plan AI oparty na historii rozmowy (patrz ADR-018).
