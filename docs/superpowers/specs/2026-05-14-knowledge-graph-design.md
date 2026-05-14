# Knowledge Graph — Specyfikacja projektu

**Data:** 2026-05-14  
**Status:** Zatwierdzony  
**Zastępuje:** System RAG (`ragService.ts`)

---

## Cel

Zastąpienie systemu RAG zunifikowaną bazą wiedzy w stylu Obsidian, przechowywaną w Firestore. AI (GPT-4o-mini) zarządza węzłami i połączeniami w trybie hybrydowym: reaktywnie na polecenie użytkownika oraz pasywnie budując połączenia między istniejącymi wpisami. Dostęp z każdego urządzenia przez Firestore.

---

## Model danych

### KnowledgeNode

Kolekcja: `users/{userId}/knowledgeNodes/{nodeId}`

```typescript
interface KnowledgeNode {
  id: string;
  type: "note" | "task" | "resource" | "chat" | "document" | "event";
  title: string;
  content: string; // zwięzłe, max 3 zdania dla AI-generated
  tags: string[];
  sources: {
    title: string;
    url?: string;
    nodeId?: string;
  }[];
  embedding: number[]; // 1536 floatów — OpenAI text-embedding-3-small
  dueDate?: string; // tylko dla type: "task"
  reminderAt?: string; // tylko dla type: "task"
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: "user" | "ai";
}
```

### KnowledgeEdge

Kolekcja: `users/{userId}/knowledgeEdges/{edgeId}`

```typescript
interface KnowledgeEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relation: "related" | "supports" | "contradicts" | "part-of" | "derived-from";
  strength: number; // 0–1, AI ocenia siłę połączenia
  createdAt: Timestamp;
}
```

---

## Architektura — nowe serwisy

| Serwis                      | Odpowiedzialność                                                    |
| --------------------------- | ------------------------------------------------------------------- |
| `knowledgeNodeService.ts`   | CRUD węzłów + generowanie embeddingów przez OpenAI API              |
| `knowledgeEdgeService.ts`   | Tworzenie i odpytywanie krawędzi grafu                              |
| `knowledgeSearchService.ts` | Semantic search przez cosine similarity (zastępuje `ragService.ts`) |
| `knowledgeAIService.ts`     | GPT-4o-mini: tworzenie węzłów, analiza połączeń, przypomnienia      |

### Usuwane

- `ragService.ts` — zastąpiony przez `knowledgeSearchService.ts`
- Kolekcja chunków RAG w Firestore

---

## Tryby pracy AI

### Tryb reaktywny

Użytkownik wpisuje na chacie polecenie zapisu (np. "zapamiętaj że...", "dodaj notatkę o..."). GPT-4o-mini:

1. Tworzy węzeł z typem odpowiednim do treści
2. Generuje embedding węzła (`text-embedding-3-small`)
3. Wyszukuje istniejące węzły z similarity > 0.8
4. Tworzy krawędzie do powiązanych węzłów
5. Odpowiada z potwierdzeniem i listą połączonych węzłów

### Tryb pasywny

Przy każdym nowym węźle (niezależnie od źródła) system w tle:

1. Generuje embedding
2. Znajduje top 5 węzłów z cosine similarity > 0.75
3. Tworzy krawędzie z odpowiednim typem relacji i wartością `strength`

### Tryb przypomnień

Przy każdym otwarciu chatu AI sprawdza węzły `type: "task"` z `dueDate` w ciągu 48h i informuje użytkownika proaktywnie na początku rozmowy.

---

## Zasady promptu systemowego AI

```
- Notatki: maksymalnie 3 zdania, konkretne fakty, zero lania wody
- Każda odpowiedź musi zawierać źródło (nodeId lub URL)
- Jeśli temat istnieje w bazie — aktualizuj węzeł, nie twórz duplikatu
- Połączenia twórz tylko gdy są logicznie uzasadnione
- Odpowiedzi na pytania: konkretne, poparte węzłami z bazy, z linkami do powiązanych węzłów
```

---

## Wyszukiwanie semantyczne (zastępuje RAG)

```
zapytanie użytkownika
  → embedding zapytania (OpenAI)
  → cosine similarity po wszystkich węzłach użytkownika
  → top N węzłów (próg: 0.75)
  → GPT-4o-mini buduje odpowiedź z treści węzłów
  → odpowiedź zawiera tytuły i ID węzłów jako źródła
```

---

## UI

### Widok listy (domyślny)

Zunifikowana lista węzłów w zakładce Wiedza z:

- Filtrowaniem po typie: `[Wszystkie] [Notatki] [Zadania] [Zasoby] [Chaty] [Dokumenty]`
- Semantyczną wyszukiwarką
- Licznikiem połączeń per węzeł
- Panelem powiązanych węzłów po kliknięciu

### Widok grafu (na żądanie)

Przycisk "Pokaż graf" w prawym górnym rogu otwiera interaktywny graf zbudowany biblioteką **React Flow**:

- Węzły kolorowane według typu
- Krawędzie z etykietą relacji
- Kliknięcie węzła otwiera jego treść w panelu bocznym

### Chat

Pozostaje wizualnie bez zmian. Odpowiedzi AI cytują węzły zamiast chunków RAG. Format:

```
[odpowiedź] [→ węzeł: Tytuł węzła]
Powiązane: [Węzeł A], [Węzeł B]
```

---

## Mapy myśli

Mapy myśli pozostają jako osobna funkcja (kreatywne narzędzie, brainstorming). Dodany zostaje przycisk **"Synchronizuj z bazą wiedzy"** na każdej mapie:

- AI analizuje strukturę mapy myśli
- Wyciąga kluczowe węzły i hierarchię
- Tworzy węzły w grafie wiedzy z połączeniami `part-of`
- Synchronizacja jest jednokierunkowa i na żądanie użytkownika

---

## Migracja istniejących danych

Jednorazowy skrypt migracyjny przepisuje dane do nowej struktury:

| Obecna kolekcja | Nowy typ węzła                      |
| --------------- | ----------------------------------- |
| `notes/`        | `type: "note"`                      |
| `resources/`    | `type: "resource"`                  |
| `documents/`    | `type: "document"`                  |
| `tasks/`        | `type: "task"`                      |
| Chunki RAG      | usunięte                            |
| `mindMaps/`     | bez zmian + przycisk synchronizacji |

Po migracji skrypt generuje embeddingi dla wszystkich węzłów i buduje wstępne połączenia.

---

## Model AI i koszty

| Zadanie                         | Model                  | Koszt szacunkowy  |
| ------------------------------- | ---------------------- | ----------------- |
| Tworzenie węzłów, chat, analiza | GPT-4o-mini            | ~$0.15/1M tokenów |
| Generowanie embeddingów         | text-embedding-3-small | ~$0.02/1M tokenów |
| 1000 węzłów (jednorazowo)       | embedding              | < $0.01           |

---

## Zależności

- `openai` — SDK do GPT-4o-mini i embeddingów (nowy package)
- `react-flow-renderer` lub `@xyflow/react` — wizualizacja grafu
- Firebase Firestore — storage (bez zmian)
- Firebase Auth — autoryzacja (bez zmian)
