export type ChatHistoryEntry = { role: "user" | "assistant"; content: string };

export type ChatPostBodyResult =
  | { ok: true; message: string; lang: string; history: ChatHistoryEntry[] }
  | { ok: false; error: string };

/**
 * Validates JSON body for POST /api/chat (no auth).
 */
export function parseChatPostBody(body: unknown): ChatPostBodyResult {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "Message is required" };
  }
  const o = body as { message?: unknown; lang?: unknown; history?: unknown };
  const message = typeof o.message === "string" ? o.message.trim() : "";
  if (!message) {
    return { ok: false, error: "Message is required" };
  }
  const lang = typeof o.lang === "string" && o.lang.trim() ? o.lang.trim() : "en";
  const history: ChatHistoryEntry[] = Array.isArray(o.history)
    ? (o.history as unknown[])
        .filter(
          (e): e is ChatHistoryEntry =>
            typeof e === "object" &&
            e !== null &&
            ((e as ChatHistoryEntry).role === "user" ||
              (e as ChatHistoryEntry).role === "assistant") &&
            typeof (e as ChatHistoryEntry).content === "string"
        )
        .map((e) => ({
          role: (e as ChatHistoryEntry).role,
          content: (e as ChatHistoryEntry).content,
        }))
    : [];
  return { ok: true, message, lang, history };
}
