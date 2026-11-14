// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";

const mockGetCodex = vi.hoisted(() => vi.fn());
const mockGetChecklistState = vi.hoisted(() => vi.fn());
const mockRecordEvent = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/bc_codex/services", () => ({
  getCodex: mockGetCodex,
  getChecklistState: mockGetChecklistState,
  recordEvent: mockRecordEvent,
}));

import { GET as codexGET } from "@/app/api/nexus/codex/route";
import { GET as checklistsGET, POST as checklistsPOST } from "@/app/api/nexus/checklists/route";

beforeEach(() => {
  mockGetCodex.mockReset();
  mockGetChecklistState.mockReset();
  mockRecordEvent.mockReset();
});

const post = (body: unknown) =>
  new NextRequest("http://localhost/api/nexus/checklists", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("GET /api/nexus/codex", () => {
  it("status ok: DTO z sekcjami, regułami, checklistami i ostrzeżeniami", async () => {
    mockGetCodex.mockReturnValue({
      status: "ok",
      path: "Knowledge/kodeks.md",
      mtimeMs: 1000,
      parsed: {
        title: "Kodeks",
        sections: [
          {
            id: "sec-tdd",
            title: "1. TDD",
            blocks: [
              { kind: "rule", ruleId: "TDD-1" },
              { kind: "text", text: "uwaga" },
              { kind: "rule", ruleId: "TDD-2" },
            ],
          },
        ],
        rules: [
          { id: "TDD-1", level: "MUST", text: "a", line: 6 },
          { id: "TDD-2", level: "SHOULD", text: "b", line: 7 },
        ],
        checklists: [],
        warnings: [{ kind: "duplicate-id", message: "dubel", line: 9 }],
        wikilinks: ["ai-coding-guardrails"],
      },
    });
    const res = await codexGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.counts).toBeUndefined();
    expect(body.rules).toHaveLength(2);
    expect(body.sections[0].blocks[1]).toEqual({ kind: "text", text: "uwaga" });
    expect(body.warnings).toEqual([{ kind: "duplicate-id", message: "dubel", line: 9 }]);
    expect(body.wikilinks).toEqual(["ai-coding-guardrails"]);
  });

  it("status missing i config-error to 200 z polem status", async () => {
    mockGetCodex.mockReturnValueOnce({ status: "missing", path: "Knowledge/kodeks.md" });
    const missing = await codexGET();
    expect(missing.status).toBe(200);
    expect(await missing.json()).toEqual({ status: "missing", path: "Knowledge/kodeks.md" });

    mockGetCodex.mockReturnValueOnce({ status: "config-error", message: "Brak vaulta" });
    const broken = await codexGET();
    expect(broken.status).toBe(200);
    expect(await broken.json()).toEqual({ status: "config-error", message: "Brak vaulta" });
  });

  it("błąd domenowy mapuje na jego kod HTTP", async () => {
    mockGetCodex.mockImplementation(() => {
      throw new DomainError("zepsute", 503);
    });
    const res = await codexGET();
    expect(res.status).toBe(503);
  });
});

describe("GET /api/nexus/checklists", () => {
  it("przekazuje ?month= do usługi i zwraca stan", async () => {
    const journal = { runs: [], eventCount: 0, skippedLines: 0, unterminatedTail: false };
    mockGetChecklistState.mockReturnValue({
      month: "2026-11",
      personal: journal,
      work: { blocked: "Dane etatu (Work/) zablokowane" },
    });
    const res = await checklistsGET(
      new NextRequest("http://localhost/api/nexus/checklists?month=2026-11")
    );
    expect(mockGetChecklistState).toHaveBeenCalledWith("2026-11");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.month).toBe("2026-11");
    expect(body.work).toEqual({ blocked: "Dane etatu (Work/) zablokowane" });
    expect(body.personal).toEqual(journal);
  });

  it("bez ?month= wywołuje usługę bez argumentu", async () => {
    mockGetChecklistState.mockReturnValue({
      month: "2026-11",
      personal: { runs: [], eventCount: 0, skippedLines: 0, unterminatedTail: false },
      work: { runs: [], eventCount: 0, skippedLines: 0, unterminatedTail: false },
    });
    await checklistsGET(new NextRequest("http://localhost/api/nexus/checklists"));
    expect(mockGetChecklistState).toHaveBeenCalledWith(undefined);
  });
});

describe("POST /api/nexus/checklists", () => {
  it("zdarzenie bez owner: 400 i brak wywołania usługi", async () => {
    const res = await checklistsPOST(post({ type: "start", checklist: "x", task: "" }));
    expect(res.status).toBe(400);
    expect(mockRecordEvent).not.toHaveBeenCalled();
  });

  it("start: 201 ze zdarzeniem (run nadany przez usługę)", async () => {
    const input = { type: "start", owner: "personal", checklist: "dod", task: "Z" };
    mockRecordEvent.mockResolvedValue({ ...input, run: "r-1", ts: "2026-11-14T10:00:00.000Z" });
    const res = await checklistsPOST(post(input));
    expect(res.status).toBe(201);
    expect(mockRecordEvent).toHaveBeenCalledWith(input);
    expect(await res.json()).toMatchObject({ run: "r-1", type: "start" });
  });

  it("zablokowane work: kod 403 z komunikatem usługi", async () => {
    mockRecordEvent.mockRejectedValue(new DomainError("Dane etatu (Work/) zablokowane", 403));
    const res = await checklistsPOST(
      post({ type: "start", owner: "work", checklist: "dod", task: "" })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Dane etatu (Work/) zablokowane" });
  });
});
