# ADR-010: Firebase Firestore od Etapu 1 (no-code)

## Status

Zaakceptowany

## Kontekst

Strategia dwuetapowa (ADR-013) zakłada Etap 1 no-code (Carrd, Tally, Glide, Make) do walidacji, zanim zbudujemy właściwy produkt w Next.js. Etap 1 potrzebuje bazy do zbierania maili z waitlisty i kontaktów. Alternatywą było Airtable — popularny w no-code flows, łatwy w integracji z Tally i Make.

Kluczowe pytanie: czy dane z Etapu 1 będą migrowane przy przejściu do Etapu 2? Migracja oznacza dodatkowy czas i ryzyko błędów.

## Decyzja

Używamy **Firebase Firestore** już w Etapie 1 — zanim napiszemy jakikolwiek kod. Formularz Tally (waitlista) łączy się z Firestore przez Make. Glide odczytuje dane z Firestore. Przy przejściu do Etapu 2 (Next.js) dane pozostają w Firestore — **brak migracji**.

Celowo odrzucamy Airtable pomimo prostoty w no-code: użycie Firestore od dnia 1 eliminuje migrację danych przy Etapie 2. Jednorazowa konfiguracja Make + Firestore w Etapie 1 to mniejszy koszt niż późniejsza migracja z Airtable.

## Rozważane alternatywy

- **Airtable** — popularny w no-code, prosta integracja z Tally; wymagałby migracji danych do Firestore przy Etapie 2
- **Google Sheets** — najprostszy; brak struktury dokumentów, trudna migracja do Firestore

## Konsekwencje

**Pozytywne:**
- Brak migracji przy Etapie 2 — dane od razu w docelowej bazie
- Spójność: Firestore w Etapie 1 i 2 — ten sam model danych
- Kontakty z waitlisty gotowe do wykorzystania w Next.js

**Negatywne:**
- Make + Firestore wymaga więcej konfiguracji niż Tally + Airtable — akceptowalne jednorazowo
