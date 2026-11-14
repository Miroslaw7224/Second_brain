"use client";

import React from "react";
import type { AlertItem } from "./codexFilters";

function plural(n: number): string {
  if (n === 1) return "1 uwaga";
  const last = n % 10;
  const teen = n % 100 >= 12 && n % 100 <= 14;
  return last >= 2 && last <= 4 && !teen ? `${n} uwagi` : `${n} uwag`;
}

/** Nieblokujące ostrzeżenia parsera i dziennika (spec §4.1, §4.2); bez ostrzeżeń nie renderuje nic. */
export function CodexAlerts({ items }: { items: AlertItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="kod-alerts" aria-label="Ostrzeżenia parsera kodeksu">
      <div className="kod-alerts__head">
        <h2 className="kod-alerts__title">
          Ostrzeżenia diagnostyczne (parsowanie poprawne, czytanie kontynuowane)
        </h2>
        <span className="chip chip--warn">{plural(items.length)}</span>
      </div>
      <ul className="kod-alerts__list">
        {items.map((item, i) => (
          <li key={`${item.tag}-${i}`} className="kod-alerts__item">
            <span className="kod-alerts__tag">{item.tag}</span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
