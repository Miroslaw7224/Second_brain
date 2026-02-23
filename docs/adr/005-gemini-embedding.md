# ADR-005: Gemini text-embedding-004 do wektoryzacji

## Status

Zaakceptowany

## Kontekst

RAG wymaga wektoryzacji dokumentów — każdy chunk tekstu jest zamieniany na wektor (embedding), który następnie służy do similarity search. Potrzebujemy modelu embeddingowego z dobrą jakością dla polskiego i angielskiego tekstu, przy rozsądnym koszcie.

Projekt używa Gemini 1.5 Flash do generowania odpowiedzi — spójność dostawcy API (embeddingi + chat) minimalizuje liczbę kluczy i billingów.

## Decyzja

Wybieramy **Gemini text-embedding-004** do wektoryzacji dokumentów. Wektory 768-wymiarowe — wystarczające dla Q&A na dokumentach prywatnych freelancerów. Jeden dostawca API (Google) dla embeddingów i chatu. Limit $20/msc w Google Cloud Console jako hard cap na niespodziewane koszty.

## Rozważane alternatywy

- **OpenAI text-embedding-3-small** — wyższa jakość w niektórych domenach; droższy, dodatkowy dostawca API
- **Cohere Embed** — dobra jakość; dodatkowy serwis i billing
- **Lokalne modele (all-MiniLM)** — zerowy koszt API; niższa jakość, wymaga self-hostingu

## Konsekwencje

**Pozytywne:**
- Jeden dostawca (Google) — mniej kluczy, billingów, punktów awarii
- Niższy koszt niż OpenAI przy porównywalnej jakości dla polskiego/angielskiego
- Wektory 768-wymiarowe — wystarczające dla Q&A
- Interfejs embeddingów abstrahowalny — łatwa zamiana dostawcy w przyszłości

**Negatywne:**
- Nieznacznie niższa jakość niż OpenAI dla specjalistycznych domen — nieistotne dla notatek freelancerów
- Zależność od dostępności Google API — ryzyko łagodzone przez prostotę zamiany
