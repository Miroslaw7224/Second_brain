// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const mockListArsenal = vi.hoisted(() => vi.fn());
const mockGetInstructions = vi.hoisted(() => vi.fn());
const mockMarkDeployed = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/bc_arsenal/services", () => ({
  listArsenal: mockListArsenal,
  getDeployInstructions: mockGetInstructions,
  markDeployed: mockMarkDeployed,
}));

import { getCatalog, getDeployInstructions, postDeployed } from "@/contexts/bc_arsenal/router";

const ctx = { params: Promise.resolve({ slug: "tdd" }) };
const skill = {
  kind: "skill" as const,
  id: "skill:tdd",
  path: "Arsenal/Skills/tdd/skill.md",
  name: "tdd",
  slug: "tdd",
  summary: "s",
  body: "b",
  deployed: [],
  templates: [],
};

beforeEach(() => {
  mockListArsenal.mockReset();
  mockGetInstructions.mockReset();
  mockMarkDeployed.mockReset();
});

describe("getCatalog", () => {
  it("200 z DTO katalogu", async () => {
    mockListArsenal.mockReturnValue({ entries: [skill], targets: [], skipped: 0 });
    const res = await getCatalog();
    expect(res.status).toBe(200);
    expect((await res.json()).entries[0].slug).toBe("tdd");
  });

  it("błąd domenowy zachowuje status", async () => {
    mockListArsenal.mockImplementation(() => {
      throw new DomainError("źle", 409);
    });
    expect((await getCatalog()).status).toBe(409);
  });
});

describe("getDeployInstructions", () => {
  const req = (query: string) =>
    new Request(`http://localhost/api/arsenal/skills/tdd/deploy${query}`);

  it("400 bez trybu lub projektu", async () => {
    expect((await getDeployInstructions(req("?project=p"), ctx)).status).toBe(400);
    expect((await getDeployInstructions(req("?mode=full"), ctx)).status).toBe(400);
    expect((await getDeployInstructions(req("?project=p&mode=x"), ctx)).status).toBe(400);
  });

  it("200 i wywołanie serwisu z (slug, projekt, tryb)", async () => {
    mockGetInstructions.mockReturnValue({ mode: "full", text: "cmd" });
    const res = await getDeployInstructions(req("?project=p&mode=full"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mode: "full", text: "cmd" });
    expect(mockGetInstructions).toHaveBeenCalledWith("tdd", "p", "full");
  });

  it("błąd domenowy zachowuje status", async () => {
    mockGetInstructions.mockImplementation(() => {
      throw new DomainError("brak", 404);
    });
    expect((await getDeployInstructions(req("?project=p&mode=full"), ctx)).status).toBe(404);
  });
});

describe("postDeployed", () => {
  const post = (body: unknown) =>
    new Request("http://localhost/api/arsenal/skills/tdd/deployed", {
      method: "POST",
      body: JSON.stringify(body),
    });

  it("400 dla złego ciała", async () => {
    expect((await postDeployed(post({ project: "p" }), ctx)).status).toBe(400);
    expect(mockMarkDeployed).not.toHaveBeenCalled();
  });

  it("200 z DTO zaktualizowanego skilla", async () => {
    mockMarkDeployed.mockResolvedValue({
      ...skill,
      deployed: [{ project: "p", mode: "full", date: "2026-11-14" }],
    });
    const res = await postDeployed(post({ project: "p", mode: "full" }), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).deployed).toHaveLength(1);
    expect(mockMarkDeployed).toHaveBeenCalledWith("tdd", "p", "full");
  });
});
