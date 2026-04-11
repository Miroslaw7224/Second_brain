import { describe, it, expect } from "vitest";
import { parseChatPostBody } from "../../../lib/chatRequestBody.js";

describe("lib/chatRequestBody", () => {
  it("requires non-empty string message", () => {
    expect(parseChatPostBody(null).ok).toBe(false);
    expect(parseChatPostBody({}).ok).toBe(false);
    expect(parseChatPostBody({ message: "" }).ok).toBe(false);
    expect(parseChatPostBody({ message: "   " }).ok).toBe(false);
    expect(parseChatPostBody({ message: 1 } as unknown).ok).toBe(false);
  });

  it("defaults lang to en", () => {
    expect(parseChatPostBody({ message: "hi" })).toEqual({
      ok: true,
      message: "hi",
      lang: "en",
    });
  });

  it("uses provided lang when non-empty", () => {
    expect(parseChatPostBody({ message: "x", lang: "pl" })).toEqual({
      ok: true,
      message: "x",
      lang: "pl",
    });
  });

  it("trims message and lang", () => {
    expect(parseChatPostBody({ message: "  a  ", lang: "  pl  " })).toEqual({
      ok: true,
      message: "a",
      lang: "pl",
    });
  });
});
