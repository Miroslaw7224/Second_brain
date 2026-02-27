# ADR-012: Stripe dla płatności

**Status: Zarchiwizowany.** Treść wchłonięta do ADR-017 (Plany na Etap 2 — Cloud Functions i Stripe). Oryginalna treść poniżej.

---

## Status (oryginalny)

Zaakceptowany

## Kontekst

Second Brain ma model płatny: Free Trial 7 dni (bez karty), plan Solo $19/msc. Potrzebujemy obsługi subskrypcji — aktywacja, anulowanie, nieudane płatności. Krytyczne: nie budować własnego formularza płatności (bezpieczeństwo, PCI compliance). Webhooks do synchronizacji statusu subskrypcji z aplikacją.

W Etapie 1 używany jest Stripe Payment Link (bez integracji SDK). Etap 2 wymaga pełnej integracji (Checkout, Customer Portal, webhooks).

## Decyzja

Wybieramy **Stripe** jako dostawcę płatności. Integracja przez `stripe` npm package z Next.js. Stripe Checkout eliminuje potrzebę budowania własnego formularza płatności. Webhooks obsługiwane przez Firebase Cloud Functions — synchronizacja statusu subskrypcji z Firestore.

Na MVP: jeden plan $19/msc + Free Trial 7 dni bez karty kredytowej.

## Rozważane alternatywy

- **Paddle** — obsługa VAT globalnie; mniej standardowy w SaaS, inne flow
- **LemonSqueezy** — prosty; mniejsza elastyczność, mniej standardowy
- **Gumroad** — dla produktów cyfrowych; mniej dopasowany do subskrypcji SaaS

## Konsekwencje

**Pozytywne:**
- Standard branżowy SaaS — dobra dokumentacja, SDK
- Stripe Checkout — brak własnego formularza, PCI compliance po stronie Stripe
- Webhooks niezawodne — obsługa przez Cloud Functions
- Dane klientów zostają przy upgrade z Payment Link do pełnego SDK

**Negatywne:**
- Prowizja 2.9% + $0.30 per transakcja — przy $19/msc ~$0.85, akceptowalne
- Paddle/LemonSqueezy obsługują VAT globalnie lepiej — rozważyć przy ekspansji poza US/EU

## Stan aplikacji (luty 2026)

Stripe nie jest zintegrowany. Planowane na Etap 2 (Cloud Functions + webhook, Checkout, Customer Portal).
