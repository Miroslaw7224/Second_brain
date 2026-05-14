import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());
const mockChatCreate = vi.hoisted(() => vi.fn());

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: mockCreate,
    },
    chat: {
      completions: {
        create: mockChatCreate,
      },
    },
  })),
}));

describe("generateEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "test-key");
  });

  it("zwraca embedding jako number[]", async () => {
    const fakeEmbedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);
    mockCreate.mockResolvedValue({
      data: [{ embedding: fakeEmbedding }],
    });

    const { generateEmbedding } = await import("@/lib/openai");
    const result = await generateEmbedding("test text");

    expect(mockCreate).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: "test text",
    });
    expect(result).toEqual(fakeEmbedding);
    expect(result).toHaveLength(1536);
  });

  it("rzuca błąd gdy OPENAI_API_KEY nie jest ustawiony", async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const { generateEmbedding } = await import("@/lib/openai");
    await expect(generateEmbedding("test")).rejects.toThrow("OPENAI_API_KEY");
  });
});

describe("generateChatCompletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "test-key");
  });

  it("zwraca treść odpowiedzi jako string", async () => {
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: "Odpowiedź AI" } }],
    });

    const { generateChatCompletion } = await import("@/lib/openai");
    const result = await generateChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Jesteś asystentem." },
        { role: "user", content: "Cześć" },
      ],
    });

    expect(mockChatCreate).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Jesteś asystentem." },
        { role: "user", content: "Cześć" },
      ],
    });
    expect(result).toBe("Odpowiedź AI");
  });
});
