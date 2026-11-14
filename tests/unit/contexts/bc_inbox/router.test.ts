// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, DomainError, NotFoundError } from "@/lib/errors";

const mockList = vi.hoisted(() => vi.fn());
const mockAdd = vi.hoisted(() => vi.fn());
const mockResolve = vi.hoisted(() => vi.fn());
const mockRemove = vi.hoisted(() => vi.fn());
const mockCountClosed = vi.hoisted(() => vi.fn());
const mockClearClosed = vi.hoisted(() => vi.fn());
const mockMove = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/bc_inbox/services", () => ({
  listItems: mockList,
  addItem: mockAdd,
  resolve: mockResolve,
  remove: mockRemove,
  countClosed: mockCountClosed,
  clearClosed: mockClearClosed,
  moveItem: mockMove,
}));

import {
  clearClosedItems,
  createItem,
  deleteItem,
  listInbox,
  moveItem,
  resolveItem,
} from "@/contexts/bc_inbox/router";

const post = (body: unknown) =>
  new NextRequest("http://localhost/api/inbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const item = { id: "1", text: "a", type: "myśl", at: "2026-11-13T09:00" };

beforeEach(() => vi.resetAllMocks());

describe("GET /api/inbox", () => {
  it("200 z listą i licznikami (otwarte, zamknięte)", async () => {
    mockList.mockReturnValue([item]);
    mockCountClosed.mockReturnValue(4);
    const res = await listInbox();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [item], open: 1, closed: 4 });
  });

  it("wyjątek to 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockList.mockImplementation(() => {
      throw new Error("boom");
    });
    expect((await listInbox()).status).toBe(500);
  });
});

describe("POST /api/inbox", () => {
  it("201 i zwraca wpis, tekst przycięty", async () => {
    mockAdd.mockResolvedValue(item);
    const res = await createItem(post({ text: "  a " }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(item);
    expect(mockAdd).toHaveBeenCalledWith("a");
  });

  it.each([
    ["pusty tekst", { text: " " }],
    ["brak tekstu", {}],
    ["zły JSON", "{x"],
  ])("400 dla: %s", async (_n, body) => {
    expect((await createItem(post(body))).status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("DomainError z serwisu to 400", async () => {
    mockAdd.mockRejectedValue(new DomainError("Maksymalnie 500 znaków"));
    expect((await createItem(post({ text: "x" }))).status).toBe(400);
  });
});

describe("PATCH /api/inbox/[id]", () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const patch = () => new NextRequest("http://localhost/api/inbox/1", { method: "PATCH" });

  it("200 po oznaczeniu jako posegregowane", async () => {
    mockResolve.mockResolvedValue(undefined);
    const res = await resolveItem(patch(), ctx("1"));
    expect(res.status).toBe(200);
    expect(mockResolve).toHaveBeenCalledWith("1");
  });

  it("404 dla nieznanego id", async () => {
    mockResolve.mockRejectedValue(new NotFoundError("Nie ma wpisu"));
    expect((await resolveItem(patch(), ctx("x"))).status).toBe(404);
  });
});

describe("DELETE /api/inbox/[id]", () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const del = () => new NextRequest("http://localhost/api/inbox/1", { method: "DELETE" });

  it("200 po usunięciu wpisu", async () => {
    mockRemove.mockResolvedValue(undefined);
    const res = await deleteItem(del(), ctx("1"));
    expect(res.status).toBe(200);
    expect(mockRemove).toHaveBeenCalledWith("1");
  });

  it("404 dla nieznanego id", async () => {
    mockRemove.mockRejectedValue(new NotFoundError("Nie ma wpisu"));
    expect((await deleteItem(del(), ctx("x"))).status).toBe(404);
  });
});

describe("DELETE /api/inbox (wyczyść zamknięte)", () => {
  it("200 z liczbą usuniętych", async () => {
    mockClearClosed.mockResolvedValue(3);
    const res = await clearClosedItems();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ removed: 3 });
  });

  it("wyjątek to 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockClearClosed.mockRejectedValue(new Error("boom"));
    expect((await clearClosedItems()).status).toBe(500);
  });
});

describe("POST /api/inbox/[id]/move", () => {
  const move = (body: unknown, id = "e1") =>
    moveItem(
      new NextRequest(`http://localhost/api/inbox/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) }
    );
  const project = { target: "project", projectId: "nexus", column: "next", text: "Zrób X" };

  it("200: przekazuje id i znormalizowane wejście do serwisu, zwraca ok + ref", async () => {
    mockMove.mockResolvedValue({ target: "project", ref: "nexus" });
    const res = await move({ ...project, text: "  Zrób\nX " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, target: "project", ref: "nexus" });
    expect(mockMove).toHaveBeenCalledWith("e1", { ...project, text: "Zrób X" });
  });

  it("200: trzy cele; warning trafia do odpowiedzi", async () => {
    mockMove.mockResolvedValueOnce({ target: "task", ref: "t1" });
    expect((await move({ target: "task", text: "a" })).status).toBe(200);
    mockMove.mockResolvedValueOnce({ target: "note", ref: "n1", warning: "w" });
    const res = await move({ target: "note", title: "T", text: "a" });
    expect(await res.json()).toEqual({ ok: true, target: "note", ref: "n1", warning: "w" });
  });

  it("400: zły kształt, kolumna now, zły JSON; serwis nie jest wołany", async () => {
    expect((await move({ ...project, column: "now" })).status).toBe(400);
    expect((await move({ target: "task", text: "" })).status).toBe(400);
    expect((await move("{")).status).toBe(400);
    expect(mockMove).not.toHaveBeenCalled();
  });

  it("404 (wpis albo projekt), 409 (konflikt tasks.md), 422 (limit)", async () => {
    mockMove.mockRejectedValueOnce(new NotFoundError("Nie ma otwartego wpisu e1"));
    expect((await move(project)).status).toBe(404);
    mockMove.mockRejectedValueOnce(new ConflictError("Plik zadań zmienił się w międzyczasie"));
    expect((await move(project)).status).toBe(409);
    mockMove.mockRejectedValueOnce(new DomainError("Limit", 422));
    expect((await move(project)).status).toBe(422);
  });
});
