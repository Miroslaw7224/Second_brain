import React from "react";
import type { TagCount } from "./resourceFilters";

export interface ResourceFilterSidebarProps {
  tagCounts: TagCount[];
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  clearTagFilter: () => void;
  fixOnly: boolean;
  fixCount: number;
  onToggleFix: () => void;
  fixLabel: string;
  loading: boolean;
  resourcesLength: number;
  filterByTagsLabel: string;
  clearFiltersLabel: string;
}

export function ResourceFilterSidebar({
  tagCounts,
  selectedTags,
  toggleTag,
  clearTagFilter,
  fixOnly,
  fixCount,
  onToggleFix,
  fixLabel,
  loading,
  resourcesLength,
  filterByTagsLabel,
  clearFiltersLabel,
}: ResourceFilterSidebarProps) {
  if (loading || resourcesLength === 0) return null;

  return (
    <div className="ars-filter-box">
      <div className="ars-filter-box__head">
        <span className="ars-filter-box__label">{filterByTagsLabel}</span>
        {(selectedTags.length > 0 || fixOnly) && (
          <button type="button" onClick={clearTagFilter} className="ars-filter-box__clear">
            {clearFiltersLabel}
          </button>
        )}
      </div>
      <div className="ars-filter-chips">
        <button
          type="button"
          onClick={onToggleFix}
          className={`chip ${fixOnly ? "chip--accent" : ""}`}
          aria-pressed={fixOnly}
        >
          {fixLabel} ({fixCount})
        </button>
        {tagCounts.map(({ tag, count }) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`chip ${isSelected ? "chip--accent" : ""}`}
              aria-pressed={isSelected}
            >
              <span className="ars-hash" aria-hidden="true">
                #
              </span>
              {tag} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
