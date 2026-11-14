import { describe, expect, it } from "vitest";
import {
  countResourceTags,
  filterResourcesBySearch,
} from "@/src/features/resources/resourceFilters";
import type { NoteResource } from "@/src/features/resources/resourceTypes";

function res(overrides: Partial<NoteResource>): NoteResource {
  return {
    id: "r",
    description: "",
    url: "https://example.com",
    title: "Title",
    tags: [],
    ...overrides,
  };
}

describe("filterResourcesBySearch", () => {
  const list = [
    res({ id: "1", title: "Docs", tags: ["VectorDB"] }),
    res({ id: "2", title: "Other", tags: ["Chat"] }),
  ];

  it("dopasowuje po tagu, bez wielkości liter", () => {
    expect(filterResourcesBySearch(list, "vectordb").map((r) => r.id)).toEqual(["1"]);
  });

  it("nadal dopasowuje po tytule i pustym zapytaniu zwraca wszystko", () => {
    expect(filterResourcesBySearch(list, "other").map((r) => r.id)).toEqual(["2"]);
    expect(filterResourcesBySearch(list, "  ")).toHaveLength(2);
  });
});

describe("countResourceTags", () => {
  it("liczy wystąpienia i sortuje po częstości, remis alfabetycznie", () => {
    const list = [
      res({ id: "1", tags: ["b", "a"] }),
      res({ id: "2", tags: ["b"] }),
      res({ id: "3", tags: ["c", "b"] }),
      res({ id: "4", tags: [] }),
    ];
    expect(countResourceTags(list)).toEqual([
      { tag: "b", count: 3 },
      { tag: "a", count: 1 },
      { tag: "c", count: 1 },
    ]);
  });
});
