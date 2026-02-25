# ADR-013: Strategia dwuetapowa — walidacja no-code przed budową produktu

## Status

Zaakceptowany

## Kontekst

Jako solo founder priorytetem jest uniknięcie budowania produktu, za który nikt nie zapłaci. Klasyczny błąd: miesiące developmentu, dopiero potem walidacja rynkowa. Second Brain rozwiązuje problem rozproszonej wiedzy freelancerów — czy ten problem jest na tyle realny, że użytkownicy będą gotowi zapłacić $19/msc?

Kluczowe pytanie: *Czy ktoś za to zapłaci?* Odpowiedź ma przyjść zanim zainwestujemy tygodnie w Next.js + RAG.

## Decyzja

Wdrażamy **strategię dwuetapową**:

**Etap 1 — Walidacja no-code (5–7 dni):**
- Landing page: Carrd
- Formularz waitlisty: Tally (zbieranie maili)
- Baza kontaktów: Firebase Firestore (już docelowa baza — brak migracji)
- Aplikacja prototypowa: Glide
- Logika AI: Google AI Studio (prototypowanie promptów)
- Automatyzacje: Make (Integromat) — łączenie Tally, Firestore, emaile

Cel: 20+ maili na waitliście, 5 aktywnych użytkowników testujących, 3 rozmowy walidacyjne. Decyzja: budować dalej czy pivot?

**Etap 2 — Właściwy produkt (po walidacji):**
- Next.js z pełnym RAG
- Firebase Cloud Functions zamiast Make
- Stripe SDK zamiast Payment Link

Etap 2 startuje **tylko** po potwierdzeniu: problem jest realny, użytkownicy chcą płacić.

## Rozważane alternatywy

- **Od razu budować Next.js** — szybszy docelowy produkt, ale ryzyko miesiąców pracy na coś niepotrzebnego
- **Walidacja wyłącznie landingiem** — brak testu rzeczywistej aplikacji; użytkownik nie wie czy AI rozwiązuje problem
- **Airtable zamiast Firestore w Etapie 1** — odrzucone; wymagałoby migracji danych przy Etapie 2 (ADR-010)

## Konsekwencje

**Pozytywne:**
- Minimalizacja ryzyka — walidacja przed dużym inwestycją czasu
- Szybki feedback (5–7 dni) — decyzja o dalszym kierunku
- Firestore od Etapu 1 — brak migracji danych przy przejściu do Next.js
- Glide + Google AI Studio — ten sam ekosystem co docelowy stack (Gemini)

**Negatywne:**
- Etap 1 to throwaway UI (Glide) — celowy koszt
- Make zostanie zastąpiony przez Cloud Functions — przepisanie logiki (jednorazowe)
- Opóźnienie docelowego produktu o tydzień — akceptowalne za zmniejszenie ryzyka

## Stan aplikacji (luty 2026)

Produkt w fazie budowy: Vite + React + Express, Firestore, Gemini (RAG + plan). Etap 1 no-code nie był wdrożony w obecnym repo; aplikacja to wersja „Etap 2” z Express zamiast Next.js. Cloud Functions i Stripe w planach.
