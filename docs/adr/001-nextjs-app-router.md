# ADR-001: Next.js 14 z App Router jako fullstack framework

## Status

Zaakceptowany

## Kontekst

Second Brain wymaga warstwy frontendowej (chat, upload dokumentów) oraz backendowej (RAG pipeline: chunking, embeddingi, similarity search, wywołania Gemini API). Jako projekt solo developera priorytetem jest minimalizacja kontekstowego przełączania i szybkość dostarczenia.

Potrzebujemy jednego repozytorium, w którym frontend i API współistnieją, z możliwością hostingu całego pipeline RAG bez oddzielnego serwera backendowego.

## Decyzja

Wybieramy **Next.js 14 z App Router** jako fullstack framework. Frontend i API routes żyją w jednym projekcie. RAG pipeline (chunking, embeddingi, similarity search) jest implementowany jako Route Handlers (`/api/chat`, `/api/upload`) w tym samym repo.

App Router upraszcza routing, a server components redukują ilość JS wysyłanego do klienta — istotne dla czasu ładowania chat UI.

## Rozważane alternatywy

- **Vite + React SPA** — wymaga oddzielnego backendu lub innego rozwiązania dla API; dwa projekty do zarządzania
- **Remix** — podobna filozofia, mniejsza ekosystemowość i dokumentacja dla integracji z Firebase
- **SvelteKit** — mniejsza popularność, mniej gotowych rozwiązań integracyjnych

## Konsekwencje

**Pozytywne:**
- Jeden repo, jeden deployment — brak context switching
- RAG pipeline w Route Handlers — zero oddzielnego serwera
- Server components — szybszy pierwszy load chat UI
- Naturalna integracja z Vercel — zero konfiguracji deployu

**Negatywne:**
- App Router ma stromą krzywą uczenia dla osób znających tylko Pages Router
- SSR może komplikować real-time UI czatu — rozwiązanie: Streaming Response z Gemini API

## Stan aplikacji (luty 2026)

Aktualny stack to **Vite + React (SPA) + Express** (serwer w `server.ts`), nie Next.js. API: auth, documents, notes, chat (RAG), plan, calendar, tasks, tags, upload — trasy Express. Hosting dowolny (np. Railway, Render), nie Vercel. ADR-001 pozostaje zapisem docelowej opcji (Next.js); ewentualna migracja na Next.js w przyszłości.
