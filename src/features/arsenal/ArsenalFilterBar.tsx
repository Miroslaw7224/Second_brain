import React from "react";
import type { DeployTargetDto } from "@/contexts/bc_arsenal/schemas";
import { EMPTY_FILTERS, isFiltered, type ArsenalFilters, type KindFilter } from "./arsenalFilters";

const KINDS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "wszystkie" },
  { id: "skill", label: "skille" },
  { id: "prompt", label: "prompty" },
];

type Props = {
  filters: ArsenalFilters;
  onChange: (filters: ArsenalFilters) => void;
  targets: DeployTargetDto[];
  models: string[];
};

export function ArsenalFilterBar({ filters, onChange, targets, models }: Props) {
  const set = (patch: Partial<ArsenalFilters>) => onChange({ ...filters, ...patch });
  return (
    <div className="asv-filters">
      <input
        type="search"
        className="asv-search"
        aria-label="Szukaj skilla lub promptu"
        placeholder="Szukaj skilla lub promptu..."
        value={filters.query}
        onChange={(e) => set({ query: e.target.value })}
      />
      <div className="asv-chips">
        {KINDS.map((kind) => (
          <button
            key={kind.id}
            type="button"
            className="asv-chip"
            aria-pressed={filters.kind === kind.id}
            onClick={() => set({ kind: kind.id })}
          >
            {kind.label}
          </button>
        ))}
      </div>
      <select
        aria-label="Projekt"
        value={filters.project ?? ""}
        onChange={(e) => set({ project: e.target.value === "" ? null : e.target.value })}
      >
        <option value="">Wszystkie projekty</option>
        {targets.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {models.length > 0 && (
        <select
          aria-label="Model"
          value={filters.model ?? ""}
          onChange={(e) => set({ model: e.target.value === "" ? null : e.target.value })}
        >
          <option value="">Wszystkie modele</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}
      <label className="asv-check">
        <input
          type="checkbox"
          checked={filters.undeployedOnly}
          onChange={(e) => set({ undeployedOnly: e.target.checked })}
        />
        niewdrożone nigdzie
      </label>
      {isFiltered(filters) && (
        <button type="button" className="asv-btn" onClick={() => onChange(EMPTY_FILTERS)}>
          Wyczyść filtry
        </button>
      )}
    </div>
  );
}
