import { allocateName, slugify } from "@/lib/nexus/slug";
import type {
  Checklist,
  CodexRule,
  CodexSection,
  CodexWarning,
  ParsedCodex,
  RuleLevel,
  SectionBlock,
} from "./models";

/** Wzorzec reguły ze specu §4.1: jedna linia, początek listy najwyższego poziomu. */
const RULE_RE = /^- \*\*\[([A-Z][A-Z0-9]*-[0-9]+)\] (MUST|SHOULD)\*\*[ \t]+(.+)$/;
const ITEM_RE = /^- \[( |x|X)\] (.+)$/;
const REF_RE = /\[([A-Z][A-Z0-9]*-[0-9]+)\]/g;
const CHECKLISTS_HEADING_RE = /^(\d+\.\s*)?Checklisty$/i;
const WIKILINK_RE = /\[\[([^\]\n]+)\]\]/g;

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
