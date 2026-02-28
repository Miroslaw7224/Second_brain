# ADR-009: Vercel jako platforma hostingu

**Status: Zaakceptowany (po migracji).** Aplikacja została zmigrowana z Vite + Express na Next.js 14 (App Router). Hosting na Vercel jest aktualny i zalecany. Oryginalna treść poniżej.

---

## Status (oryginalny)

Zaakceptowany

## Kontekst

Next.js wymaga hostingu. Priorytetem na MVP jest zero konfiguracji deploymentu, automatyczne preview per branch (PR), globalna sieć CDN. Free tier powinien wystarczyć na wczesne etapy produktu z kilkoma użytkownikami.

Stack: Next.js na froncie + API, Firebase na backend — hosting dotyczy wyłącznie aplikacji Next.js.

## Decyzja

Wybieramy **Vercel** jako platformę hostingu dla Next.js. Zero konfiguracji — naturalny host dla Next.js. Automatyczny preview per branch, edge CDN globalnie. Free tier (Hobby) wystarczający na MVP. Vercel + Firebase to sprawdzony duet — Next.js na Vercel, backend services na Firebase, zero serwera do zarządzania.

## Rozważane alternatywy

- **Railway** — dobre dla fullstack; wymaga więcej konfiguracji
- **Render** — alternatywa; mniej zoptymalizowany dla Next.js
- **AWS Amplify** — możliwy; bardziej złożony setup
- **Fly.io** — elastyczny; wymaga konfiguracji Docker/Next.js

## Konsekwencje

**Pozytywne:**
- Zero konfiguracji deployu — git push = deploy
- Preview per PR — testowanie przed merge
- Edge CDN — szybki dostęp globalnie
- Free tier Hobby na MVP

**Negatywne:**
- Vercel Hobby ma limity (100GB bandwidth, brak team features) — przy wzroście upgrade do Pro ($20/msc)
- Serverless cold start — nieistotne dla rzadkich requestów na MVP

## Wdrożenie Vercel (luty 2026)

- **Vercel CLI** — zainstalowany w projekcie jako `devDependency` (`vercel`). W `package.json` skrypty: `npm run vercel` (deploy preview), `npm run vercel:prod` (deploy na produkcję).
- **Deploy** — `vercel` uruchamia deploy do preview; `vercel --prod` do produkcji. Projekt można połączyć z repozytorium Git (GitHub itd.) dla automatycznych deployów przy pushu; możliwy jest też deploy wyłącznie z CLI bez linkowania do repo.
- **Firebase Auth** — domena aplikacji na Vercel (np. `*.vercel.app` lub domena własna) musi być dodana w Firebase Console → Authentication → Settings → **Authorized domains**. Bez tego logowanie (np. Google) zwraca błąd `auth/unauthorized-domain`.
- **Zmienne środowiskowe** — w Vercel (Project → Settings → Environment Variables) ustawia się te same zmienne co lokalnie (np. konfiguracja Firebase, klucze API), osobno dla preview i produkcji.

## Stan aplikacji (luty 2026)

Aplikacja to Next.js 14 z App Router — hosting na Vercel jest naturalną opcją. Zob. ADR-013 (stan po migracji). Wdrożenie: Vercel CLI w projekcie, skrypty `vercel` / `vercel:prod`; domena Vercel dodana do Firebase Authorized domains; zmienne środowiskowe ustawione w Vercel Dashboard.
