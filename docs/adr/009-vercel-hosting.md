# ADR-009: Vercel jako platforma hostingu

## Status

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

## Stan aplikacji (luty 2026)

Aplikacja to Vite + Express, nie Next.js — hosting poza Vercel (np. Railway, Render, VPS). Vercel pozostaje docelową opcją przy ewentualnej migracji na Next.js (ADR-001).
