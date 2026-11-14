/** Ścieżka kodeksu względem korzenia vaulta (źródło prawdy; aplikacja tylko czyta). */
export const CODEX_PATH = "Knowledge/kodeks.md";

export type RuleLevel = "MUST" | "SHOULD";

export type CodexRule = { id: string; level: RuleLevel; text: string; line: number };

/** Zawartość sekcji w kolejności pliku: reguła (po ID) albo zwykły tekst, żeby żadna treść nie ginęła. */
export type SectionBlock = { kind: "rule"; ruleId: string } | { kind: "text"; text: string };

export type CodexSection = { id: string; title: string; blocks: SectionBlock[] };

export type ChecklistItem = { id: string; text: string; ruleRefs: string[] };

export type Checklist = { id: string; title: string; items: ChecklistItem[] };

export type CodexWarning = {
  kind: "duplicate-id" | "unknown-ref";
  message: string;
  line: number;
};

export type ParsedCodex = {
  title: string;
  sections: CodexSection[];
  rules: CodexRule[];
  checklists: Checklist[];
  warnings: CodexWarning[];
  wikilinks: string[];
};

/** Strefa zapisu dziennika: `work` trafia wyłącznie do `Work/` (ignorowanego przez git). */
export type OwnerZone = "personal" | "work";

type EventBase = { owner: OwnerZone; projectId?: string };

/** Zdarzenie przyjmowane z API: `ts` nadaje serwer, `run` dla `start` też. */
export type ChecklistEventInput =
  | (EventBase & { type: "start"; checklist: string; task: string })
  | (EventBase & { type: "toggle"; run: string; item: string; checked: boolean })
  | (EventBase & { type: "note"; run: string; item: string; text: string })
  | (EventBase & { type: "end"; run: string; done: number; total: number });

type Stamped = { run: string; ts: string };

/** Zdarzenie zapisane w dzienniku (jedna linia JSON). */
export type ChecklistEvent =
  | (EventBase & Stamped & { type: "start"; checklist: string; task: string })
  | (EventBase & Stamped & { type: "toggle"; item: string; checked: boolean })
  | (EventBase & Stamped & { type: "note"; item: string; text: string })
  | (EventBase & Stamped & { type: "end"; done: number; total: number });

export type ItemState = { checked: boolean; note: string };

export type RunState = {
  run: string;
  owner: OwnerZone;
  checklist: string;
  task: string;
  startedAt: string;
  ended: boolean;
  items: Record<string, ItemState>;
};

export type JournalState = {
  runs: RunState[];
  eventCount: number;
  skippedLines: number;
  unterminatedTail: boolean;
};
