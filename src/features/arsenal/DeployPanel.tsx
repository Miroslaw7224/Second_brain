import React, { useState } from "react";
import type {
  DeployInstructionsDto,
  DeployModeDto,
  DeployTargetDto,
  SkillEntryDto,
} from "@/contexts/bc_arsenal/schemas";
import { CopyButton } from "./CopyButton";

type Props = {
  skill: SkillEntryDto;
  targets: DeployTargetDto[];
  fetchInstructions: (
    slug: string,
    project: string,
    mode: DeployModeDto
  ) => Promise<DeployInstructionsDto>;
  markDeployed: (slug: string, project: string, mode: DeployModeDto) => Promise<void>;
};

const message = (err: unknown): string => (err instanceof Error ? err.message : "Błąd");

export function DeployPanel({ skill, targets, fetchInstructions, markDeployed }: Props) {
  const [project, setProject] = useState(targets[0]?.id ?? "");
  const [mode, setMode] = useState<DeployModeDto>("full");
  const [result, setResult] = useState<DeployInstructionsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [marked, setMarked] = useState(false);

  if (targets.length === 0) return <p className="asv-empty">Brak projektów w rejestrze.</p>;

  const reset = () => {
    setResult(null);
    setError(null);
    setMarked(false);
  };

  const generate = async () => {
    setBusy(true);
    reset();
    try {
      setResult(await fetchInstructions(skill.slug, project, mode));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const mark = async () => {
    setBusy(true);
    setError(null);
    try {
      await markDeployed(skill.slug, project, mode);
      setMarked(true);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="asv-deploy" aria-label="Wdrażanie do projektu">
      <h3>Wdrażanie do projektu</h3>
      <label>
        Projekt docelowy
        <select
          value={project}
          onChange={(e) => {
            setProject(e.target.value);
            reset();
          }}
        >
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.owner === "work" ? " (etat)" : ""}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="asv-modes">
        <legend>Tryb</legend>
        <label>
          <input
            type="radio"
            name={`mode-${skill.slug}`}
            checked={mode === "full"}
            onChange={() => {
              setMode("full");
              reset();
            }}
          />
          W całości (polecenie skryptu)
        </label>
        <label>
          <input
            type="radio"
            name={`mode-${skill.slug}`}
            checked={mode === "adapted"}
            onChange={() => {
              setMode("adapted");
              reset();
            }}
          />
          Zredagowany (prompt dla agenta)
        </label>
      </fieldset>
      <button type="button" className="asv-btn" disabled={busy} onClick={generate}>
        Generuj
      </button>
      {error !== null && (
        <p role="alert" className="asv-error">
          {error}
        </p>
      )}
      {result !== null && (
        <div className="asv-result">
          {result.note !== undefined && <p className="asv-note">{result.note}</p>}
          {result.mode === "full" && (
            <p className="asv-hint">Uruchom z katalogu Monolith. Aplikacja niczego nie wykonuje.</p>
          )}
          <pre className="asv-body">{result.text}</pre>
          <div className="asv-actions">
            <CopyButton text={result.text} />
            <button type="button" className="asv-btn" disabled={busy} onClick={mark}>
              Oznacz jako wdrożone
            </button>
            {marked && <span className="asv-ok">Zapisano w skill.md</span>}
          </div>
        </div>
      )}
    </section>
  );
}
