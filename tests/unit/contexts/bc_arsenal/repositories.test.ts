// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readPromptFiles, readSkillFiles, readTemplates } from "@/contexts/bc_arsenal/repositories";
import { useTempVault } from "../../helpers/tempVault";

const vault = useTempVault();

describe("readSkillFiles", () => {
  it("zwraca tylko Arsenal/Skills/<slug>/skill.md, klucz = nazwa folderu", () => {
    vault.write("Arsenal/Skills/a/skill.md", "---\nname: A\n---\ntreść");
    vault.write("Arsenal/Skills/a/templates/t.md", "---\nname: T\n---\n");
    vault.write("Arsenal/Skills/b/readme.md", "x");
    vault.write("Arsenal/Skills/c/skill.md", "bez frontmattera");
    const files = readSkillFiles();
    expect(files.map((f) => [f.path, f.key, f.parsed === null])).toEqual([
      ["Arsenal/Skills/a/skill.md", "a", false],
      ["Arsenal/Skills/c/skill.md", "c", true],
    ]);
    expect(files[0].parsed?.meta).toEqual({ name: "A" });
    expect(files[0].parsed?.body).toBe("treść");
  });

  it("brak katalogu daje pustą listę", () => {
    expect(readSkillFiles()).toEqual([]);
  });
});

describe("readPromptFiles", () => {
  it("zwraca tylko pliki .md bezpośrednio w Knowledge/prompty", () => {
    vault.write("Knowledge/prompty/Rada.md", "---\ntype: prompt\n---\ntreść");
    vault.write("Knowledge/prompty/NEXUS.code-workspace", "{}");
    vault.write("Knowledge/prompty/sub/x.md", "x");
    expect(readPromptFiles().map((f) => f.key)).toEqual(["Rada"]);
  });
});

describe("readTemplates", () => {
  it("zwraca pliki z templates/ posortowane, bez podkatalogów", () => {
    vault.write("Arsenal/Skills/a/templates/b.md", "B");
    vault.write("Arsenal/Skills/a/templates/a.md", "A");
    vault.write("Arsenal/Skills/a/templates/nested/c.md", "C");
    expect(readTemplates("a")).toEqual([
      { name: "a.md", text: "A" },
      { name: "b.md", text: "B" },
    ]);
  });

  it("brak katalogu daje pustą listę", () => {
    expect(readTemplates("nie-ma")).toEqual([]);
  });
});
