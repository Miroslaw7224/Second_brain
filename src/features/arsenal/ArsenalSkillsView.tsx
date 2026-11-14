import React from "react";
import { Loader2 } from "lucide-react";
import "@/src/features/resources/resources.css";
import "./arsenal.css";
import { ArsenalDetail, projectName } from "./ArsenalDetail";
import { ArsenalFilterBar } from "./ArsenalFilterBar";
import { promptModels } from "./arsenalFilters";
import { useArsenal, type ApiFetch } from "./useArsenal";

export function ArsenalSkillsView({ apiFetch }: { apiFetch: ApiFetch }) {
  const a = useArsenal(apiFetch);

  return (
    <div className="ars asv" data-card="arsenal">
      <header className="ars-head">
        <div>
          <p className="ars-eyebrow">Alt+7 · Arsenał</p>
          <h1 className="ars-title">Skille i prompty</h1>
          <p className="ars-sub">
            {a.total} wpisów
            {a.skipped > 0 && ` · pominięto ${a.skipped} (uszkodzone lub nieznane wdrożenia)`}
          </p>
        </div>
      </header>

      {a.loading ? (
        <Loader2 className="animate-spin" aria-label="Ładowanie" />
      ) : a.error !== null ? (
        <p role="alert" className="asv-error">
          {a.error}
        </p>
      ) : (
        <>
          <ArsenalFilterBar
            filters={a.filters}
            onChange={a.setFilters}
            targets={a.targets}
            models={promptModels(a.allEntries)}
          />
          <div className="asv-layout">
            <ul className="asv-list" role="list">
              {a.entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="asv-item"
                    aria-pressed={entry.id === a.selectedId}
                    onClick={() => a.setSelectedId(entry.id)}
                  >
                    <span className="asv-badge" data-kind={entry.kind}>
                      {entry.kind === "skill" ? "Skill" : "Prompt"}
                    </span>
                    <strong>{entry.name}</strong>
                    <span className="asv-summary">{entry.summary}</span>
                    {entry.kind === "skill" && entry.deployed.length > 0 && (
                      <span className="asv-chips-row">
                        {entry.deployed.map((d) => (
                          <span key={d.project} className="asv-chip-static">
                            {projectName(a.targets, d.project)}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {a.entries.length === 0 && (
                <li className="asv-empty">Brak wpisów dla tych filtrów.</li>
              )}
            </ul>
            <ArsenalDetail
              entry={a.selected}
              targets={a.targets}
              fetchInstructions={a.fetchInstructions}
              markDeployed={a.markDeployed}
            />
          </div>
        </>
      )}
    </div>
  );
}
