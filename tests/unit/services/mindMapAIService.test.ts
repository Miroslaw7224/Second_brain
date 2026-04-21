import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function GoogleGenAIMock() {
    return { models: { generateContent: mockGenerateContent } };
  }),
}));

describe("mindMapAIService", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("generateNodeFromWeb throws on empty query", async () => {
    const { generateNodeFromWeb } = await import("../../../services/mindMapAIService.js");
    await expect(generateNodeFromWeb("  ")).rejects.toThrow(/required/i);
  });

  it("generateNodeFromWeb parses JSON from model text and normalizes label", async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Here is JSON: {"label":"One Two Three Four Five","description":"Opis testowy."}',
    });
    const { generateNodeFromWeb } = await import("../../../services/mindMapAIService.js");
    const out = await generateNodeFromWeb("tool");
    expect(out.label).toBe("One Two Three Four");
    expect(out.description).toBe("Opis testowy.");
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("importMindMap throws when neither text nor image", async () => {
    const { importMindMap } = await import("../../../services/mindMapAIService.js");
    await expect(importMindMap({ structureText: "  " })).rejects.toThrow(/required/i);
  });

  it("importMindMap returns normalized tree from JSON", async () => {
    const jsonTree = {
      id: "root",
      label: "Root",
      note: "",
      collapsed: false,
      children: [{ id: "n1", label: "Child", note: "x", collapsed: false, children: [] }],
    };
    mockGenerateContent.mockResolvedValue({
      text: `OK ${JSON.stringify(jsonTree)}`,
    });
    const { importMindMap } = await import("../../../services/mindMapAIService.js");
    const root = await importMindMap({ structureText: "A -> B" });
    expect(root.id).toBe("root");
    expect(root.label).toBe("Root");
    expect(root.children).toHaveLength(1);
    expect(root.children[0].label).toBe("Child");
    expect(root.children[0].id).not.toBe("n1");
  });
});
