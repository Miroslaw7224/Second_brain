"use client";

import React from "react";
import type { CodexOk } from "./codexFilters";
import { CheckIcon } from "./CodexIcons";
import { ruleElementId } from "./CodexRules";
import type { OwnerZone, useChecklistRun } from "./useChecklistRun";

type RunApi = ReturnType<typeof useChecklistRun>;

type Props = {
  data: CodexOk;
  selectedId: string;
  onSelect: (id: string) => void;
  owner: OwnerZone;
  onOwner: (owner: OwnerZone) => void;
  task: string;
  onTask: (task: string) => void;
  runApi: RunApi;
  onJump: (ruleId: string) => void;
  onToast: (text: string) => void;
};

const REF_SPLIT = /(\[[A-Z][A-Z0-9]*-[0-9]+\])/;

function ItemLabel({
  text,
  ruleIds,
  onJump,
}: {
  text: string;
  ruleIds: Set<string>;
  onJump: (ruleId: string) => void;
}) {
  return (
    <>
      {text.split(REF_SPLIT).map((part, index) => {
        const ref = /^\[([A-Z][A-Z0-9]*-[0-9]+)\]$/.exec(part)?.[1];
        if (!ref) return part;
        if (!ruleIds.has(ref)) {
          return (
            <span
              key={index}
              className="kod-rule-ref kod-rule-ref--missing"
              title="Brak reguły w rejestrze"
            >
              {part}
            </span>
          );
        }
        return (
          <a
            key={index}
            href={`#${ruleElementId(ref)}`}
            className="kod-rule-ref"
            onClick={(event) => {
              event.preventDefault();
              onJump(ref);
            }}
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

function NoteInput({
  label,
  identity,
  saved,
  disabled,
  onSave,
}: {
  label: string;
  /** Strefa, uruchomienie i punkt: zmiana któregokolwiek czyści niewysłany tekst z pola. */
  identity: string;
  saved: string;
  disabled: boolean;
  onSave: (text: string) => void;
}) {
  return (
    <input
      key={`${identity}|${saved}`}
      type="text"
      className="input kod-note"
      defaultValue={saved}
      maxLength={300}
      placeholder="Dodaj jednolinijkową notatkę..."
      aria-label={label}
      disabled={disabled}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      onBlur={(event) => {
        const next = event.currentTarget.value.trim();
        if (next !== saved) onSave(next);
      }}
    />
  );
}

export function ChecklistPanel({
  data,
  selectedId,
  onSelect,
  owner,
  onOwner,
  task,
  onTask,
  runApi,
  onJump,
  onToast,
}: Props) {
  const checklist = data.checklists.find((c) => c.id === selectedId) ?? data.checklists[0];
  const ruleIds = new Set(data.rules.map((rule) => rule.id));
  const { run, progress, month, workBlocked, error } = runApi;
  const folder = owner === "work" ? "Vault/Work/Checklists/" : "Vault/Checklists/";
  const file = `${folder}${month ?? "RRRR-MM"}.jsonl`;
  const readOnly = Boolean(workBlocked);

  return (
    <section
      id="sec-checklisty"
      className="kod-checklists"
      aria-label="Sekcja checklist operacyjnych"
    >
      <div className="kod-run">
        <div className="kod-run__head">
          <div>
            <h2 className="kod-run__title">{checklist.title}</h2>
            <p className="kod-run__sub">
              Rejestracja zdarzeń w formacie append-only <code>.jsonl</code>
            </p>
          </div>
          <div className="tabs" role="tablist" aria-label="Wybór checklisty">
            {data.checklists.map((item) => (
              <button
                key={item.id}
                className="tabs__btn"
                type="button"
                role="tab"
                aria-selected={item.id === checklist.id}
                onClick={() => onSelect(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>

        <div className="kod-owner-box">
          <div className="kod-owner-box__top">
            <span className="kod-owner-box__label">Kontekst zadania i prywatność:</span>
            <div className="kod-owner-selector" role="radiogroup" aria-label="Strefa zapisu owner">
              {(["personal", "work"] as const).map((zone) => (
                <button
                  key={zone}
                  type="button"
                  role="radio"
                  aria-checked={owner === zone}
                  className={`kod-owner-btn${zone === "work" ? " kod-owner-btn--work" : ""}`}
                  onClick={() => onOwner(zone)}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>
          {owner === "personal" ? (
            <div className="kod-owner-info kod-owner-info--personal is-active">
              Zapis: <code>{file}</code> (repozytorium prywatne).
            </div>
          ) : (
            <div className="kod-owner-info kod-owner-info--work is-active">
              <div>
                <b>[Dane z firmy]</b> Zapis kierowany wyłącznie do strefy <code>{file}</code>{" "}
                ignorowanej przez git (§4.3 specu). Notatki i opisy nie trafią do repozytorium.
              </div>
              {workBlocked ? <p className="kod-error-inline">{workBlocked}</p> : null}
            </div>
          )}
          <label style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
            Zadanie:{" "}
            {run ? (
              <b style={{ color: "var(--text)" }}>{run.task || "(bez opisu)"}</b>
            ) : (
              <input
                type="text"
                className="input kod-task-input"
                maxLength={300}
                aria-label="Opis zadania"
                placeholder="Opis zadania (zapisany przy pierwszej interakcji)"
                value={task}
                disabled={readOnly}
                onChange={(event) => onTask(event.target.value)}
              />
            )}
          </label>
        </div>

        <div className="kod-progress-box">
          <div className="kod-progress-box__top">
            <span className="kod-progress-box__count">
              Postęp: <b>{`${progress.done} z ${progress.total} odhaczone`}</b>
            </span>
            <span className="kod-progress-box__pct mono" style={{ color: "var(--accent-text)" }}>
              {progress.pct}%
            </span>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.pct}
          >
            <span style={{ ["--v" as string]: `${progress.pct}%` }} />
          </div>
        </div>

        {error && !workBlocked ? (
          <p className="kod-error-inline" role="alert">
            {error}
          </p>
        ) : null}

        <ul className="kod-items-list">
          {checklist.items.map((item, index) => {
            const state = run?.items[item.id];
            const checked = state?.checked === true;
            const plain = item.text.replace(/\[[A-Z][A-Z0-9]*-[0-9]+\]\s*/g, "").trim();
            const missing = item.ruleRefs.some((ref) => !ruleIds.has(ref));
            const checkboxId = `chk-${item.id}`;
            return (
              <li key={item.id} className={`kod-item${checked ? " kod-item--checked" : ""}`}>
                <div className="kod-item__row">
                  <input
                    type="checkbox"
                    className="check kod-item__check"
                    id={checkboxId}
                    checked={checked}
                    disabled={readOnly}
                    aria-label={`Punkt ${index + 1}: ${plain}`}
                    onChange={(event) => {
                      const next = event.target.checked;
                      void runApi.toggle(item.id, next).then((ok) => {
                        if (ok) {
                          onToast(
                            next
                              ? "Zarejestrowano zdarzenie toggle: ukończono punkt"
                              : "Zarejestrowano zdarzenie toggle: cofnięto punkt"
                          );
                        }
                      });
                    }}
                  />
                  <div className="kod-item__body">
                    <label htmlFor={checkboxId} className="kod-item__label">
                      <ItemLabel text={item.text} ruleIds={ruleIds} onJump={onJump} />
                    </label>
                    {missing ? (
                      <span
                        className="chip chip--warn"
                        style={{ fontSize: 10, height: 18, marginLeft: "auto" }}
                      >
                        Brak definicji ID
                      </span>
                    ) : (
                      <span
                        className={`kod-item__status-tag kod-item__status-tag--${checked ? "done" : "todo"}`}
                      >
                        {checked ? <CheckIcon /> : null}
                        {checked ? "Odhaczone" : "Do zrobienia"}
                      </span>
                    )}
                  </div>
                </div>
                <NoteInput
                  label={`Notatka do punktu ${index + 1}`}
                  identity={`${owner}|${run?.run ?? "new"}|${item.id}`}
                  saved={state?.note ?? ""}
                  disabled={readOnly}
                  onSave={(text) => {
                    void runApi.setNote(item.id, text).then((ok) => {
                      if (ok) {
                        onToast("Dopisano notatkę punktu do dziennika zdarzeń (append-only)");
                      }
                    });
                  }}
                />
              </li>
            );
          })}
        </ul>

        <div
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--muted)",
            borderTop: "1px solid var(--line)",
            paddingTop: "var(--s-3)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            Dziennik: <code>{folder}</code>
          </span>
          <button
            className="btn btn--sm"
            type="button"
            disabled={!run || readOnly}
            onClick={() => {
              void runApi.end().then((ok) => {
                if (ok) {
                  onTask("");
                  onToast("Zapisano sesję: uruchomienie zamknięte w dzienniku .jsonl");
                }
              });
            }}
          >
            Zapisz sesję
          </button>
        </div>
      </div>
    </section>
  );
}
