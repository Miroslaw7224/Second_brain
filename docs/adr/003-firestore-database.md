# ADR-003: Firestore jako główna baza danych

## Status

Zaakceptowany

## Kontekst

Second Brain potrzebuje bazy danych do przechowywania:
- metadanych dokumentów użytkownika,
- chunków tekstu z wektorami embeddingów,
- danych waitlisty i użytkowników (integracja z Firebase Auth).

Na etapie MVP struktura dokumentów może się zmieniać (różne typy notatek, metadane). Priorytetem jest serverless — zero zarządzania serwerem i migracji schematu.

Kluczowy wymóg: wektory embeddingów muszą być przechowywane w sposób umożliwiający similarity search na etapie RAG.

## Decyzja

Wybieramy **Firestore (NoSQL)** jako główną bazę danych.

Struktura kolekcji:
```
users/{userId}/documents/{docId}  → metadane dokumentu
users/{userId}/chunks/{chunkId}   → chunk + wektor embeddingu (pole tablicowe)
```

Firestore jest serverless — zero konfiguracji serwera, zero migracji schematu, automatyczne skalowanie. Elastyczność NoSQL pozwala na zmiany struktury bez migracji. Cosine similarity jest obliczane w Next.js API Route — bez dedykowanego vector store na MVP.

## Rozważane alternatywy

- **PostgreSQL (Supabase)** — wymaga migracji schematu, pgvector dostępny ale dodaje złożoność
- **PlanetScale** — SQL, brak natywnego wsparcia dla wektorów
- **MongoDB Atlas** — podobna elastyczność, mniejsza integracja z Firebase Auth i regułami bezpieczeństwa

## Konsekwencje

**Pozytywne:**
- Serverless — brak DevOps
- Natywne reguły bezpieczeństwa z Firebase Auth (`request.auth.uid`) — izolacja danych per user
- Elastyczna struktura dokumentów — zmiany bez migracji
- Embeddingi jako pola w Firestore — jeden serwis, brak dodatkowego vector store na MVP

**Negatywne:**
- Cosine similarity w kodzie aplikacji wolniejsze niż dedykowany vector store — akceptowalne do ~2000 chunków/user
- Przy skalowaniu (10k+ chunków/user) konieczna migracja do Pinecone lub pgvector — świadomy wybór z progiem migracji
