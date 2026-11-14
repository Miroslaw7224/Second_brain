import { useEffect, type RefObject } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/** `/` → fokus na wyszukiwarkę; `Esc` → wyczyść zapytanie i filtry. Tylko dla zamontowanego panelu. */
export function useResourceShortcuts(opts: {
  searchRef: RefObject<HTMLInputElement>;
  onClear: () => void;
  enabled: boolean;
}): void {
  const { searchRef, onClear, enabled } = opts;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape" && enabled) {
        // Esc w polach formularza nie kasuje filtrów; tylko poza polami albo w wyszukiwarce.
        if (isTypingTarget(e.target) && e.target !== searchRef.current) return;
        onClear();
        searchRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [searchRef, onClear, enabled]);
}
