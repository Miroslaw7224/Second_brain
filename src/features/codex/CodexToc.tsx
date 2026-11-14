"use client";

import React from "react";
import type { CodexOk } from "./codexFilters";
import { sectionLevelCounts } from "./codexFilters";

type Props = {
  data: CodexOk;
  activeId: string | null;
  onSelect: (id: string) => void;
};

function badge(must: number, should: number): string {
  const parts = [];
  if (must > 0) parts.push(`${must} MUST`);
  if (should > 0) parts.push(`${should} SHOULD`);
  return parts.join(" · ");
}

export function CodexToc({ data, activeId, onSelect }: Props) {
  const hasChecklists = data.checklists.length > 0;
  const total = data.sections.length + (hasChecklists ? 1 : 0);
  const link = (id: string, label: string, badgeText: string) => (
    <li key={id}>
      <a
        href={`#${id}`}
        className={`kod-toc__link${activeId === id ? " kod-toc__link--active" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          onSelect(id);
        }}
      >
        <span>{label}</span>
        {badgeText ? <span className="kod-toc__badge">{badgeText}</span> : null}
      </a>
    </li>
  );
  return (
    <aside className="kod-toc" aria-label="Spis treści kodeksu">
      <div className="kod-toc__head">
        <h2 className="kod-toc__title">Spis treści</h2>
        <span className="kod-toc__badge">{total} sekcji</span>
      </div>
      <nav>
        <ul className="kod-toc__list">
          {data.sections.map((section) => {
            const counts = sectionLevelCounts(section, data.rules);
            return link(section.id, section.title, badge(counts.must, counts.should));
          })}
          {hasChecklists
            ? link(
                "sec-checklisty",
                `${data.sections.length + 1}. Checklisty`,
                `${data.checklists.length} ${data.checklists.length === 1 ? "zestaw" : "zestawy"}`
              )
            : null}
        </ul>
      </nav>
      <div className="kod-toc__meta">
        <div className="kod-toc__meta-item">
          Plik źródłowy: <b>{data.path.split("/").pop()}</b>
        </div>
        <div className="kod-toc__meta-item">
          Konwencja: <b>Knowledge/</b>
        </div>
        {data.wikilinks.length > 0 ? (
          <div className="kod-toc__meta-item">
            Powiązanie: <b>{data.wikilinks.map((name) => `[[${name}]]`).join(", ")}</b>
          </div>
        ) : null}
        <div className="kod-toc__meta-item">
          Parser: <b>wzorzec reguły ze specu (§4.1)</b>
        </div>
      </div>
    </aside>
  );
}
