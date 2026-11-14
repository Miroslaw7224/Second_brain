// @vitest-environment node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = path.join(process.cwd(), "scripts/deploy-skill.sh");

const SKILL_MD = `---
name: demo
slug: demo
type: skill-doc
summary: Krótko
origin: global
description: >-
  Use when testing —
  second line
deployed:
  - project: p
    mode: full
    date: 2026-11-14
---

# Demo

Treść.
`;

const EXPECTED = `---
name: demo
description: >-
  Use when testing —
  second line
---

# Demo

Treść.
`;

let tmp = "";
let vault = "";
let project = "";

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-skill-"));
  vault = path.join(tmp, "Vault");
  project = path.join(tmp, "proj");
  fs.mkdirSync(path.join(vault, "Arsenal/Skills/demo/templates/nested"), { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(vault, "Arsenal/Skills/demo/skill.md"), SKILL_MD);
  fs.writeFileSync(path.join(vault, "Arsenal/Skills/demo/templates/t.md"), "szablon");
  fs.writeFileSync(path.join(vault, "Arsenal/Skills/demo/templates/nested/n.md"), "zagnieżdżony");
});

afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

const run = (args: string[]) =>
  spawnSync("bash", [SCRIPT, ...args], {
    env: { ...process.env, NEXUS_VAULT_PATH: vault },
    encoding: "utf8",
  });

const dest = () => path.join(project, ".claude/skills/demo");

describe("deploy-skill.sh", () => {
  it("kopiuje skill jako SKILL.md bez kluczy Vaultowych, zachowując description", () => {
    const res = run(["demo", project]);
    expect(res.status).toBe(0);
    expect(fs.readFileSync(path.join(dest(), "SKILL.md"), "utf8")).toBe(EXPECTED);
  });

  it("kopiuje zawartość templates/ obok SKILL.md (także zagnieżdżoną)", () => {
    run(["demo", project]);
    expect(fs.readFileSync(path.join(dest(), "t.md"), "utf8")).toBe("szablon");
    expect(fs.readFileSync(path.join(dest(), "nested/n.md"), "utf8")).toBe("zagnieżdżony");
  });

  it("odmawia nadpisania istniejącego SKILL.md bez --force (kod 4)", () => {
    run(["demo", project]);
    fs.writeFileSync(path.join(dest(), "SKILL.md"), "lokalna zmiana");
    const res = run(["demo", project]);
    expect(res.status).toBe(4);
    expect(fs.readFileSync(path.join(dest(), "SKILL.md"), "utf8")).toBe("lokalna zmiana");
  });

  it("--force nadpisuje", () => {
    run(["demo", project]);
    fs.writeFileSync(path.join(dest(), "SKILL.md"), "lokalna zmiana");
    expect(run(["demo", project, "--force"]).status).toBe(0);
    expect(fs.readFileSync(path.join(dest(), "SKILL.md"), "utf8")).toBe(EXPECTED);
  });

  it("zły slug: kod 2, nic nie zapisane", () => {
    expect(run(["../x", project]).status).toBe(2);
    expect(fs.existsSync(path.join(project, ".claude"))).toBe(false);
  });

  it("brak skilla albo katalogu projektu: kod 3", () => {
    expect(run(["nie-ma", project]).status).toBe(3);
    expect(run(["demo", path.join(tmp, "brak")]).status).toBe(3);
  });

  it("zła liczba argumentów: kod 1", () => {
    expect(run(["demo"]).status).toBe(1);
  });
});
