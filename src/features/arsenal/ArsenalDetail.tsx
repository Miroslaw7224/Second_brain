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

export function projectName(targets: DeployTargetDto[], id: string): string {
  return targets.find((t) => t.id === id)?.name ?? id;
}

export function ArsenalDetail({ entry, targets, fetchInstructions, markDeployed }: Props) {
  if (entry === null) return <p className="asv-empty">Wybierz wpis z listy.</p>;
  return (
    <article className="asv-detail">
      <h2>{entry.name}</h2>
      <p className="asv-meta">
        {entry.kind === "skill" ? "Skill" : "Prompt"}
        {entry.kind === "skill" && entry.origin !== undefined && ` · pochodzenie: ${entry.origin}`}
        {entry.kind === "prompt" && entry.model !== undefined && ` · model: ${entry.model}`}
      </p>
      {entry.summary !== "" && <p>{entry.summary}</p>}
      <div className="asv-actions">
        <h3>Treść</h3>
        <CopyButton text={entry.body} />
      </div>
      <pre className="asv-body">{entry.body}</pre>

      {entry.kind === "prompt" && entry.projects.length > 0 && (
        <p className="asv-meta">
          Projekty: {entry.projects.map((id) => projectName(targets, id)).join(", ")}
        </p>
      )}

      {entry.kind === "skill" && (
        <>
          <section aria-label="Szablony">
            <h3>Szablony</h3>
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
            <h3>Wdrożenia</h3>
            {entry.deployed.length === 0 ? (
              <p className="asv-empty">Niewdrożone nigdzie.</p>
            ) : (
              <ul className="asv-deployed">
                {entry.deployed.map((d) => (
                  <li key={d.project}>
                    <span>{projectName(targets, d.project)}</span> · {MODE_LABEL[d.mode]} · {d.date}
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
    </article>
  );
}
