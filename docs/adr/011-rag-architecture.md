# ADR-011: Architektura RAG — Retrieval-Augmented Generation

## Status

Zaakceptowany

## Kontekst

Second Brain ma odpowiadać na pytania freelancerów w oparciu o ich własne dokumenty (notatki, wyceny, ustalenia z klientami). AI nie może halucynować — odpowiedzi muszą być zakotwiczone w rzeczywistej treści dokumentów użytkownika.

Użytkownik musi widzieć źródło każdej odpowiedzi (z jakiego dokumentu pochodzi informacja), aby móc ją zweryfikować.

## Decyzja

Wdrażamy **Retrieval-Augmented Generation (RAG)** jako architekturę odpowiedzi AI.

Pipeline:
1. **Chunking** — dokumenty są dzielone na fragmenty (chunki) o ustalonej wielkości
2. **Embedding** — każdy chunk jest wektoryzowany przez Gemini text-embedding-004
3. **Similarity search** — zapytanie użytkownika jest embedowane; cosine similarity wyszukuje najbliższe chunki
4. **Prompt + kontekst** — top-k chunków + zapytanie trafiają do Gemini 1.5 Flash
5. **Odpowiedź** — LLM generuje odpowiedź wyłącznie na podstawie dostarczonego kontekstu
6. **Źródło** — każda odpowiedź zawiera informację o dokumencie źródłowym

AI odpowiada wyłącznie na podstawie dokumentów użytkownika — brak dostępu do wiedzy ogólnej poza kontekstem. Każda odpowiedź cytuje źródło.

## Rozważane alternatywy

- **Fine-tuning modelu** — zbyt duży koszt i złożoność na MVP; wymaga stale aktualizowanego zbioru treningowego
- **Pełny prompt bez retrieval** — przy wielu dokumentach przekracza limit tokenów; brak precyzyjnego wyszukiwania
- **Hybryda (RAG + wiedza ogólna)** — celowo odrzucona; produkt ma być asystentem pamięci, nie ogólnym chatbotem

## Konsekwencje

**Pozytywne:**
- Odpowiedzi zakotwiczone w rzeczywistych dokumentach — minimalizacja halucynacji
- Źródło każdej odpowiedzi — weryfikowalność dla użytkownika
- Możliwość skalowania bazy wiedzy bez ponownego trenowania modelu
- Prosty flow: chunking → embedding → search → prompt → odpowiedź

**Negatywne:**
- Jakość odpowiedzi zależy od jakości chunkingu i similarity search — wymaga iteracji
- Koszt API: embedding + LLM przy każdym zapytaniu — monitorować przy wzroście ruchu

## Stan aplikacji (luty 2026)

Pipeline RAG wdrożony w `services/ragService.ts` (Express). Retrieval po słowach kluczowych (ADR-007), bez embeddingów. Chunking: paragrafy (split po podwójnej newline). Odpowiedź zawiera `text` i `sources` (źródła). Planowanie z kontekstem kalendarza w `planService.ask`.
