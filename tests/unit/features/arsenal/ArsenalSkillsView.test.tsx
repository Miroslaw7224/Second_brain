import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArsenalSkillsView } from "@/src/features/arsenal/ArsenalSkillsView";

afterEach(cleanup);

const catalog = {
  entries: [
    {
      kind: "skill",
      id: "skill:tdd",
      path: "Arsenal/Skills/tdd/skill.md",
      name: "test-driven-development",
      slug: "tdd",
      summary: "Najpierw test",
      body: "# TDD\nTreść skilla",
      origin: "global",
      deployed: [{ project: "p", mode: "full", date: "2026-11-14" }],
      templates: [{ name: "t.md", text: "szablon" }],
    },
    {
      kind: "prompt",
      id: "prompt:Rada",
      path: "Knowledge/prompty/Rada.md",
      name: "Rada ekspertów",
      summary: "Rada",
      body: "Treść promptu",
      projects: [],
    },
  ],
  targets: [
    { id: "p", name: "Projekt P", localPath: "~/p", owner: "personal" },
    { id: "w", name: "Projekt W", localPath: "~/w", owner: "work" },
  ],
  skipped: 2,
};

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

function setup() {
  const apiFetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return json({});
    if (url.includes("/deploy?")) {
      return json({
        mode: "full",
        text: "scripts/deploy-skill.sh tdd '~/w'",
        note: "Dane z firmy: sprawdź, gdzie wklejasz",
      });
    }
    return json(catalog);
  });
  render(<ArsenalSkillsView apiFetch={apiFetch} />);
  return apiFetch;
}

describe("ArsenalSkillsView", () => {
  it("pokazuje listę wpisów i licznik pominiętych", async () => {
    setup();
    expect(await screen.findByRole("button", { name: /test-driven-development/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Rada ekspertów/ })).toBeVisible();
    expect(screen.getByText(/pominięto 2/i)).toBeVisible();
  });

  it("filtr „prompty” ukrywa skille", async () => {
    setup();
    await screen.findByRole("button", { name: /test-driven-development/ });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "prompty" }));
    expect(screen.queryByRole("button", { name: /test-driven-development/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Rada ekspertów/ })).toBeVisible();
  });

  it("wybór skilla pokazuje treść, szablony i wdrożenia", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /test-driven-development/ }));
    expect(screen.getByRole("heading", { name: "test-driven-development" })).toBeVisible();
    expect(screen.getByText(/Treść skilla/)).toBeVisible();
    expect(screen.getByText("t.md")).toBeVisible();
    expect(screen.getByText(/Projekt P/, { selector: ".asv-deployed *" })).toBeVisible();
  });

  it("generuje polecenie dla projektu z etatu z notą ostrzegawczą", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /test-driven-development/ }));
    await user.selectOptions(screen.getByLabelText("Projekt docelowy"), "w");
    await user.click(screen.getByRole("button", { name: "Generuj" }));
    expect(await screen.findByText("scripts/deploy-skill.sh tdd '~/w'")).toBeVisible();
    expect(screen.getByText("Dane z firmy: sprawdź, gdzie wklejasz")).toBeVisible();
  });

  it("„Oznacz jako wdrożone” wysyła POST z projektem i trybem", async () => {
    const apiFetch = setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /test-driven-development/ }));
    await user.selectOptions(screen.getByLabelText("Projekt docelowy"), "w");
    await user.click(screen.getByRole("button", { name: "Generuj" }));
    await user.click(await screen.findByRole("button", { name: "Oznacz jako wdrożone" }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/arsenal/skills/tdd/deployed",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ project: "w", mode: "full" }),
        })
      )
    );
  });

  it("przełączenie projektu czyści wygenerowany tekst", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /test-driven-development/ }));
    await user.click(screen.getByRole("button", { name: "Generuj" }));
    await screen.findByText("scripts/deploy-skill.sh tdd '~/w'");
    await user.selectOptions(screen.getByLabelText("Projekt docelowy"), "w");
    expect(screen.queryByText("scripts/deploy-skill.sh tdd '~/w'")).toBeNull();
  });
});
