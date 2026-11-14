import React, { useState } from "react";

export function CopyButton({ text, label = "Kopiuj" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
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
