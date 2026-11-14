// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PathOutsideVaultError,
  WorkAreaBlockedError,
  appendVaultLine,
  vaultFileMtimeMs,
} from "@/lib/nexus/vault-fs";
import { setupTempVault } from "../../helpers/tempVault";

describe("appendVaultLine", () => {
  const vault = setupTempVault();

  it("tworzy katalog i plik, linia kończy się \\n", () => {
    appendVaultLine("Checklists/2026-11.jsonl", '{"a":1}');
    expect(vault.read("Checklists/2026-11.jsonl")).toBe('{"a":1}\n');
  });

  it("dopisuje kolejną linię bez przepisywania pliku (ten sam inode)", () => {
    appendVaultLine("Checklists/2026-11.jsonl", '{"a":1}');
    const abs = path.join(vault.root, "Checklists/2026-11.jsonl");
    const inode = fs.statSync(abs).ino;
    appendVaultLine("Checklists/2026-11.jsonl", '{"a":2}');
    expect(vault.read("Checklists/2026-11.jsonl")).toBe('{"a":1}\n{"a":2}\n');
    expect(fs.statSync(abs).ino).toBe(inode);
  });

  it("niedokończona ostatnia linia (bez \\n) nie skleja się z nową", () => {
    vault.write("Checklists/2026-11.jsonl", '{"a":1}');
    appendVaultLine("Checklists/2026-11.jsonl", '{"a":2}');
    expect(vault.read("Checklists/2026-11.jsonl")).toBe('{"a":1}\n{"a":2}\n');
  });

  it("linia z końcem linii w środku daje błąd, plik bez zmian", () => {
    vault.write("Checklists/2026-11.jsonl", '{"a":1}\n');
    expect(() => appendVaultLine("Checklists/2026-11.jsonl", '{"a":\n2}')).toThrow(/końca linii/);
    expect(() => appendVaultLine("Checklists/2026-11.jsonl", '{"a":2}\r')).toThrow(/końca linii/);
    expect(vault.read("Checklists/2026-11.jsonl")).toBe('{"a":1}\n');
  });

  it("odmawia zapisu do Work/ bez zgody", () => {
    expect(() => appendVaultLine("Work/Checklists/x.jsonl", "{}")).toThrow(WorkAreaBlockedError);
    expect(vault.read("Work/Checklists/x.jsonl")).toBeNull();
  });

  it("odmawia ścieżki poza vaultem", () => {
    expect(() => appendVaultLine("../x", "{}")).toThrow(PathOutsideVaultError);
  });
});

describe("vaultFileMtimeMs", () => {
  const vault = setupTempVault();

  it("zwraca null dla nieistniejącego pliku", () => {
    expect(vaultFileMtimeMs("nie-ma.md")).toBeNull();
  });

  it("zwraca dodatnią liczbę dla istniejącego pliku", () => {
    vault.write("Knowledge/kodeks.md", "x");
    const mtime = vaultFileMtimeMs("Knowledge/kodeks.md");
    expect(typeof mtime).toBe("number");
    expect(mtime).toBeGreaterThan(0);
  });
});
