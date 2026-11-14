// src/features/home/InboxItemDialog.tsx
import React, { useState } from "react";
import type { InboxItemDto, MoveInboxBody } from "@/contexts/bc_inbox/schemas";
import { InboxMoveForm } from "./InboxMoveForm";

/**
 * Pełny wpis inboxu z akcjami: „Gotowe” (zostaje w pliku jako `[x]`), „Usuń” (znika z pliku)
 * albo „Przenieś do…” (zadanie projektu, zadanie ogólne, notatka).
 */
export function InboxItemDialog({
  item,
  apiFetch,
  busy,
  error,
  onResolve,
  onDelete,
  onMove,
  onClose,
}: {
  item: InboxItemDto;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  busy: boolean;
  error: string | null;
  onResolve: () => void;
  onDelete: () => void;
  onMove: (body: MoveInboxBody) => void;
  onClose: () => void;
}) {
  const [moving, setMoving] = useState(false);
  return (
    <div className="kok-overlay">
      <div role="dialog" aria-label="Wpis z inboxu" className="kok-modal">
        <div className="kok-modal__head">
          <h3 className="kok-modal__title">Wpis z inboxu</h3>
          <p className="kok-modal__sub">
            {item.type}
            {item.at ? ` · ${item.at.replace("T", " ")}` : ""}
          </p>
        </div>
        {moving ? (
          <InboxMoveForm
            item={item}
            apiFetch={apiFetch}
            busy={busy}
            error={error}
            onSubmit={onMove}
            onCancel={() => setMoving(false)}
          />
        ) : (
          <>
            <p className="kok-inbox__full">{item.text}</p>
            {error ? (
              <p className="kok-state kok-state--error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="kok-modal__actions">
              <button type="button" onClick={onClose} className="kok-btn kok-btn--ghost">
                Zamknij
              </button>
              <button
                type="button"
                className="kok-btn"
                disabled={busy}
                onClick={() => setMoving(true)}
              >
                Przenieś do…
              </button>
              <button type="button" className="kok-btn" disabled={busy} onClick={onResolve}>
                Gotowe
              </button>
              <button
                type="button"
                className="kok-btn kok-btn--danger"
                disabled={busy}
                onClick={onDelete}
              >
                Usuń
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
