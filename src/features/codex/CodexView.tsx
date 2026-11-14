"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChecklistPanel } from "./ChecklistPanel";
import { CodexAlerts } from "./CodexAlerts";
import { CodexRules, ruleElementId } from "./CodexRules";
import { CodexConfigError, CodexMissing } from "./CodexStates";
import { CodexToasts, useToasts } from "./CodexToast";
import { CodexToc } from "./CodexToc";
import { alertItems, countLevels, filterCodex, type LevelFilter } from "./codexFilters";
import { useChecklistRun, type OwnerZone } from "./useChecklistRun";
import { useCodex, type ApiFetch } from "./useCodex";
import "./codex.css";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function formatMtime(ms: number): string {
  return new Date(ms).toLocaleString("pl-PL", { dateStyle: "full", timeStyle: "medium" });
}

export function CodexView({ apiFetch }: { apiFetch: ApiFetch }) {
  const { state, reload } = useCodex(apiFetch);
  const { toasts, push } = useToasts();
  const [level, setLevel] = useState<LevelFilter>("all");
  const [query, setQuery] = useState("");
  const [checklistId, setChecklistId] = useState("");
  const [owner, setOwner] = useState<OwnerZone>("personal");
  const [task, setTask] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [pendingJump, setPendingJump] = useState<string | null>(null);

  const data = state.status === "ok" ? state.data : null;
  const checklists = useMemo(() => data?.checklists ?? [], [data]);
  const selected = checklists.find((c) => c.id === checklistId) ?? checklists[0];
  const itemIds = useMemo(() => selected?.items.map((item) => item.id) ?? [], [selected]);

  const runApi = useChecklistRun(apiFetch, {
    checklist: selected?.id ?? null,
    owner,
    task,
    itemIds,
  });

  const jumpToRule = useCallback(
    (ruleId: string) => {
      const el = document.getElementById(ruleElementId(ruleId));
      if (!el) {
        // reguła ukryta przez filtr: czyścimy filtr i przewijamy po renderze
        setLevel("all");
        setQuery("");
        setPendingJump(ruleId);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(ruleId);
      window.setTimeout(
        () => setHighlightId((current) => (current === ruleId ? null : current)),
        1800
      );
      push(`Przewinięto do reguły #${ruleId}`);
    },
    [push]
  );

  useEffect(() => {
    if (pendingJump && document.getElementById(ruleElementId(pendingJump))) {
      const id = pendingJump;
      setPendingJump(null);
      jumpToRule(id);
    }
  }, [pendingJump, jumpToRule, level, query]);

  const sectionIds = useMemo(() => data?.sections.map((s) => s.id) ?? [], [data]);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || sectionIds.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "0px 0px -70% 0px" }
    );
    for (const id of [...sectionIds, "sec-checklisty"]) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sectionIds]);

  const selectSection = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copy = async (text: string, okMessage: string) => {
    push((await copyText(text)) ? okMessage : "Nie udało się skopiować do schowka");
  };

  const refresh = async () => {
    const outcome = await reload();
    await runApi.reload();
    if (outcome === "error") push("Nie udało się odświeżyć kodeksu");
    else if (outcome === "changed") push("Odświeżono: plik kodeksu się zmienił");
    else push(`Odświeżono stan mtime: plik aktualny (${new Date().toLocaleTimeString("pl-PL")})`);
  };

  const body = (() => {
    if (state.status === "loading") return <p className="kod-text-block">Wczytywanie kodeksu…</p>;
    if (state.status === "error") {
      return (
        <p className="kod-error-inline" role="alert">
          {state.message}
        </p>
      );
    }
    if (state.status === "missing") {
      return (
        <CodexMissing
          path={state.path}
          onCopy={(text) => void copy(text, "Skopiowano polecenie utworzenia pliku kodeks.md")}
        />
      );
    }
    if (state.status === "config-error") {
      return <CodexConfigError message={state.message} onRetry={() => void reload()} />;
    }
    const codex = state.data;
    const counts = countLevels(codex.rules);
    const journalName = runApi.month ? `${runApi.month}.jsonl` : null;
    const alerts = alertItems(
      codex.warnings,
      runApi.skippedLines,
      runApi.unterminatedTail,
      journalName
    );
    const sections = filterCodex(codex.sections, codex.rules, level, query);
    return (
      <>
        <div className="kod-filebar">
          <div className="kod-filebar__main">
            <span className="kod-filebar__badge">Tylko do odczytu</span>
            <span className="kod-filebar__path">Vault/{codex.path}</span>
            <span className="kod-filebar__mtime">
              mtime: <b>{formatMtime(codex.mtimeMs)}</b>
            </span>
          </div>
        </div>
        <div className="tiles kod-tiles">
          <div className="tile tile--accent">
            <span className="tile__label">Reguły kodeksu</span>
            <span className="tile__value">{counts.all}</span>
            <span className="tile__meta">
              {counts.must} MUST (mocne) · {counts.should} SHOULD
            </span>
          </div>
          <div className="tile">
            <span className="tile__label">Uruchomiona checklista</span>
            <span className="tile__value">{`${runApi.progress.done} / ${runApi.progress.total}`}</span>
            <span className="tile__meta">
              {selected?.title ?? "—"} ({runApi.progress.pct}%)
            </span>
          </div>
          <div className="tile">
            <span className="tile__label">Dziennik zdarzeń</span>
            <span className="tile__value">{runApi.eventCount}</span>
            <span className="tile__meta">{journalName ?? "—"} · dopisywanie</span>
          </div>
          <div className="tile">
            <span className="tile__label">Stan walidacji</span>
            <span
              className="tile__value"
              style={alerts.length > 0 ? { color: "var(--warn)" } : undefined}
            >
              {alerts.length}
            </span>
            <span className="tile__meta">Ostrzeżenia parsera (nieblokujące)</span>
          </div>
        </div>
        <CodexAlerts items={alerts} />
        <div className="kod-layout">
          <CodexToc data={codex} activeId={activeId} onSelect={selectSection} />
          <CodexRules
            data={codex}
            sections={sections}
            level={level}
            query={query}
            highlightId={highlightId}
            onLevel={setLevel}
            onQuery={setQuery}
            onJump={jumpToRule}
          />
          {selected ? (
            <ChecklistPanel
              data={codex}
              selectedId={selected.id}
              onSelect={setChecklistId}
              owner={owner}
              onOwner={setOwner}
              task={task}
              onTask={setTask}
              runApi={runApi}
              onJump={jumpToRule}
              onToast={push}
            />
          ) : null}
        </div>
      </>
    );
  })();

  return (
    <main className="kod-root" aria-label="Kodeks">
      <header className="view-head">
        <div>
          <p className="view-head__eyebrow">Alt+9 · Kodeks</p>
          <h1 className="view-head__title">{data?.title || "Kodeks"}</h1>
          <p className="view-head__sub">
            Czytnik reguł normatywnych <code>Vault/Knowledge/kodeks.md</code> i interaktywne
            checklisty zadań
          </p>
        </div>
        <div className="view-head__actions">
          <button type="button" className="btn btn--sm" onClick={() => void refresh()}>
            Odśwież mtime
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() =>
              void copy(
                "Vault/Knowledge/kodeks.md",
                "Skopiowano ścieżkę: Vault/Knowledge/kodeks.md"
              )
            }
          >
            Kopiuj ścieżkę
          </button>
        </div>
      </header>
      {body}
      <CodexToasts toasts={toasts} />
    </main>
  );
}
