import React from "react";
import type {
  ArsenalEntryDto,
  DeployInstructionsDto,
  DeployModeDto,
  DeployTargetDto,
} from "@/contexts/bc_arsenal/schemas";
import { CopyButton } from "./CopyButton";
import { DeployPanel } from "./DeployPanel";

type Props = {
  entry: ArsenalEntryDto | null;
  targets: DeployTargetDto[];
  fetchInstructions: (
    slug: string,
    project: string,
    mode: DeployModeDto
  ) => Promise<DeployInstructionsDto>;
  markDeployed: (slug: string, project: string, mode: DeployModeDto) => Promise<void>;
};

const MODE_LABEL: Record<DeployModeDto, string> = { full: "w całości", adapted: "zredagowany" };

export const KIND_LABEL: Record<ArsenalEntryDto["kind"], string> = {
  skill: "Skill",
  prompt: "Prompt",
};

export function projectName(targets: DeployTargetDto[], id: string): string {
  return targets.find((t) => t.id === id)?.name ?? id;
}

export function ArsenalDetail({ entry, targets, fetchInstructions, markDeployed }: Props) {
  return (
    <aside className="asv-side" aria-label="Szczegóły wpisu">
      {entry === null ? (
        <p className="asv-empty">Wybierz wpis z listy.</p>
      ) : (
        <>
          <div className="asv-side__head">
            <span className="asv-badge" data-kind={entry.kind}>
              {KIND_LABEL[entry.kind]}
            </span>
            <h2 className="asv-side__title">{entry.name}</h2>
          </div>
          {entry.summary !== "" && <p className="asv-side__summary">{entry.summary}</p>}

          <dl className="asv-kv">
            <dt>Plik</dt>
            <dd>{entry.path}</dd>
            {entry.kind === "skill" && entry.origin !== undefined && (
              <>
                <dt>Pochodzenie</dt>
                <dd>{entry.origin}</dd>
              </>
            )}
            {entry.kind === "prompt" && entry.model !== undefined && (
              <>
                <dt>Model</dt>
                <dd>{entry.model}</dd>
              </>
            )}
            {entry.kind === "prompt" && (
              <>
                <dt>Projekty</dt>
                <dd>
                  {entry.projects.length > 0
                    ? entry.projects.map((id) => projectName(targets, id)).join(", ")
                    : "—"}
                </dd>
              </>
            )}
          </dl>

          <div>
            <span className="asv-label">Treść</span>
            <pre className="asv-body">{entry.body}</pre>
          </div>
          <div className="asv-actions">
            <CopyButton text={entry.body} label="Kopiuj treść" primary />
          </div>

          {entry.kind === "skill" && (
            <>
              <section aria-label="Szablony">
                <span className="asv-label">Szablony</span>
                {entry.templates.length === 0 ? (
                  <p className="asv-empty">Brak szablonów.</p>
                ) : (
                  <ul className="asv-templates">
                    {entry.templates.map((template) => (
                      <li key={template.name}>
                        <span>{template.name}</span>
                        <CopyButton text={template.text} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section aria-label="Wdrożenia">
                <span className="asv-label">Wdrożenia</span>
                {entry.deployed.length === 0 ? (
                  <p className="asv-empty">Niewdrożone nigdzie.</p>
                ) : (
                  <ul className="asv-deployed">
                    {entry.deployed.map((d) => (
                      <li key={d.project}>
                        <span>{projectName(targets, d.project)}</span> · {MODE_LABEL[d.mode]} ·{" "}
                        {d.date}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <DeployPanel
                key={entry.id}
                skill={entry}
                targets={targets}
                fetchInstructions={fetchInstructions}
                markDeployed={markDeployed}
              />
            </>
          )}
        </>
      )}
    </aside>
  );
}
