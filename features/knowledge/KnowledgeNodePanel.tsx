import React from "react";

// Temporary stub — replaced in Task 3
export function KnowledgeNodePanel({ onClose }: { node: any; apiFetch: any; onClose: () => void }) {
  return (
    <div data-testid="knowledge-node-panel">
      <button onClick={onClose} aria-label="Zamknij">
        Zamknij
      </button>
    </div>
  );
}
