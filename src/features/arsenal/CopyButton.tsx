import React, { useEffect, useRef, useState } from "react";

export function CopyButton({ text, label = "Kopiuj" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };
  return (
    <button type="button" className="asv-btn" onClick={copy}>
      {done ? "Skopiowano" : label}
    </button>
  );
}
