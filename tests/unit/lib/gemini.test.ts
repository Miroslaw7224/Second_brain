import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("gemini — generateContent", () => {
  let generateContent: (p: {
    model: string;
    contents: string;
    systemInstruction?: string;
  }) => Promise<string>;
  let mockGenerateContentFn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();

    mockGenerateContentFn = vi.fn();
    vi.stubEnv("GEMINI_API_KEY", "test-key");

    vi.doMock("@google/genai", () => ({
      GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: { generateContent: mockGenerateContentFn },
      })),
    }));

    ({ generateContent } = await import("@/lib/gemini"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.doUnmock("@google/genai");
  });

  it("returns trimmed text on first success", async () => {
    mockGenerateContentFn.mockResolvedValue({ text: "  hello  " });
    const result = await generateContent({ model: "gemini-pro", contents: "test" });
    expect(result).toBe("hello");
    expect(mockGenerateContentFn).toHaveBeenCalledTimes(1);
  });

  it("retries on 503 and returns when next attempt succeeds", async () => {
    const err503 = Object.assign(new Error("overloaded"), { status: 503 });
    mockGenerateContentFn
      .mockRejectedValueOnce(err503)
      .mockResolvedValue({ text: "success after retry" });

    const promise = generateContent({ model: "gemini-pro", contents: "test" });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success after retry");
    expect(mockGenerateContentFn).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 rate limit error", async () => {
    const err429 = Object.assign(new Error("rate limit exceeded"), { status: 429 });
    mockGenerateContentFn
      .mockRejectedValueOnce(err429)
      .mockRejectedValueOnce(err429)
      .mockResolvedValue({ text: "ok" });

    const promise = generateContent({ model: "gemini-pro", contents: "test" });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("ok");
    expect(mockGenerateContentFn).toHaveBeenCalledTimes(3);
  });

  it("throws DomainError with status 503 after 4 failed retries", async () => {
    const { DomainError } = await import("@/lib/errors");
    const err503 = Object.assign(new Error("overloaded"), { status: 503 });
    mockGenerateContentFn.mockRejectedValue(err503);

    const promise = generateContent({ model: "gemini-pro", contents: "test" });
    // Run all timers and wait for the promise to settle concurrently
    const [result] = await Promise.allSettled([promise, vi.runAllTimersAsync()]);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBeInstanceOf(DomainError);
    }
    expect(mockGenerateContentFn).toHaveBeenCalledTimes(4); // MAX_GEMINI_ATTEMPTS
  });

  it("does NOT retry on non-retryable errors (e.g. 400 bad request)", async () => {
    const err400 = Object.assign(new Error("invalid model"), { status: 400 });
    mockGenerateContentFn.mockRejectedValue(err400);

    await expect(generateContent({ model: "bad-model", contents: "test" })).rejects.toThrow(
      "invalid model"
    );
    expect(mockGenerateContentFn).toHaveBeenCalledTimes(1);
  });

  it("retries when error message contains 'overloaded'", async () => {
    const errMsg = new Error("The model is currently overloaded. Please try again.");
    mockGenerateContentFn.mockRejectedValueOnce(errMsg).mockResolvedValue({ text: "done" });

    const promise = generateContent({ model: "gemini-pro", contents: "test" });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("done");
    expect(mockGenerateContentFn).toHaveBeenCalledTimes(2);
  });
});
