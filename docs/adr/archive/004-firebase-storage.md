# ADR-004: Firebase Storage dla plików użytkownika

**Status: Zarchiwizowany.** Treść wchłonięta do ADR-003 (Firestore jako główna baza — podsekcja „Firebase Storage”). Oryginalna treść poniżej.

---

## Status (oryginalny)

Zaakceptowany

## Kontekst

Second Brain będzie przechowywać pliki użytkowników — na MVP dokumenty tekstowe, w przyszłości PDF i Word. Potrzebujemy serwisu storage z regułami bezpieczeństwa zsynchronizowanymi z autentykacją oraz prostym flow uploadu bez budowania własnego presigned URL.

Projekt już używa Firebase (Auth, Firestore) — dodatkowy serwis storage powinien być w tym samym ekosystemie.

## Decyzja

Wybieramy **Firebase Storage** do przechowywania plików użytkownika. Upload bezpośrednio z Next.js przez Firebase Client SDK — bez własnego presigned URL flow. Reguły bezpieczeństwa oparte na `request.auth.uid` (ten sam uid co Firestore i Auth).

Na MVP limit 10MB per plik i 3 pliki jednocześnie jest wystarczający.

## Rozważane alternatywy

- **Supabase Storage** — wymagałoby Supabase; projekt używa Firebase
- **AWS S3** — dodatkowy serwis, presigned URLs, osobna konfiguracja uprawnień
- **Cloudflare R2** — tańsze przy dużej skali; dodatkowy serwis, brak natywnej integracji z Firebase Auth

## Konsekwencje

**Pozytywne:**
- Zero dodatkowej konfiguracji w kontekście Firebase
- Reguły bezpieczeństwa zsynchronizowane z Firebase Auth — izolacja per user
- Brak presigned URL flow — prostszy upload
- Koszt pomijalny przy skali MVP

**Negatywne:**
- Droższe niż Cloudflare R2 przy dużej skali — nieistotne na MVP
- Brak edge CDN dla plików — nieistotne dla dokumentów tekstowych

## Stan aplikacji (luty 2026)

Firebase Storage nie jest wdrożony. Upload dokumentów odbywa się przez Express (multer, memoryStorage); treść zapisywana w Firestore (kolekcje documents + chunks). Decyzja z ADR pozostaje aktualna przy dodawaniu przechowywania binarnych plików.
