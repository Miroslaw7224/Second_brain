# Nexus UI Redesign — Design Spec

**Date:** 2026-05-16  
**Status:** Approved  
**Scope:** 4 UI changes — Dashboard Home, Knowledge Graph, Mobile, Rename to Nexus

---

## 1. Dashboard Home (nowy widok startowy)

### Problem

Po zalogowaniu aplikacja otwiera się bezpośrednio w module "Baza wiedzy". Użytkownik nie ma przeglądu tego co ważne — zadań na dziś, nadchodzących wydarzeń, aktywności.

### Rozwiązanie

Nowy `appMode: "home"` jako wartość domyślna w `App.tsx`. Komponent `HomeView` renderowany gdy `appMode === "home"`.

### Sekcje HomeView (od góry)

1. **Stats row** — 3 kafle w jednym rzędzie:
   - Zadania na dziś (count `KnowledgeNode.type === "task"` z `dueDate === today`)
   - Wydarzenia dziś (count `KnowledgeNode.type === "event"` z `dueDate === today`)
   - Łączna liczba notatek (`KnowledgeNode.type === "note"`)
2. **Zadania na dziś** — lista z checkboxami, max 5 pozycji, link "pokaż wszystkie → Zadania"
3. **Nadchodzące wydarzenia** — `KnowledgeNode.type === "event"` z `dueDate` w ciągu 48h, max 3 pozycje
4. **Szybkie akcje** — 4 przyciski: `+ Notatka`, `+ Zadanie`, `💬 Zapytaj AI`, `🔍 Szukaj`
5. **Log aktywności** — istniejący komponent `ActivityLog` (props: `apiFetch`, `lang`, `t`)

### Integracja z sidebarem

`AppSidebar` dostaje nową pozycję nawigacyjną **"Home"** / **"Dashboard"** na górze listy, przed sekcjami Wiedza i Planowanie.

### Dane

- `HomeView` pobiera `KnowledgeNode[]` przez istniejący endpoint `/api/knowledge/nodes`
- Filtrowanie po stronie klienta (daty, typy)
- Brak nowego API

---

## 2. Graf wiedzy — force-directed (XYFlow)

### Problem

Model `KnowledgeNode` + `KnowledgeEdge` istnieje w bazie i jest wypełniany przez AI (`buildConnections`), ale brak jest widoku graficznego połączeń.

### Rozwiązanie

Nowy tab **"Graf"** w `WiedzaView`, renderujący komponent `KnowledgeGraphView`.

### Komponent KnowledgeGraphView

- Biblioteka: **XYFlow** (już w `package.json` jako `@xyflow/react`)
- Dane: pobiera `KnowledgeNode[]` + `KnowledgeEdge[]` z istniejących endpointów
- Węzły XYFlow: każdy `KnowledgeNode` → custom node component `KnowledgeNodeCard`
- Krawędzie XYFlow: każdy `KnowledgeEdge` → edge z etykietą relacji i kolorem wg. typu

### Kolory węzłów wg. typu

| Typ        | Kolor                          |
| ---------- | ------------------------------ |
| `chat`     | `#60a5fa` (niebieski)          |
| `note`     | `#7c6dff` (fioletowy — accent) |
| `task`     | `#34d399` (zielony)            |
| `resource` | `#f59e0b` (żółty)              |
| `event`    | `#f87171` (czerwony)           |
| `document` | `#c084fc` (fioletowy jasny)    |

### Style krawędzi wg. relacji

| Relacja        | Styl                              |
| -------------- | --------------------------------- |
| `related`      | linia ciągła, kolor accent        |
| `supports`     | linia ciągła ze strzałką, zielony |
| `contradicts`  | linia przerywana, czerwony        |
| `part-of`      | linia gruba, szary                |
| `derived-from` | linia ze strzałką, niebieski      |

### Interakcje

- Kliknięcie węzła → panel szczegółów (prawy drawer): title, content, tagi, lista połączeń
- Toolbar: filtr po typie węzła (multi-select chips) + filtr po typie relacji
- Zoom: scroll wheel · Pan: drag canvas
- Layout: `d3-force` (już w zależnościach) — auto-rozmieszczenie węzłów

### Umiejscowienie w UI

Nowy przycisk "Graf" w belce zakładek `WiedzaView` (obok "Baza wiedzy" / "Lista" / "Notatki").

---

## 3. Mobilność — bottom navigation bar

### Problem

`AppSidebar` ma `width: 320px` i jest zawsze widoczny. Na telefonach przykrywa cały ekran, aplikacja jest nieużywalna.

### Rozwiązanie

Responsywny layout z dwoma trybami:

**Desktop (≥ 768px `md`):** bez zmian — sidebar + header jak teraz.

**Mobile (< 768px):**

- Sidebar: `hidden` — nie renderowany
- Header: uproszczony — tylko logo + szukaj + theme toggle (bez switcha Wiedza/Planowanie, bez search inputa)
- Nowy komponent `MobileNav` — stała belka na dole ekranu, `z-50`

### MobileNav — 5 zakładek

| Ikona | Label PL | Label EN  | Akcja                              |
| ----- | -------- | --------- | ---------------------------------- |
| 🏠    | Home     | Home      | `appMode = "home"`                 |
| 💬    | Wiedza   | Knowledge | `appMode = "wiedza"` → Baza wiedzy |
| ✅    | Zadania  | Tasks     | `appMode = "planowanie"` → Zadania |
| 📝    | Notatki  | Notes     | `appMode = "wiedza"` → Notatki tab |
| ⋯     | Więcej   | More      | otwiera `MobileMoreDrawer`         |

### MobileMoreDrawer

Sheet wysuwawy od dołu (bottom sheet) z pozycjami: Graf wiedzy, Zasoby, Kalendarz, Mapy myśli, separator, Wyloguj.

### Implementacja

- Breakpoint detection: Tailwind `md:` klasy + `useMediaQuery` hook (lub CSS `hidden md:block`)
- `main` content: na mobile `pb-16` (padding-bottom dla belki nav)
- `MobileNav` i `MobileMoreDrawer` — nowe komponenty w `src/components/layout/`

---

## 4. Zmiana nazwy: Second Brain → Nexus

### Zakres — pełny replace w całym repo

| Co                           | Skąd                          | Na co                  |
| ---------------------------- | ----------------------------- | ---------------------- |
| Nazwa wyświetlana            | `"Second Brain"`              | `"Nexus"`              |
| Klucz localStorage           | `"secondbrain-theme"`         | `"nexus-theme"`        |
| Stałe/zmienne                | `secondbrain`, `SecondBrain`  | `nexus`, `Nexus`       |
| Pliki konfiguracyjne         | `name: "second-brain"`        | `name: "nexus"`        |
| Meta tagi                    | `<title>Second Brain</title>` | `<title>Nexus</title>` |
| `og:title`, `og:description` | wszelkie wzmianki             | zaktualizowane         |
| `manifest.json`              | `name`, `short_name`          | `"Nexus"`              |
| `README.md`                  | nagłówki, opis                | zaktualizowane         |
| Docs / komentarze            | wzmianki nazwy                | zaktualizowane         |

### Pliki do zmiany (znane)

- `src/App.tsx` — login screen header
- `src/components/layout/AppSidebar.tsx` — `t.title`
- `src/translations.ts` — klucze `title`, `subtitle`
- `src/components/theme/ThemeScript.tsx` — klucz `secondbrain-theme`
- `src/components/theme/ThemeProvider.tsx` — `STORAGE_KEY`
- `app/layout.tsx` — `<title>`, meta tagi
- `public/manifest.json` — jeśli istnieje
- `README.md`
- `docs/SecondBrain_prd.md` — opcjonalnie nagłówki

---

## Kolejność implementacji

1. **Rename** — najpierw, żeby pozostałe PR-y były już w Nexus
2. **Dashboard Home** — nowy komponent, nowe API query
3. **Mobile** — layout CSS + nowe komponenty nav
4. **Graf wiedzy** — największy zakres, XYFlow + nowe endpointy

---

## Poza zakresem tego sprintu

- Animacje przejść między widokami
- Persystowanie pozycji węzłów grafu (drag & drop save)
- Push notifications dla przypomnień
