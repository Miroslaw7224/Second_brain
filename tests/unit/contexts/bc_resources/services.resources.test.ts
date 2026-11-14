import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Resource } from "@/contexts/bc_resources/models";

const mockAdd = vi.hoisted(() => vi.fn());
const mockGetAll = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/bc_resources/repositories", () => ({
  addResource: (...a: unknown[]) => mockAdd(...a),
  getResources: (...a: unknown[]) => mockGetAll(...a),
  deleteResource: (...a: unknown[]) => mockDelete(...a),
  updateResource: (...a: unknown[]) => mockUpdate(...a),
}));

import {
  addResource,
  getResources,
  deleteResource,
  updateResource,
  searchResources,
  decodeHtmlEntities,
  hostTitle,
  isBlockedTitle,
  normalizeTags,
} from "@/contexts/bc_resources/services";

describe("bc_resources services (resources)", () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockGetAll.mockReset();
    mockDelete.mockReset();
    mockUpdate.mockReset();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            `<html><head><title>Page Title</title><meta property="og:image" content="https://x/img.png" /></head></html>`,
            { status: 200, headers: { "Content-Type": "text/html" } }
          )
        )
    );
  });

  describe("addResource", () => {
    it("fetches metadata and delegates to Firestore", async () => {
      const saved = {
        id: "r1",
        description: "d",
        url: "https://example.com",
        title: "Page Title",
        thumbnailUrl: "https://x/img.png",
        tags: ["a"],
      } as Resource;
      mockAdd.mockResolvedValue(saved);

      const result = await addResource({
        description: "d",
        url: "https://example.com",
        tags: ["a"],
      });

      expect(result).toEqual(saved);
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "d",
          url: "https://example.com",
          title: "Page Title",
          thumbnailUrl: "https://x/img.png",
          tags: ["a"],
        })
      );
      expect(fetch).toHaveBeenCalledWith("https://example.com", expect.any(Object));
    });

    it("uses URL as title when fetch fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
      mockAdd.mockImplementation(async (payload: Record<string, unknown>) => ({
        id: "r2",
        ...payload,
      }));

      await addResource({ description: "x", url: "https://z.org" });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "https://z.org",
        })
      );
    });

    it("zastępuje tytuł Cloudflare nazwą domeny", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("<html><head><title>Just a moment...</title></head></html>", {
            status: 200,
          })
        )
      );
      mockAdd.mockImplementation(async (payload: Record<string, unknown>) => ({
        id: "r3",
        ...payload,
      }));

      await addResource({ description: "x", url: "https://www.example.com/page" });

      expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ title: "example.com" }));
    });

    it("dekoduje encje HTML w tytule", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("<html><head><title>Q&amp;A &#8211; Docs</title></head></html>", {
            status: 200,
          })
        )
      );
      mockAdd.mockImplementation(async (payload: Record<string, unknown>) => ({
        id: "r4",
        ...payload,
      }));

      await addResource({ description: "x", url: "https://qa.example" });

      expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ title: "Q&A \u2013 Docs" }));
    });
  });

  describe("getResources / deleteResource / updateResource", () => {
    it("delegates to Firestore helpers", async () => {
      mockGetAll.mockResolvedValue([]);
      mockDelete.mockResolvedValue(undefined);
      mockUpdate.mockResolvedValue(undefined);

      await expect(getResources()).resolves.toEqual([]);
      await deleteResource("r1");
      await updateResource("r1", { isFavorite: true });

      expect(mockGetAll).toHaveBeenCalledWith();
      expect(mockDelete).toHaveBeenCalledWith("r1");
      expect(mockUpdate).toHaveBeenCalledWith("r1", { isFavorite: true });
    });
  });

  describe("searchResources", () => {
    const samples = [
      {
        id: "1",
        description: "React hooks",
        url: "https://a",
        title: "Docs",
        tags: ["lib"],
      },
      {
        id: "2",
        description: "Other",
        url: "https://b",
        title: "Vue guide",
        tags: ["framework"],
      },
    ] as Resource[];

    it("returns all when keywords empty", async () => {
      mockGetAll.mockResolvedValue(samples);
      const r = await searchResources([]);
      expect(r).toHaveLength(2);
    });

    it("filters by keyword in description, title, or tags", async () => {
      mockGetAll.mockResolvedValue(samples);
      expect((await searchResources(["react"])).map((x) => x.id)).toEqual(["1"]);
      expect((await searchResources(["vue"])).map((x) => x.id)).toEqual(["2"]);
      expect((await searchResources(["framework"])).map((x) => x.id)).toEqual(["2"]);
    });

    it("is case-insensitive", async () => {
      mockGetAll.mockResolvedValue(samples);
      const r = await searchResources(["REACT"]);
      expect(r).toHaveLength(1);
    });
  });

  describe("tagi w addResource/updateResource", () => {
    it("addResource zapisuje znormalizowane tagi", async () => {
      mockAdd.mockImplementation(async (p: Record<string, unknown>) => ({ id: "r5", ...p }));
      await addResource({ description: "d", url: "https://example.com", tags: ["kurs", "nauka"] });
      expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ tags: ["Learning"] }));
    });
    it("updateResource normalizuje tagi, a bez tagów ich nie dotyka", async () => {
      mockUpdate.mockResolvedValue(undefined);
      await updateResource("r1", { tags: ["Kursy", "kurs"] });
      expect(mockUpdate).toHaveBeenCalledWith("r1", { tags: ["Learning"] });
      await updateResource("r1", { isFavorite: true });
      expect(mockUpdate).toHaveBeenLastCalledWith("r1", { isFavorite: true });
    });
  });
});

describe("pomocnicze tytułu", () => {
  it("isBlockedTitle rozpoznaje strony Cloudflare", () => {
    expect(isBlockedTitle("Just a moment...")).toBe(true);
    expect(isBlockedTitle("Just a moment\u2026")).toBe(true);
    expect(isBlockedTitle("  attention required! | Cloudflare")).toBe(true);
    expect(isBlockedTitle("Moment of truth")).toBe(false);
  });
  it("hostTitle zwraca host bez www i URL przy błędnym adresie", () => {
    expect(hostTitle("https://www.example.com/a?b=1")).toBe("example.com");
    expect(hostTitle("nie-url")).toBe("nie-url");
  });
  it("decodeHtmlEntities", () => {
    expect(decodeHtmlEntities("A &lt;b&gt; &quot;c&quot; &#39;d&#39; &#x27;e&#x27; &nbsp;f")).toBe(
      "A <b> \"c\" 'd' 'e'  f"
    );
  });
});

describe("normalizeTags", () => {
  it("scala warianty wg mapy bez względu na wielkość liter", () => {
    expect(normalizeTags(["kurs", "Nauka", "Learning", "Moje projekty"])).toEqual([
      "Learning",
      "Projekty",
    ]);
  });
  it("trimuje, usuwa puste i duplikaty bez względu na wielkość liter, zachowuje kolejność", () => {
    expect(normalizeTags([" AI ", "", "ai", "Chat", "API", "api"])).toEqual(["AI", "Chat", "API"]);
  });
  it("zwraca pustą tablicę dla pustego wejścia", () => {
    expect(normalizeTags([])).toEqual([]);
  });
});
