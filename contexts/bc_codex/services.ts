import type {
  Checklist,
  ChecklistEvent,
  CodexRule,
  CodexSection,
  CodexWarning,
  JournalState,
  OwnerZone,
  ParsedCodex,
  RuleLevel,
  RunState,
  SectionBlock,
} from "./models";

/** Wzorzec reguły ze specu §4.1: jedna linia, początek listy najwyższego poziomu. */
const RULE_RE = /^- \*\*\[([A-Z][A-Z0-9]*-[0-9]+)\] (MUST|SHOULD)\*\*[ \t]+(.+)$/;
const ITEM_RE = /^- \[( |x|X)\] (.+)$/;
const REF_RE = /\[([A-Z][A-Z0-9]*-[0-9]+)\]/g;
const CHECKLISTS_HEADING_RE = /^(\d+\.\s*)?Checklisty$/i;
const WIKILINK_RE = /\[\[([^\]\n]+)\]\]/g;

/** Krótki identyfikator z tytułu: małe litery, `[a-z0-9-]`, bez znaków diakrytycznych. Nigdy pusty. */
function slugify(title: string): string {
  const slug = title
    .replace(/[łŁ]/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "bez-tytulu" : slug;
}

/** `base`, a gdy zajęte `base-2`, `base-3`, … */
function allocateName(base: string, isTaken: (name: string) => boolean): string {
  if (!isTaken(base)) return base;
  for (let n = 2; ; n += 1) {
    if (!isTaken(`${base}-${n}`)) return `${base}-${n}`;
  }
}

function firstLineAfterFrontmatter(lines: string[]): number {
  if (lines[0] !== "---") return 0;
  const end = lines.indexOf("---", 1);
  return end === -1 ? 0 : end + 1;
}

/**
 * Parser kodeksu (czysta funkcja, bez I/O). Łagodny: linia spoza wzorca zostaje zwykłym tekstem
 * sekcji, zduplikowany identyfikator daje ostrzeżenie (pierwsza definicja wygrywa), odwołanie do
 * nieistniejącej reguły w checkliście też. Treść przed pierwszym nagłówkiem `##` (tytuł, cytat,
 * linia „Powiązanie”) nie należy do żadnej sekcji; tytuł i wikilinki są czytane osobno.
 */
export function parseCodex(source: string): ParsedCodex {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const sections: CodexSection[] = [];
  const rules: CodexRule[] = [];
  const checklists: Checklist[] = [];
  const warnings: CodexWarning[] = [];
  const itemRefs: { ref: string; line: number; checklist: string }[] = [];
  const seenRuleIds = new Set<string>();
  const sectionIds = new Set<string>();
  const checklistIds = new Set<string>();
  let title = "";

  let mode: "preamble" | "rules" | "checklists" = "preamble";
  let section: CodexSection | null = null;
  let checklist: Checklist | null = null;
  let textBuf: string[] = [];
  let rule: { rule: CodexRule; lines: string[] } | null = null;
  let skippingDuplicate = false;

  const flushText = () => {
    if (section && textBuf.length > 0) {
      section.blocks.push({ kind: "text", text: textBuf.join("\n") } satisfies SectionBlock);
    }
    textBuf = [];
  };
  const flushRule = () => {
    if (rule) rule.rule.text = rule.lines.join("\n").trimEnd();
    rule = null;
    skippingDuplicate = false;
  };

  for (let i = firstLineAfterFrontmatter(lines); i < lines.length; i += 1) {
    const line = lines[i];
    const lineNo = i + 1;

    const h2 = /^## +(.+?)\s*$/.exec(line);
    const h3 = /^### +(.+?)\s*$/.exec(line);
    const h1 = /^# +(.+?)\s*$/.exec(line);

    if (h1) {
      if (title === "") title = h1[1];
      continue;
    }
    if (h2) {
      flushRule();
      flushText();
      checklist = null;
      if (CHECKLISTS_HEADING_RE.test(h2[1])) {
        mode = "checklists";
        section = null;
      } else {
        mode = "rules";
        const id = allocateName(`sec-${slugify(h2[1].replace(/^\d+\.\s*/, ""))}`, (name) =>
          sectionIds.has(name)
        );
        sectionIds.add(id);
        section = { id, title: h2[1], blocks: [] };
        sections.push(section);
      }
      continue;
    }
    if (h3 && mode === "checklists") {
      const id = allocateName(slugify(h3[1]), (name) => checklistIds.has(name));
      checklistIds.add(id);
      checklist = { id, title: h3[1], items: [] };
      checklists.push(checklist);
      continue;
    }

    if (mode === "checklists" && checklist) {
      const item = ITEM_RE.exec(line);
      if (item) {
        const text = item[2];
        const ruleRefs = [...text.matchAll(REF_RE)].map((m) => m[1]);
        checklist.items.push({
          id: `${checklist.id}-${checklist.items.length + 1}`,
          text,
          ruleRefs,
        });
        for (const ref of ruleRefs)
          itemRefs.push({ ref, line: lineNo, checklist: checklist.title });
      }
      continue;
    }

    if (mode !== "rules" || !section) continue;

    const match = RULE_RE.exec(line);
    if (match) {
      flushRule();
      flushText();
      const [, id, level, text] = match;
      if (seenRuleIds.has(id)) {
        skippingDuplicate = true;
        warnings.push({
          kind: "duplicate-id",
          line: lineNo,
          message: `Reguła [${id}] występuje ponownie w linii ${lineNo}; zastosowano pierwszą definicję.`,
        });
        continue;
      }
      seenRuleIds.add(id);
      const created: CodexRule = { id, level: level as RuleLevel, text, line: lineNo };
      rules.push(created);
      section.blocks.push({ kind: "rule", ruleId: id });
      rule = { rule: created, lines: [text] };
      continue;
    }

    if (/^ {2,}/.test(line) && (rule || skippingDuplicate)) {
      if (rule) rule.lines.push(line.slice(2));
      continue;
    }

    flushRule();
    if (line.trim() === "") flushText();
    else textBuf.push(line);
  }
  flushRule();
  flushText();

  for (const { ref, line, checklist: listTitle } of itemRefs) {
    if (!seenRuleIds.has(ref)) {
      warnings.push({
        kind: "unknown-ref",
        line,
        message: `Checklista „${listTitle}” odwołuje się do [${ref}], którego nie ma w rejestrze reguł.`,
      });
    }
  }

  const wikilinks: string[] = [];
  for (const m of source.matchAll(WIKILINK_RE)) {
    const target = m[1].split("|")[0].trim();
    if (target !== "" && !wikilinks.includes(target)) wikilinks.push(target);
  }

  return { title, sections, rules, checklists, warnings, wikilinks };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === "string" && value !== "";
const count = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** Linia dziennika → zdarzenie albo `null`, gdy kształt nie zgadza się ze specem §4.2 (m.in. brak `owner`). */
function parseEvent(value: unknown): ChecklistEvent | null {
  if (!isRecord(value)) return null;
  const { run, ts, owner, projectId, type } = value;
  if (!nonEmpty(run) || !nonEmpty(ts)) return null;
  if (owner !== "personal" && owner !== "work") return null;
  if (projectId !== undefined && typeof projectId !== "string") return null;
  const base = {
    run,
    ts,
    owner: owner as OwnerZone,
    ...(typeof projectId === "string" ? { projectId } : {}),
  };
  if (type === "start" && nonEmpty(value.checklist) && typeof value.task === "string") {
    return { ...base, type, checklist: value.checklist, task: value.task };
  }
  if (type === "toggle" && nonEmpty(value.item) && typeof value.checked === "boolean") {
    return { ...base, type, item: value.item, checked: value.checked };
  }
  if (type === "note" && nonEmpty(value.item) && typeof value.text === "string") {
    return { ...base, type, item: value.item, text: value.text };
  }
  if (type === "end" && count(value.done) && count(value.total)) {
    return { ...base, type, done: value.done, total: value.total };
  }
  return null;
}

/**
 * Odtwarza stan uruchomień z dziennika JSONL (czysta funkcja). Kolejność zdarzeń to kolejność
 * w pliku (`ts` informacyjnie). Linia uszkodzona albo niezgodna z kształtem zdarzenia jest pomijana
 * i liczona; ostatnia linia bez `\n` jest ignorowana (ktoś może ją jeszcze dopisywać).
 */
export function replayJournal(text: string | null): JournalState {
  const state: JournalState = { runs: [], eventCount: 0, skippedLines: 0, unterminatedTail: false };
  if (text === null || text === "") return state;
  const lines = text.split("\n");
  const tail = lines.pop() ?? "";
  state.unterminatedTail = tail.trim() !== "";
  const byRun = new Map<string, RunState>();
  for (const line of lines) {
    if (line.trim() === "") continue;
    let event: ChecklistEvent | null = null;
    try {
      event = parseEvent(JSON.parse(line));
    } catch {
      event = null;
    }
    if (!event) {
      state.skippedLines += 1;
      continue;
    }
    state.eventCount += 1;
    if (event.type === "start") {
      if (!byRun.has(event.run)) {
        const created: RunState = {
          run: event.run,
          owner: event.owner,
          checklist: event.checklist,
          task: event.task,
          startedAt: event.ts,
          ended: false,
          items: {},
        };
        byRun.set(event.run, created);
        state.runs.push(created);
      }
      continue;
    }
    const run = byRun.get(event.run);
    if (!run) continue;
    if (event.type === "end") {
      run.ended = true;
    } else {
      const item = run.items[event.item] ?? { checked: false, note: "" };
      if (event.type === "toggle") item.checked = event.checked;
      else item.note = event.text;
      run.items[event.item] = item;
    }
  }
  return state;
}
