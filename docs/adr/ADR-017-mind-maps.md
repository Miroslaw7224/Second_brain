# ADR-017: Funkcja Map Myśli (Mind Maps)

**Status:** Zaakceptowany, **wdrożony** (marzec 2026)  
**Data:** 2026-03-18 (aktualizacja stanu: 2026-03-28)  
**Autor:** Mirosław  
**Powiązane ADR:** ADR-014 (Architektura warstw), ADR-015 (Strategia testów)

---

## Kontekst

Drugi Mózg jest narzędziem dla freelancerów do zarządzania wiedzą. Użytkownicy gromadzą notatki, zasoby i plany — ale brakuje im narzędzia do **wizualnego porządkowania i eksploracji wiedzy**. Mapy myśli wypełniają tę lukę: pozwalają tworzyć hierarchiczne struktury pojęć, wzbogacać je notatkami i generować za pomocą AI.

Inspiracją jest podejście NotebookLM — AI generuje strukturę z istniejących treści, a użytkownik ją zatwierdza i edytuje. W Drugim Mózgu przyjęto wariant hybrydowy: AI wyszukuje informacje z internetu na żądanie, a użytkownik może też budować mapę ręcznie od zera.

---

## Decyzja

Implementujemy funkcję Map Myśli jako **zakładkę w module Wiedza** (`MindMapsTab` w `src/features/mind-maps/`, obok chatu / notatek / zasobów), opartą na **drzewiastym widoku poziomym** (lewa → prawa) z **dolnym panelem notatek**.

---

## Szczegóły decyzji

### 1. Model danych — Firestore

Całe drzewo mapy myśli przechowujemy jako **jeden dokument Firestore** z zagnieżdżoną strukturą JSON.

```typescript
// Kolekcja: users/{userId}/mindMaps/{mapId}
interface MindMap {
  id: string;
  userId: string;
  title: string;
  rootNode: MindMapNode;
  colWidths: Record<number, number>; // szerokości kolumn per głębokość
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface MindMapNode {
  id: string; // nanoid() — unikalny w obrębie mapy
  label: string;
  note: string; // rich text (TipTap JSON lub HTML)
  collapsed: boolean; // stan UI — persystowany w dokumencie
  children: MindMapNode[];
}
```

**Uzasadnienie:** Mapy myśli są odczytywane i zapisywane jako całość — przechowywanie węzłów jako osobnych dokumentów w kolekcji generowałoby kosztowne N+1 reads przy każdym renderowaniu. Limit 1MB dokumentu Firestore jest w praktyce nieosiągalny przy rozsądnych mapach myśli (tysiące węzłów).

**Trigger migracji do osobnej kolekcji węzłów:** gdy mapa regularnie przekracza 500 węzłów lub 500KB.

---

### 2. Tryby tworzenia

#### Tryb A — AI z internetu

1. Użytkownik wpisuje hasło (np. `n8n`, `LangChain`)
2. Route handler wywołuje Gemini z włączonym **Google Search grounding**
3. Gemini zwraca strukturę: `{ label, description }` dla węzła
4. Użytkownik widzi podgląd opisu → zatwierdza lub odrzuca
5. Po zatwierdzeniu węzeł jest dodawany do drzewa, opis trafia do pola `note`

```typescript
// Przykładowy prompt dla Gemini
const prompt = `
  Wyszukaj informacje o narzędziu: "${query}".
  Odpowiedz TYLKO w formacie JSON (bez markdown):
  {
    "label": "Krótka nazwa (max 4 słowa)",
    "description": "Opis narzędzia (2-4 zdania, po polsku)"
  }
`;
```

#### Tryb B — Ręczny

Użytkownik buduje drzewo samodzielnie od pustego węzła root. Brak wywołań AI.

#### Tryb C — Import (tekst i/lub obraz)

Użytkownik może wkleić strukturę tekstową i/lub przesłać **obraz** (np. zrzut ekranu mapy z innego narzędzia). `POST /api/mind-maps/import` przyjmuje `multipart/form-data` (`structureText`, opcjonalnie pole pliku obrazu); backend (`mindMapAIService.importMindMap`) buduje lub uzupełnia drzewo węzłów. Limit rozmiaru obrazu po stronie API (np. 5MB) — patrz implementacja w `app/api/mind-maps/import/route.ts`.

---

### 3. Architektura warstw (zgodna z ADR-014)

```
UI
  MindMapsTab             — lista map + edytor (toolbar, drzewo, dolny panel) w zakładce Wiedza
  MindMapTree             — renderowanie drzewa poziomego i węzłów (pill)
  (modale)                — AI węzeł / import poddrzewa / usuwanie mapy — w obrębie MindMapsTab
        ↓
Route Handlers
  POST   /api/mind-maps                   — utwórz nową mapę
  GET    /api/mind-maps                   — lista map użytkownika
  GET    /api/mind-maps/[id]              — pobierz mapę
  PATCH  /api/mind-maps/[id]             — zapisz całe drzewo (debounced)
  DELETE /api/mind-maps/[id]             — usuń mapę
  POST   /api/mind-maps/ai-node          — generuj węzeł przez AI
  POST   /api/mind-maps/import           — import: opcjonalny tekst struktury + opcjonalny obraz (screenshot mapy); Gemini Vision / parser → drzewo węzłów
        ↓
Services
  mindMapService.ts
    createMindMap(userId, title)
    getMindMaps(userId)
    getMindMap(userId, mapId)
    saveMindMap(userId, mapId, rootNode, colWidths)
    deleteMindMap(userId, mapId)
  mindMapAIService.ts
    generateNodeFromWeb(query): Promise<{ label, description }>
    importMindMap(...) — struktura z tekstu i/lub obrazu (Vision)
        ↓
Infrastructure / lib
  Firestore  — users/{userId}/mindMaps
  Gemini API — Google Search grounding + modele multimodalne przy imporcie obrazu
```

---

### 4. UI — widok drzewa

**Format:** Drzewo poziome — root po lewej, każdy poziom zagłębia się w prawo.

**Algorytm layoutu:**  
Każdy węzeł zajmuje wysokość proporcjonalną do liczby widocznych liści w jego poddrzewie (`leafCount × ROW_H + (leafCount - 1) × GAP_H`). Węzeł nadrzędny jest wyśrodkowany względem całej swojej gałęzi. Linie łączące są rysowane matematycznie — eliminuje to nakładanie się węzłów przy mieszanych stanach rozwinięcia.

**Szerokości kolumn:**  
Wszystkie węzły na tym samym poziomie głębokości mają **identyczną szerokość**. Szerokość każdego poziomu jest niezależnie konfigurowalna przez użytkownika (drag uchwytu na prawej krawędzi węzła). Ustawienia szerokości są persystowane w dokumencie (`colWidths: Record<depth, px>`).

**Domyślna szerokość:** 150px, min 80px, max 300px.

---

### 5. Interakcje z węzłami

| Akcja                       | Sposób wywołania                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| Rozwiń / zwiń gałąź         | Klik na ikonę `›` przy węźle                                                                          |
| Zwiń całą gałąź (z dziećmi) | Klik na węzeł nadrzędny — jedno kliknięcie zwija wszystko pod nim                                     |
| Rozwijanie gałęzi           | Niezależne — rozwinięcie jednej gałęzi nie zwija pozostałych                                          |
| Zwiń / rozwiń całą mapę     | Przyciski w toolbarze                                                                                 |
| Edycja nazwy węzła          | Podwójny klik na etykietę → edycja inline (Enter = zatwierdź, Escape = anuluj)                        |
| Dodaj dziecko               | Przycisk `+` przy węźle                                                                               |
| Dodaj węzeł powyżej         | Menu `···` → "Wstaw węzeł powyżej" (węzeł wstawia się między bieżący a jego rodzica)                  |
| Usuń węzeł                  | Menu `···` → "Usuń węzeł" → modal z wyborem strategii                                                 |
| Przenieś / zagnieźdź węzeł  | Drag & drop na inny węzeł — przenoszony węzeł staje się **dzieckiem** celu (np. „Agenci AI” pod „AI”) |
| Dodaj przez AI              | Przycisk `✦` przy węźle → modal AI search                                                             |
| Edycja notatek              | Klik na węzeł → dolny panel → pole rich text (TipTap)                                                 |
| Zmiana szerokości kolumny   | Drag uchwytu `│` na prawej krawędzi węzła                                                             |

---

### 6. Usuwanie węzłów — strategia

Gdy usuwany węzeł ma dzieci, użytkownik widzi modal z dwoma opcjami:

- **"Usuń tylko ten węzeł"** — dzieci awansują o jeden poziom wyżej (stają się dziećmi rodzica usuniętego węzła)
- **"Usuń całą gałąź"** — węzeł i wszystkie jego potomki są usuwane (z potwierdzeniem)

Węzły bez dzieci są usuwane po jednym potwierdzeniu bez dodatkowego wyboru.

---

### 7. Persystencja i zapis

Zapis mapy do Firestore odbywa się z **debounce 1500ms** po każdej zmianie struktury drzewa lub notatki. Nie ma przycisku "Zapisz" — zapis jest automatyczny i ciągły.

Stan `collapsed` węzłów **jest persystowany** — użytkownik wraca do mapy w tym samym stanie widoku co przy ostatniej wizycie.

Stan `colWidths` **jest persystowany** — niestandardowe szerokości kolumn są zapamiętywane per mapa.

---

### 8. Generowanie AI — szczegóły integracji

```typescript
// services/mindMapAIService.ts
async function generateNodeFromWeb(query: string): Promise<AINodeResult> {
  const response = await geminiClient.generateContent({
    contents: [{ role: "user", parts: [{ text: buildPrompt(query) }] }],
    tools: [{ googleSearch: {} }], // Google Search grounding
  });

  const text = response.candidates[0].content.parts[0].text;
  return JSON.parse(text) as AINodeResult; // { label, description }
}
```

Gemini z Google Search grounding jest już dostępny w projekcie — brak nowych zależności.

---

### 9. Zależności

| Zależność  | Wersja     | Powód                        |
| ---------- | ---------- | ---------------------------- |
| `nanoid`   | istniejąca | Generowanie ID węzłów        |
| `TipTap`   | istniejąca | Rich text w panelu notatek   |
| Firestore  | istniejący | Persystencja map             |
| Gemini API | istniejący | AI search z Google grounding |

**Brak nowych zależności.** Cały feature budujemy na istniejącym stacku.

---

## Rozważane alternatywy

### A. Interaktywna mapa 2D (np. ReactFlow)

**Odrzucono.** ReactFlow (~200kb) dodaje znaczący koszt bundla. Widok drzewa poziomego pokrywa potrzeby użytkownika przy ułamku złożoności. Można dodać widok 2D jako opcję w przyszłości.

### B. Węzły jako osobna kolekcja Firestore

**Odrzucono.** Każdy render wymagałby N+1 reads. Zagnieżdżony JSON w jednym dokumencie jest wystarczający i znacznie prostszy w implementacji.

### C. Persystencja `collapsed` wyłącznie w React state (nie w Firestore)

**Odrzucono.** Użytkownik traci stan widoku po odświeżeniu strony lub zmianie urządzenia. Persystowanie `collapsed` per węzeł jest tanią operacją (część i tak zapisywanego dokumentu).

### D. Generowanie AI z istniejących notatek (RAG)

**Odłożono do Fazy 2.** MVP skupia się na trybie "AI z internetu" + ręczny. Integracja z RAG (wybór notatek jako źródeł) jest naturalnym rozszerzeniem i nie wymaga zmian w modelu danych.

---

## Plan faz

### Faza 1 — MVP (obecna decyzja, wdrożone)

- Model danych + kolekcja Firestore (`users/{userId}/mindMaps`)
- CRUD route handlers + **import** (`/api/mind-maps/import`) + generowanie węzła AI (`/api/mind-maps/ai-node`)
- Widok drzewa poziomego z pełną interakcją (zwijanie, edycja, drag&drop zagnieżdżający pod rodzicem, zmienna szerokość kolumn)
- Dolny panel notatek (TipTap)
- AI search przez Gemini + Google grounding; dodatkowo import z obrazem (Vision) tam, gdzie zaimplementowano w `mindMapAIService`
- Tryb ręczny (puste drzewo)
- **Eksport:** pobranie mapy jako samodzielny plik HTML (offline) — `mindMapExportHtml.ts`, akcja w UI

### Faza 2 — Rozszerzenia (poza zakresem tego ADR)

- Generowanie mapy z wybranych notatek (RAG)
- Eksport do PNG / SVG (dodatkowo do istniejącego HTML)
- Regeneracja częściowa gałęzi przez AI
- Powiązanie węzłów z notatkami z sekcji Notes (klik → otwiera notatkę)

---

## Konsekwencje

**Pozytywne:**

- Zero nowych zależności — budujemy na istniejącym stacku
- Prosta struktura danych — jeden dokument Firestore per mapa
- AI feature bez dodatkowych kosztów API (Google grounding wliczone w Gemini)
- Widok drzewa poziomego jest bardziej czytelny przy dużej liczbie węzłów niż canvas 2D

**Negatywne / ryzyka:**

- Limit 1MB dokumentu Firestore może być osiągnięty przy bardzo rozbudowanych mapach z długimi notatkami → monitorować, trigger migracji opisany w sekcji modelu danych
- Debounce zapisu oznacza ryzyko utraty ostatnich zmian przy nagłym zamknięciu przeglądarki → rozważyć `beforeunload` handler jako zabezpieczenie
- Drag & drop węzłów w drzewie HTML jest mniej precyzyjny niż w canvas 2D → akceptowalne dla MVP
