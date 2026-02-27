# ADR-008: Firebase Cloud Functions dla automatyzacji

**Status: Zarchiwizowany.** Treść wchłonięta do ADR-017 (Plany na Etap 2 — Cloud Functions i Stripe). Oryginalna treść poniżej.

---

## Status (oryginalny)

Zaakceptowany

## Kontekst

Second Brain wymaga automatyzacji po stronie serwera: emaile powitalne, onboarding (tworzenie struktury Firestore po rejestracji), powiadomienia o limicie dokumentów, webhook Stripe. W Etapie 1 (no-code) te zadania obsługuje Make (Integromat). Przy przejściu do Etapu 2 (Next.js) Make powinien być zastąpiony rozwiązaniem w tym samym ekosystemie.

Priorytet: spójność z Firebase, brak dodatkowego konta i billingu, triggery oparte na zdarzeniach (Firestore, Auth).

## Decyzja

Wybieramy **Firebase Cloud Functions** do automatyzacji w Etapie 2. Zastępuje Make — triggery na zdarzeniach Firestore (`onDocumentCreated`, `onDocumentUpdated`), Auth (`onUserCreate`), oraz HTTPS functions dla webhooków Stripe.

Przypadki użycia:
- Email powitalny — trigger po rejestracji
- Onboarding — automatyczne tworzenie kolekcji Firestore
- Alert limitu dokumentów — trigger gdy `documents count >= 45`
- Cleanup — usuwanie chunków po usunięciu dokumentu
- Webhook Stripe — obsługa subskrypcji (aktywacja, anulowanie, nieudana płatność)

## Rozważane alternatywy

- **Make (Integromat)** — używany w Etapie 1; osobne konto, webhooki zamiast natywnych triggerów
- **Zapier** — podobne do Make; droższy przy wzroście
- **Własny serwer Express** — wymaga hostingu, zarządzania; nadmiarowy na serverless stack

## Konsekwencje

**Pozytywne:**
- Natywny dostęp do Firestore, Auth, Storage — bez dodatkowej konfiguracji
- Triggery oparte na zdarzeniach — bez wystawiania publicznych endpointów
- Serverless — zero zarządzania serwerem, płatność za wykonanie
- Spójność ekosystemu Firebase

**Negatywne:**
- Cold start (100–500ms) przy rzadkich wywołaniach — nieistotne dla triggerów w tle
- Limit czasu wykonania 540s — wystarczający dla opisanych przypadków
- Lokalny development wymaga Firebase Emulator Suite — jednorazowy setup

## Stan aplikacji (luty 2026)

Cloud Functions nie są wdrożone. Backend to Next.js Route Handlers w `app/api/`. Automatyzacje (emaile powitalne, onboarding, webhook Stripe) pozostają w planach na Etap 2.
