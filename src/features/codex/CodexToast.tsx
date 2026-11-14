"use client";

import React from "react";
import { useCallback, useRef, useState } from "react";

type Toast = { id: number; text: string };

/** Lokalne, krótkie komunikaty (znikają po 3 s); bez zależności od globalnego systemu toastów. */
export function useToasts(): { toasts: Toast[]; push: (text: string) => void } {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);
  const push = useCallback((text: string) => {
    const id = next.current++;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);
  return { toasts, push };
}

export function CodexToasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="kod-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="kod-toast">
          {toast.text}
        </div>
      ))}
    </div>
  );
}
