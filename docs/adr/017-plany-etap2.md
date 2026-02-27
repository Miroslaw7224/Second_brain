# ADR-017: Plany na Etap 2 — Cloud Functions i Stripe

## Status

Zaplanowany (nie wdrożony)

## Kontekst

Strategia dwuetapowa (ADR-013) zakłada Etap 2 po walidacji. Obecna aplikacja to **Next.js 14 z App Router**; w Etapie 2 planowane są automatyzacje po stronie serwera oraz pełna integracja płatności. Niniejszy dokument zbiera decyzje **zaplanowane** na Etap 2 — Cloud Functions (zastąpienie Make) i Stripe (Checkout, webhooks). Stan aplikacji: żadna z tych rzeczy nie jest jeszcze wdrożona.

## Decyzje na Etap 2

### 1. Firebase Cloud Functions dla automatyzacji

Second Brain wymaga automatyzacji: emaile powitalne, onboarding (tworzenie struktury Firestore po rejestracji), powiadomienia o limicie dokumentów, webhook Stripe. W Etapie 1 te zadania obsługuje Make; przy przejściu do Etapu 2 Make ma być zastąpiony rozwiązaniem w ekosystemie Firebase.

**Decyzja:** **Firebase Cloud Functions** — triggery na zdarzeniach Firestore (`onDocumentCreated`, `onDocumentUpdated`), Auth (`onUserCreate`), oraz HTTPS functions dla webhooków Stripe.

Przypadki użycia:
- Email powitalny — trigger po rejestracji
- Onboarding — automatyczne tworzenie kolekcji Firestore
- Alert limitu dokumentów — trigger gdy `documents count >= 45`
- Cleanup — usuwanie chunków po usunięciu dokumentu
- Webhook Stripe — obsługa subskrypcji (aktywacja, anulowanie, nieudana płatność)

Alternatywy odrzucone: Make (osobne konto), Zapier, własny serwer Express (nadmiarowy na serverless). Konsekwencje: natywny dostęp do Firestore/Auth/Storage, triggery bez publicznych endpointów, cold start 100–500ms — nieistotny dla triggerów w tle.

### 2. Stripe dla płatności

Model: Free Trial 7 dni (bez karty), plan Solo $19/msc. Wymagana obsługa subskrypcji — aktywacja, anulowanie, nieudane płatności. Nie budujemy własnego formularza (PCI compliance).

**Decyzja:** **Stripe** — integracja przez `stripe` npm package. Stripe Checkout eliminuje własny formularz. Webhooks obsługiwane przez Firebase Cloud Functions — synchronizacja statusu subskrypcji z Firestore. Na MVP: jeden plan $19/msc + Free Trial 7 dni bez karty.

Alternatywy odrzucone: Paddle, LemonSqueezy, Gumroad. Konsekwencje: standard SaaS, PCI po stronie Stripe; prowizja ~$0.85 przy $19/msc — akceptowalne.

## Stan aplikacji (luty 2026)

Cloud Functions i Stripe **nie są wdrożone**. Backend to Next.js Route Handlers w `app/api/`, serwisy w `services/`, infrastruktura w `lib/`. Automatyzacje i płatności pozostają w planach na Etap 2.

## Powiązane archiwalne ADR-y

Treść dawnych ADR-008 (Cloud Functions) i ADR-012 (Stripe) została wchłonięta do niniejszego ADR-017. Oryginały przeniesione do `docs/adr/archive/`.
