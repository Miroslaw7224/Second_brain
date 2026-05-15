# Knowledge Base Redesign — Spec

**Date:** 2026-05-15  
**Status:** Approved

## Goal

Decouple Chat, Notatki, Zasoby, Mapa myśli from the knowledge base so they operate as standalone working tools. Rebuild the knowledge base as an AI-driven system where knowledge is added exclusively through AI conversation.

## What Changes

### Removed

- `chat` tab from `WiedzaView` (Chat becomes redundant once knowledge base has its own AI chat)
- Migration UI: "Migruj dane" and "Wyczyść bazę" buttons from `KnowledgeListView`
- `migrationService.ts` — deleted entirely
- `app/api/knowledge/migrate/route.ts` — deleted entirely
- `knowledgeViewMode` state in `WiedzaView` (graph/list toggle moves inside `KnowledgeView`)

### Added

- `features/knowledge/KnowledgeView.tsx` — new container with internal tabs: Chat AI (default) / Lista / Graf
- `features/knowledge/KnowledgeChatPanel.tsx` — AI chat panel dedicated to the knowledge base
- Per-node delete: button in `KnowledgeListView` list items and in `KnowledgeNodePanel`

### Unchanged

- NotesPanel, ResourceSection, MindMapsTab — untouched, still use their own Firestore collections
- `KnowledgeGraphView` — no changes
- `KnowledgeNodePanel` — only adds a delete button
- All knowledge API endpoints except `/api/knowledge/migrate` (deleted)
- `knowledgeAIService` — reused as-is by `KnowledgeChatPanel`

## Architecture

```
WiedzaView
  activeTab: "notes" | "resources" | "mindmaps" | "knowledge"
  ├── NotesPanel
  ├── ResourceSection
  ├── MindMapsTab
  └── KnowledgeView                          ← NEW
        activeInnerTab: "chat" | "list" | "graph"
        ├── KnowledgeChatPanel               ← NEW (default tab)
        ├── KnowledgeListView                ← simplified
        └── KnowledgeGraphView               ← unchanged
```

## KnowledgeChatPanel — Behavior

The panel reuses `/api/chat` → `knowledgeAIService`. Two modes:

**Save flow** (user writes "zapamiętaj X" or equivalent keyword):

1. AI extracts a node structure (type, title, content, tags)
2. UI shows a preview card: title, type badge, content excerpt, tags
3. Two buttons: **Zapisz** (POST `/api/knowledge/nodes`) and **Anuluj** (discard)
4. On save: AI responds "✅ Zapisano: [title]" and triggers `buildConnections` in background
5. On cancel: AI responds "Pominięto." and removes the preview

**Query flow** (any other message):

1. Semantic search over knowledge nodes
2. AI responds with answer and sources
3. No preview shown

## KnowledgeListView — Changes

- Remove: "Migruj dane" button, "Wyczyść bazę" button, `migrating`/`clearing`/`migrateResult` state, `handleMigrate`, `handleClearAll`
- Remove: type filter tabs (Wszystkie / Notatki / Zadania / etc.) — AI decides what goes in, filters add noise
- Add: trash icon button per list item → calls `DELETE /api/knowledge/nodes/[nodeId]`
- Add: delete button in `KnowledgeNodePanel` side panel

## KnowledgeNodePanel — Changes

- Add a "Usuń" / trash button in the panel header
- On click: confirm dialog → `DELETE /api/knowledge/nodes/[nodeId]` → close panel, refresh list

## WiedzaView — Changes

- Remove `"chat"` from `activeTab` union type
- Remove `knowledgeViewMode` state and its setter
- Remove all Chat-related state: `messages`, `input`, `isLoading`, `chatEndRef`, `handleSend`
- Remove `ChatPanel` import and render
- Pass no graph/list toggle props to `KnowledgeView` (it manages its own inner tab state)
- Update `WiedzaSidebarContent` to remove chat tab entry

## API Changes

| Endpoint                               | Change                                    |
| -------------------------------------- | ----------------------------------------- |
| `POST /api/knowledge/migrate`          | Deleted                                   |
| `DELETE /api/knowledge/migrate`        | Deleted                                   |
| `DELETE /api/knowledge/nodes/[nodeId]` | Already exists — used for per-node delete |
| All other `/api/knowledge/*`           | Unchanged                                 |

## Styling

All new components use existing CSS variables: `--bg`, `--bg2`, `--bg3`, `--surface`, `--border`, `--text`, `--text2`, `--text3`, `--accent`. Match existing component patterns (rounded-xl, border-[var(--border)], hover:bg-[var(--bg2)]).

## Out of Scope

- Changes to Notatki, Zasoby, Mapa myśli internals
- Auto-populating knowledge base from other tabs
- "Moja praca" integration (migration removed — no automatic import path remains)
- Changes to `knowledgeAIService` logic
