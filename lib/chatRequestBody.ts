export type ChatPostBodyResult =
  | { ok: true; message: string; lang: string }
  | { ok: false; error: string };

/**
 * Validates JSON body for POST /api/chat (no auth).
 */
export function parseChatPostBody(body: unknown): ChatPostBodyResult {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "Message is required" };
  }
  const o = body as { message?: unknown; lang?: unknown };
  const message = typeof o.message === "string" ? o.message.trim() : "";
  if (!message) {
    return { ok: false, error: "Message is required" };
  }
  const lang = typeof o.lang === "string" && o.lang.trim() ? o.lang.trim() : "en";
  return { ok: true, message, lang };
}
