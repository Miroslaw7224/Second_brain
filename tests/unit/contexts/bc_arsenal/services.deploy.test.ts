// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTempVault } from "../../helpers/tempVault";

const mockListProjects = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/bc_projects/services", () => ({ listProjects: mockListProjects }));

import { WORK_TARGET_NOTE, type SkillEntry } from "@/contexts/bc_arsenal/models";
import * as services from "@/contexts/bc_arsenal/services";

const vault = useTempVault();

beforeEach(() => {
  mockListProjects.mockReset();
  mockListProjects.mockReturnValue({
    projects: [
      { id: "p", name: "Projekt P", localPath: "~/p", owner: "personal" },
      { id: "w", name: "Projekt W", localPath: "~/w", owner: "work" },
      { id: "e", name: "Pusty", localPath: "", owner: "personal" },
    ],
    warnings: [],
  });
  vault.write(
    "Arsenal/Skills/tdd/skill.md",
    "---\nname: tdd\nslug: tdd\ntype: skill-doc\nsummary: s\n---\nTreść skilla\n"
  );
  vault.write("Arsenal/Skills/tdd/templates/t.md", "treść szablonu");
});

const statusOf = (fn: () => unknown): number | undefined => {
  try {
    fn();
  } catch (err) {
    return (err as { statusCode?: number }).statusCode;
  }
  return undefined;
};

describe("buildDeployCommand", () => {
  it("składa polecenie z cytowaną ścieżką", () => {
    expect(services.buildDeployCommand("tdd", "~/projects/x")).toBe(
      "scripts/deploy-skill.sh tdd '~/projects/x'"
    );
  });

  it("odrzuca zły slug (400), zanim złoży polecenie", () => {
    expect(statusOf(() => services.buildDeployCommand("../x; rm -rf ~", "~/p"))).toBe(400);
  });

  it("ucieka apostrof w ścieżce", () => {
    expect(services.buildDeployCommand("tdd", "a'b")).toBe(`scripts/deploy-skill.sh tdd 'a'\\''b'`);
  });
});

describe("buildAdaptPrompt", () => {
  it("zawiera projekt, ścieżki CLAUDE.md i SKILL.md, treść skilla i szablony", () => {
    const skill = {
      kind: "skill",
      id: "skill:tdd",
      path: "Arsenal/Skills/tdd/skill.md",
      name: "tdd",
      slug: "tdd",
      summary: "s",
      body: "Treść skilla\n",
      deployed: [],
      templates: [{ name: "t.md", text: "treść szablonu" }],
    } satisfies SkillEntry;
    const text = services.buildAdaptPrompt(skill, {
      id: "p",
      name: "Projekt P",
      localPath: "~/p",
      owner: "personal",
    });
    expect(text).toContain("Projekt P");
    expect(text).toContain("~/p/CLAUDE.md");
    expect(text).toContain("~/p/.claude/skills/tdd/SKILL.md");
    expect(text).toContain("Treść skilla");
    expect(text).toContain("SZABLON: t.md");
    expect(text).toContain("treść szablonu");
  });
});

describe("getDeployInstructions", () => {
  it("tryb full: polecenie skryptu, bez noty dla projektu osobistego", () => {
    const result = services.getDeployInstructions("tdd", "p", "full");
    expect(result).toEqual({ mode: "full", text: "scripts/deploy-skill.sh tdd '~/p'" });
  });

  it("tryb adapted: prompt; projekt z etatu dostaje notę", () => {
    const result = services.getDeployInstructions("tdd", "w", "adapted");
    expect(result.mode).toBe("adapted");
    expect(result.text).toContain("Projekt W");
    expect(result.note).toBe(WORK_TARGET_NOTE);
  });

  it("błędy: zły slug 400, brak skilla 404, brak projektu 404, brak local_path 409", () => {
    expect(statusOf(() => services.getDeployInstructions("../x", "p", "full"))).toBe(400);
    expect(statusOf(() => services.getDeployInstructions("nie-ma", "p", "full"))).toBe(404);
    expect(statusOf(() => services.getDeployInstructions("tdd", "nie-ma", "full"))).toBe(404);
    expect(statusOf(() => services.getDeployInstructions("tdd", "e", "full"))).toBe(409);
  });
});
