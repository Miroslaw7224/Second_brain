# ADR-007: Cosine similarity w Firestore zamiast dedykowanego vector store

## Status

Zaakceptowany

## Kontekst

RAG (Retrieval-Augmented Generation) wymaga wyszukiwania wektorowego: zapytanie użytkownika jest embedowane, następnie szukamy najbardziej podobnych chunków w bazie wiedzy. Na MVP limit to 50 dokumentów per user (~500–1000 chunków).

Alternatywy to dedykowane serwisy vector search (Pinecone, Weaviate, pgvector, Qdrant) lub obliczanie cosine similarity w aplikacji na danych z Firestore.

## Decyzja

Wybieramy **własną implementację cosine similarity** w Next.js API Route. Algorytm:
1. Pobierz wszystkie chunki użytkownika z Firestore (kolekcja `users/{userId}/chunks`)
2. Oblicz cosine similarity między wektorem zapytania a każdym wektorem chunka
3. Zwróć top-k najbardziej podobnych chunków

Bez dodatkowego serwisu — zero nowego konta, billingów i punktów awarii. Na MVP z ~500–1000 chunków czas wykonania < 100ms jest akceptowalny.

**Próg migracji:** Gdy użytkownik ma > 2000 chunków LUB latencja search > 500ms — migracja do Pinecone lub pgvector (szac. 1–2 dni pracy).

## Rozważane alternatywy

- **Pinecone** — dedykowany vector store, najlepsza wydajność; dodatkowy serwis, billing, konfiguracja
- **Weaviate / Qdrant** — self-hosted lub managed; więcej złożoności na MVP
- **pgvector (Supabase)** — wymagałoby zmiany z Firestore na PostgreSQL
- **Vertex AI Vector Search** — w ekosystemie Google; dodatkowy billing i konfiguracja

## Konsekwencje

**Pozytywne:**
- Zero dodatkowego serwisu — minimalna liczba zależności
- Brak dodatkowego billingu na MVP
- Prosty algorytm — łatwy do debugowania i modyfikacji
- Dane już w Firestore — brak migracji bazy przy ewentualnym przejściu na vector store

**Negatywne:**
- Wolniejsze przy dużej liczbie chunków — celowo odroczona optymalizacja
- Brak zaawansowanego filtrowania metadanych — wystarczające na MVP
- Pełne pobieranie chunków usera przy każdym zapytaniu — przy > 2000 chunków może być bottleneck

## Aktualizacja po wdrożeniu (2025)

Obecna implementacja RAG używa **wyszukiwania po słowach kluczowych** (keyword filter na treści chunków), nie cosine similarity na wektorach. Embeddingi nie są jeszcze zapisywane w chunkach. Decyzja z ADR pozostaje: przy rozroście (lub potrzebie lepszej jakości retrieval) dodać embeddingi + cosine similarity w aplikacji lub migracja do vector store.
