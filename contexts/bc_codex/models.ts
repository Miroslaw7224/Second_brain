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
