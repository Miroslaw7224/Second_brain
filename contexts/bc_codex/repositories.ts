import { DomainError } from "@/lib/errors";
import { appendVaultLine, readVaultFile, vaultFileMtimeMs } from "@/lib/nexus/vault-fs";
import { VaultConfigError } from "@/lib/nexus/vault-path";
import { WorkAccessBlockedError, assertWorkAccess } from "@/lib/workGuard";
import { CODEX_PATH, type OwnerZone } from "./models";

export type CodexFile =
  | { kind: "ok"; text: string; mtimeMs: number }
  | { kind: "missing" }
  | { kind: "config-error"; message: string };

export type JournalRead =
  | { kind: "ok"; text: string | null }
  | { kind: "blocked"; message: string };

/** Ścieżka dziennika wynika wyłącznie ze strefy: `work` ląduje w `Work/` (ignorowanym przez git). */
export function journalPath(owner: OwnerZone, month: string): string {
  return owner === "work" ? `Work/Checklists/${month}.jsonl` : `Checklists/${month}.jsonl`;
}

/** Brak konfiguracji vaulta w ścieżkach dziennika to błąd usługi (503), nie wyjątek bez kodu. */
function asServiceError(err: unknown): never {
  if (err instanceof VaultConfigError) throw new DomainError(err.message, 503);
  throw err;
}

/** Odczyt `Knowledge/kodeks.md` razem z `mtime`. Brak vaulta i brak pliku to zwykłe wyniki, nie wyjątki. */
export function readCodexFile(): CodexFile {
  try {
    const file = readVaultFile(CODEX_PATH);
    if (file === null) return { kind: "missing" };
    return { kind: "ok", text: file.text, mtimeMs: vaultFileMtimeMs(CODEX_PATH) ?? 0 };
  } catch (err) {
    if (err instanceof VaultConfigError) return { kind: "config-error", message: err.message };
    throw err;
  }
}

/** Surowy tekst dziennika (`null`, gdy pliku jeszcze nie ma). Strefa `work` najpierw przechodzi strażnika git. */
export function readJournal(owner: OwnerZone, month: string): JournalRead {
  try {
    const rel = journalPath(owner, month);
    const file = owner === "work" ? readVaultFile(rel, assertWorkAccess()) : readVaultFile(rel);
    return { kind: "ok", text: file?.text ?? null };
  } catch (err) {
    if (err instanceof WorkAccessBlockedError) return { kind: "blocked", message: err.message };
    return asServiceError(err);
  }
}

/** Dopisuje jedną linię do dziennika strefy. `work` bez pozytywnego strażnika rzuca 403 przed zapisem. */
export function appendJournalLine(owner: OwnerZone, month: string, line: string): void {
  try {
    const rel = journalPath(owner, month);
    if (owner === "work") appendVaultLine(rel, line, assertWorkAccess());
    else appendVaultLine(rel, line);
  } catch (err) {
    asServiceError(err);
  }
}
