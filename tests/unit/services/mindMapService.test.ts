import { describe, it, expect, beforeEach, vi } from "vitest";
import { DomainError } from "../../../lib/errors.js";

const mockMindMapsCol = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/firestore-db.js", () => ({
  mindMapsCol: (...args: unknown[]) => mockMindMapsCol(...args),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => ({ __sv: "ts" }),
  },
}));

import {
  createMindMap,
  getMindMaps,
  getMindMap,
  saveMindMap,
  deleteMindMap,
} from "../../../services/mindMapService.js";

type MapRow = Record<string, unknown>;

function setupCol(userId = "u1") {
  const rows = new Map<string, MapRow>();
  let auto = 0;

  const col = {
    doc(mapId?: string) {
      const id = mapId ?? `m${++auto}`;
      const key = `${userId}:${id}`;
      return {
        id,
        async set(data: MapRow) {
          rows.set(key, { ...data });
        },
        async get() {
          const data = rows.get(key);
          if (!data) return { exists: false, id, data: () => undefined };
          return { exists: true, id, data: () => data };
        },
        async update(patch: MapRow) {
          const cur = rows.get(key);
          if (!cur) throw new Error("missing doc");
          rows.set(key, { ...cur, ...patch });
        },
        async delete() {
          rows.delete(key);
        },
      };
    },
    async get() {
      const docs = [...rows.entries()]
        .filter(([k]) => k.startsWith(`${userId}:`))
        .map(([k, data]) => {
          const id = k.slice(userId.length + 1);
          return { id, data: () => data };
        });
      return { docs };
    },
  };

  mockMindMapsCol.mockReturnValue(col);
  return { rows, col };
}

describe("mindMapService", () => {
  beforeEach(() => {
    mockMindMapsCol.mockReset();
  });

  describe("createMindMap", () => {
    it("creates map with trimmed title and default when empty", async () => {
      setupCol();
      const a = await createMindMap("u1", "  My map  ");
      expect(a.title).toBe("My map");
      expect(a.userId).toBe("u1");
      expect(a.rootNode.label).toBe("My map");
      expect(a.id).toMatch(/^m/);
    });

    it("uses default title when whitespace only", async () => {
      setupCol();
      const a = await createMindMap("u1", "   ");
      expect(a.title).toBe("Nowa mapa");
      expect(a.rootNode.label).toBe("Nowa mapa");
    });
  });

  describe("getMindMaps", () => {
    it("returns sorted maps by updatedAt descending", async () => {
      const { rows } = setupCol();
      rows.set("u1:a", {
        userId: "u1",
        title: "Old",
        rootNode: { id: "root", label: "Old", note: "", collapsed: false, children: [] },
        colWidths: {},
        updatedAt: { toMillis: () => 10 },
      });
      rows.set("u1:b", {
        userId: "u1",
        title: "New",
        rootNode: { id: "root", label: "New", note: "", collapsed: false, children: [] },
        colWidths: {},
        updatedAt: { toMillis: () => 99 },
      });

      const list = await getMindMaps("u1");
      expect(list.map((m) => m.title)).toEqual(["New", "Old"]);
    });
  });

  describe("getMindMap", () => {
    it("throws 404 when missing", async () => {
      setupCol();
      await expect(getMindMap("u1", "missing")).rejects.toThrow(DomainError);
      await expect(getMindMap("u1", "missing")).rejects.toMatchObject({
        message: "Mind map not found",
        statusCode: 404,
      });
    });

    it("throws 404 when document userId mismatches", async () => {
      const { rows } = setupCol();
      rows.set("u1:x", {
        userId: "other",
        title: "Hijack",
        rootNode: { id: "root", label: "H", note: "", collapsed: false, children: [] },
        colWidths: {},
      });
      await expect(getMindMap("u1", "x")).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns map when owned", async () => {
      const { rows } = setupCol();
      rows.set("u1:x", {
        userId: "u1",
        title: "OK",
        rootNode: { id: "root", label: "OK", note: "", collapsed: false, children: [] },
        colWidths: { 0: 120 },
      });
      const m = await getMindMap("u1", "x");
      expect(m.title).toBe("OK");
      expect(m.colWidths).toEqual({ 0: 120 });
    });
  });

  describe("saveMindMap / deleteMindMap", () => {
    it("updates title and rootNode", async () => {
      const { rows } = setupCol();
      rows.set("u1:x", {
        userId: "u1",
        title: "T",
        rootNode: { id: "root", label: "T", note: "", collapsed: false, children: [] },
        colWidths: {},
      });
      const newRoot = {
        id: "root",
        label: "T2",
        note: "n",
        collapsed: true,
        children: [],
      };
      await saveMindMap("u1", "x", { title: " T2 ", rootNode: newRoot });
      const data = rows.get("u1:x")!;
      expect(data.title).toBe("T2");
      expect(data.rootNode).toEqual(newRoot);
    });

    it("deleteMindMap removes document", async () => {
      const { rows } = setupCol();
      rows.set("u1:x", {
        userId: "u1",
        title: "T",
        rootNode: { id: "root", label: "T", note: "", collapsed: false, children: [] },
        colWidths: {},
      });
      await deleteMindMap("u1", "x");
      expect(rows.has("u1:x")).toBe(false);
    });
  });
});
