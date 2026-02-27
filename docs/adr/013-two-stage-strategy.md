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
- Baza kontaktów: Firebase Firestore (już docelowa baza — brak migracji; patrz: Firestore od Etapu 1)
- Aplikacja prototypowa: Glide
- Logika AI: Google AI Studio (prototypowanie promptów)
- Automatyzacje: Make (Integromat) — łączenie Tally, Firestore, emaile

Cel: 20+ maili na waitliście, 5 aktywnych użytkowników testujących, 3 rozmowy walidacyjne. Decyzja: budować dalej czy pivot?

**Etap 2 — Właściwy produkt (po walidacji):**  
Szczegóły planów (Cloud Functions, Stripe, hosting) — patrz [ADR-017: Plany na Etap 2](017-plany-etap2.md).

Etap 2 startuje **tylko** po potwierdzeniu: problem jest realny, użytkownicy chcą płacić.

---

### Firestore od Etapu 1 (brak migracji)

Etap 1 potrzebuje bazy do zbierania maili z waitlisty i kontaktów. Kluczowe: czy dane z Etapu 1 będą migrowane przy przejściu do Etapu 2? Migracja = dodatkowy czas i ryzyko błędów.

**Decyzja:** Używamy **Firebase Firestore** już w Etapie 1 — zanim napiszemy jakikolwiek kod. Formularz Tally (waitlista) łączy się z Firestore przez Make. Glide odczytuje dane z Firestore. Przy przejściu do Etapu 2 dane pozostają w Firestore — **brak migracji**.

Celowo odrzucamy Airtable (popularny w no-code, prosta integracja z Tally): użycie Firestore od dnia 1 eliminuje migrację danych przy Etapie 2. Jednorazowa konfiguracja Make + Firestore to mniejszy koszt niż późniejsza migracja z Airtable. Alternatywy odrzucone: Google Sheets — brak struktury dokumentów, trudna migracja.

## Rozważane alternatywy

- **Od razu budować Next.js** — szybszy docelowy produkt, ale ryzyko miesiąców pracy na coś niepotrzebnego
- **Walidacja wyłącznie landingiem** — brak testu rzeczywistej aplikacji; użytkownik nie wie czy AI rozwiązuje problem
- **Airtable zamiast Firestore w Etapie 1** — odrzucone; wymagałoby migracji danych przy Etapie 2

## Konsekwencje

**Pozytywne:**
- Minimalizacja ryzyka — walidacja przed dużym inwestycją czasu
- Szybki feedback (5–7 dni) — decyzja o dalszym kierunku
- Firestore od Etapu 1 — brak migracji danych przy przejściu do Etapu 2
- Glide + Google AI Studio — ten sam ekosystem co docelowy stack (Gemini)

**Negatywne:**
- Etap 1 to throwaway UI (Glide) — celowy koszt
- Make zostanie zastąpiony przez Cloud Functions — przepisanie logiki (jednorazowe)
- Opóźnienie docelowego produktu o tydzień — akceptowalne za zmniejszenie ryzyka

## Stan aplikacji (po migracji)

Produkt: Next.js 14 z App Router, Firestore, Gemini (RAG + plan). API: Route Handlers w `app/api/`. Chronione trasy: route group `(protected)` z guardem, `/auth/login`. Cloud Functions i Stripe w planach (ADR-017).

**Zastąpiony ADR:** treść ADR-010 (Firestore od Etapu 1) wchłonięta do niniejszego ADR-013.
