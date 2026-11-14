"use client";

import React from "react";
import { CODEX_TEMPLATE } from "./codexTemplate";

export function CodexMissing({ onCopy, path }: { onCopy: (text: string) => void; path: string }) {
  return (
    <div className="kod-state-view is-visible">
      <div className="kod-empty-box">
        <h2 className="kod-empty-box__title">Brak pliku kodeksu inżynierskiego</h2>
        <p className="kod-empty-box__desc">
          Aplikacja oczekuje pliku w ścieżce <code>Vault/{path}</code> w prywatnym repozytorium
          NEXUS. Plik nie został odnaleziony na dysku. Aby uruchomić czytnik, utwórz plik w vault za
          pomocą poniższego szablonu.
        </p>
        <pre className="kod-codeblock">{CODEX_TEMPLATE}</pre>
        <div className="row" style={{ gap: "var(--s-3)" }}>
          <button type="button" className="btn btn--primary" onClick={() => onCopy(CODEX_TEMPLATE)}>
            Kopiuj instrukcję utworzenia
          </button>
        </div>
      </div>
    </div>
  );
}

export function CodexConfigError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="kod-state-view is-visible">
      <div className="kod-empty-box kod-error-box">
        <h2 className="kod-empty-box__title" style={{ color: "var(--danger)" }}>
          Błąd konfiguracji: brak NEXUS_VAULT_PATH
        </h2>
        <p className="kod-empty-box__desc">{message}</p>
        <pre className="kod-codeblock">
          {
            "# Sprawdź plik .env.local w katalogu Monolith:\nNEXUS_VAULT_PATH=/bezwzględna/ścieżka/do/NEXUS/Vault\n# W WSL upewnij się, że dysk Windows jest zamontowany (ls /mnt/c)."
          }
        </pre>
        <div className="row" style={{ gap: "var(--s-3)" }}>
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Sprawdź połączenie ponownie
          </button>
        </div>
      </div>
    </div>
  );
}
