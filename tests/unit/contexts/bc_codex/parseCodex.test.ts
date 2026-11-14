// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseCodex } from "@/contexts/bc_codex/services";

describe("parseCodex: reguły", () => {
  it("rozpoznaje regułę MUST z identyfikatorem, numerem linii i sekcją", () => {
    const parsed = parseCodex("## 1. TDD\n- **[TDD-1] MUST** Brak kodu bez testu\n");
    expect(parsed.rules).toEqual([
      { id: "TDD-1", level: "MUST", text: "Brak kodu bez testu", line: 2 },
    ]);
    expect(parsed.sections[0].id).toBe("sec-tdd");
    expect(parsed.sections[0].title).toBe("1. TDD");
    expect(parsed.sections[0].blocks).toEqual([{ kind: "rule", ruleId: "TDD-1" }]);
  });

  it("wcięte linie należą do reguły, zagnieżdżone punkty nie są osobnymi regułami", () => {
    const parsed = parseCodex(
      "## 1. TDD\n- **[TDD-1] MUST** Brak kodu bez testu\n  - podpunkt\n  druga linia\n"
    );
    expect(parsed.rules).toHaveLength(1);
    expect(parsed.rules[0].text).toBe("Brak kodu bez testu\n- podpunkt\ndruga linia");
  });

  it("poziom spoza MUST/SHOULD i identyfikator z małymi literami nie są regułami, a tekst zostaje", () => {
    const parsed = parseCodex(
      "## 1. TDD\n- **[TDD-1] MAY** za słaby poziom\n\n- **[tdd-1] MUST** małe litery\n"
    );
    expect(parsed.rules).toEqual([]);
    expect(parsed.sections[0].blocks).toEqual([
      { kind: "text", text: "- **[TDD-1] MAY** za słaby poziom" },
      { kind: "text", text: "- **[tdd-1] MUST** małe litery" },
    ]);
  });

  it("duplikat identyfikatora: zostaje pierwsza definicja, ostrzeżenie z numerem linii", () => {
    const parsed = parseCodex(
      "## 1. TDD\n- **[TDD-1] MUST** pierwsza\n\n\n- **[TDD-1] SHOULD** druga\n"
    );
    expect(parsed.rules).toEqual([{ id: "TDD-1", level: "MUST", text: "pierwsza", line: 2 }]);
    expect(parsed.sections[0].blocks).toEqual([{ kind: "rule", ruleId: "TDD-1" }]);
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.warnings[0]).toMatchObject({ kind: "duplicate-id", line: 5 });
    expect(parsed.warnings[0].message).toContain("TDD-1");
  });

  it("identyfikator sekcji z polskimi znakami", () => {
    const parsed = parseCodex("## 2. Jakość asercji\n- **[A-1] SHOULD** x\n");
    expect(parsed.sections[0].id).toBe("sec-jakosc-asercji");
    expect(parsed.sections[0].title).toBe("2. Jakość asercji");
  });

  it("zwykłe linie w sekcji zostają jako bloki tekstowe, oddzielone pustą linią", () => {
    const parsed = parseCodex("## 1. TDD\nWstęp pierwszy\ndrugi wiersz\n\nInny akapit\n");
    expect(parsed.sections[0].blocks).toEqual([
      { kind: "text", text: "Wstęp pierwszy\ndrugi wiersz" },
      { kind: "text", text: "Inny akapit" },
    ]);
  });

  it("frontmatter nie psuje numeracji linii, tytuł z nagłówka H1", () => {
    const text = [
      "---",
      "name: Kodeks",
      "slug: kodeks",
      "type: note",
      "---",
      "# Kodeks pracy",
      "",
      "- placeholder",
    ].join("\n");
    const parsed = parseCodex(`${text}\n## 1. TDD\n- **[TDD-1] MUST** x\n`);
    expect(parsed.title).toBe("Kodeks pracy");
    expect(parsed.rules[0].line).toBe(10);
  });
});

describe("parseCodex: treść, która nie może zginąć", () => {
  it("pusta linia w środku reguły z wciętą kontynuacją zostaje w regule", () => {
    const parsed = parseCodex(
      "## 1. TDD\n- **[TDD-1] MUST** Pierwszy akapit\n\n  Drugi akapit\n\n## 2. X\n"
    );
    expect(parsed.rules[0].text).toBe("Pierwszy akapit\n\nDrugi akapit");
    expect(parsed.sections[0].blocks).toEqual([{ kind: "rule", ruleId: "TDD-1" }]);
  });

  it("pusta linia bez wciętej kontynuacji kończy regułę, a akapit zostaje tekstem sekcji", () => {
    const parsed = parseCodex("## 1. TDD\n- **[TDD-1] MUST** x\n\nAkapit poza regułą\n");
    expect(parsed.rules[0].text).toBe("x");
    expect(parsed.sections[0].blocks).toEqual([
      { kind: "rule", ruleId: "TDD-1" },
      { kind: "text", text: "Akapit poza regułą" },
    ]);
  });

  it("wcięcie tabulatorem też należy do reguły", () => {
    const parsed = parseCodex("## 1. TDD\n- **[TDD-1] MUST** x\n\t- y\n");
    expect(parsed.rules[0].text).toBe("x\n- y");
  });

  it("linia `# ...` w treści sekcji (np. komentarz) nie jest tytułem i nie ginie", () => {
    const parsed = parseCodex("# Tytuł\n## 1. A\n# komentarz bash\n- **[A-1] MUST** x\n");
    expect(parsed.title).toBe("Tytuł");
    expect(parsed.sections[0].blocks).toEqual([
      { kind: "text", text: "# komentarz bash" },
      { kind: "rule", ruleId: "A-1" },
    ]);
  });
});

describe("parseCodex: checklisty", () => {
  const rule = "## 1. TDD\n- **[TDD-1] MUST** Czerwony test\n";

  it("punkty checklisty z odwołaniami do reguł", () => {
    const parsed = parseCodex(
      `${rule}\n## Checklisty\n### Definition of Done\n- [ ] [TDD-1] Czerwony test\n- [x] Bez odwołania\n`
    );
    expect(parsed.checklists).toEqual([
      {
        id: "definition-of-done",
        title: "Definition of Done",
        items: [
          { id: "definition-of-done-1", text: "[TDD-1] Czerwony test", ruleRefs: ["TDD-1"] },
          { id: "definition-of-done-2", text: "Bez odwołania", ruleRefs: [] },
        ],
      },
    ]);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.sections.map((s) => s.title)).toEqual(["1. TDD"]);
  });

  it("odwołanie do nieistniejącej reguły daje ostrzeżenie z linią punktu", () => {
    const parsed = parseCodex(
      `${rule}## Checklisty\n### Przed PR\n- [ ] [SEC-4] Brak kluczy w kodzie\n`
    );
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.warnings[0]).toMatchObject({ kind: "unknown-ref", line: 5 });
    expect(parsed.warnings[0].message).toContain("SEC-4");
  });

  it("nagłówek „6. Checklisty” też otwiera tryb checklist", () => {
    const parsed = parseCodex(`${rule}## 6. Checklisty\n### Lista A\n- [ ] [TDD-1] x\n`);
    expect(parsed.checklists.map((c) => c.id)).toEqual(["lista-a"]);
  });
});

describe("parseCodex: reszta", () => {
  it("wikilinki: unikalne, w kolejności wystąpienia", () => {
    const parsed = parseCodex(
      "Powiązanie: [[ai-coding-guardrails]] i [[ddd]] i [[ddd]]\n## 1. TDD\n"
    );
    expect(parsed.wikilinks).toEqual(["ai-coding-guardrails", "ddd"]);
  });

  it("pusty plik daje pustą strukturę bez błędu", () => {
    expect(parseCodex("")).toEqual({
      title: "",
      sections: [],
      rules: [],
      checklists: [],
      warnings: [],
      wikilinks: [],
    });
  });

  it("CRLF jest traktowany jak LF", () => {
    const parsed = parseCodex("## 1. TDD\r\n- **[TDD-1] MUST** x\r\n  - y\r\n");
    expect(parsed.rules[0].text).toBe("x\n- y");
  });
});
