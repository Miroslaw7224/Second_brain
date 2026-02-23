# ADR-014: Separacja warstw i Service Layer

## Status

Zaakceptowany

## Kontekst

Separacja warstw to decyzja o największym wpływie na codzienne życie z kodem — szczególnie przy solo developerze, gdzie łatwo o „szybkie skróty", które potem bolą. Zapisanie tego jako ADR tworzy kontrakt z samym sobą.

W Next.js technicznie możesz wywołać Firestore lub Gemini bezpośrednio z Server Component — i to jest pułapka: zaczyna wyglądać jak dobry pomysł (mniej plików, „prostszy" flow), a skutkuje mieszaniem UI z infrastrukturą, trudnym testowaniem i kruchością przy zmianach. Bez wyraźnej warstwy serwisowej Route Handlery mają tendencję do robienia się grubych: w jednym miejscu ląduje HTTP, walidacja, auth, logika RAG i wywołania Firestore/Gemini. Testujesz wtedy HTTP zamiast logiki.

Potrzebujemy jasnych granic: kto z kim rozmawia, gdzie leży logika biznesowa i gdzie — infrastruktura. Potrzebujemy też mapowania na foldery, żeby ADR był actionable: developer (lub Cursor) wie, gdzie co pisać.

## Decyzja

Wprowadzamy **czterowarstwowy model** z wyraźną **Service Layer** między Route Handlers a infrastrukturą:

```
UI (komponenty, strony)
  ↓ wywołuje tylko API routes / Server Actions
Route Handlers (HTTP, walidacja, auth)
  ↓ wywołują tylko Services
Services (logika biznesowa)
  ↓ wywołują tylko moduły z lib/
Infrastructure (Firestore, Storage, Gemini, Stripe)
```

**Zasady:**

1. **UI nie dotyka Firestore/Gemini/Stripe bezpośrednio.** Nawet z Server Components — UI wywołuje wyłącznie Route Handlery (fetch do `/api/...`) lub Server Actions, które z kolei delegują do Services. Żadnego `getFirestore()` ani `genai` w komponentach.
2. **Route Handlery są cienkie:** parsowanie requestu, walidacja wejścia, weryfikacja auth (np. session), wywołanie jednego lub kilku serwisów, zwrócenie response. Żadnej logiki RAG ani operacji na Firestore w handlerze.
3. **Logika biznesowa wyłącznie w Service Layer:** np. `ragService.query(userId, question)`, `documentService.ingest(userId, text)`. Serwisy orchestrują wywołania do infrastruktury (lib) i zawierają reguły domenowe. Dają się testować jednostkowo bez HTTP (np. `ragService.query()` z mockami Firestore/Gemini).
4. **Infrastruktura w `lib/`:** klienty i wrappery do Firestore, Storage, Gemini API, Stripe. Serwisy importują tylko z `lib/`, nie z SDK-ów bezpośrednio w serwisach (opcjonalnie dopuszczalne dla prostoty na MVP, ale granica: serwis nie zna szczegółów HTTP/konfiguracji zewnętrznych API).

**Mapowanie na foldery (Next.js App Router):**

| Warstwa | Lokalizacja | Przykłady |
|--------|-------------|-----------|
| UI | `app/`, `components/` | `app/page.tsx`, `app/chat/page.tsx`, `components/ChatPanel.tsx` |
| Route Handlers | `app/api/` | `app/api/chat/route.ts`, `app/api/documents/route.ts` |
| Services | `services/` | `services/ragService.ts`, `services/documentService.ts`, `services/subscriptionService.ts` |
| Infrastructure | `lib/` | `lib/firestore.ts`, `lib/gemini.ts`, `lib/stripe.ts`, `lib/storage.ts` |

Dopuszczalne: `lib/` może zawierać też współdzielone narzędzia (utils, typy), przy czym klienty zewnętrznych systemów (Firestore, Gemini, Stripe) są w `lib/` i to one są wywoływane wyłącznie z `services/`.

## Rozważane alternatywy

- **Bez Service Layer:** logika w Route Handlers — szybsze na start, ale grube handlery i testowanie przez HTTP; odrzucone.
- **UI może wywoływać Firestore w Server Components:** „bo to serwer i wygodnie" — prowadzi do rozproszenia logiki i braku jednego miejsca do testów; odrzucone.
- **Brak mapowania na foldery:** pozostawienie granic tylko „w głowie" — mniejsza actionable; odrzucone na rzecz jawnego podziału na `app/`, `app/api/`, `services/`, `lib/`.

## Konsekwencje

**Pozytywne:**
- Kontrakt z samym sobą: UI nie dotyka infrastruktury — mniej pułapek w Next.js (Server Components + Firestore).
- Testowalność: `ragService.query()` i `documentService.ingest()` testowane bez HTTP; Route Handlery można testować jako cienką warstwę.
- Jedno miejsce na logikę domenową (Services) — łatwiejsze zmiany i onboarding (lub Cursor).
- Actionable ADR: jasne foldery (`/services/`, `/lib/`) — wiadomo, gdzie co pisać.

**Negatywne:**
- Więcej plików i jednego poziomu indirekcji — akceptowalne za czytelność i testy.
- Trzeba dyscyplinować się, żeby nie „skrócić" przez wywołanie Firestore/Gemini z komponentu — ADR służy właśnie jako przypomnienie.
