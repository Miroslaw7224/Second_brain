export function isValidEmail(value: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value);
}

export type WaitlistCheckEmailParams =
  | { ok: true; email: string }
  | { ok: false; status: 400; body: { error: string; allowed: false } };

/**
 * Validates `email` query param for GET /api/waitlist/check-email (no Firestore).
 */
export function parseWaitlistCheckEmailParam(emailParam: string | null): WaitlistCheckEmailParams {
  const trimmed = typeof emailParam === "string" ? emailParam.trim() : "";
  if (!trimmed) {
    return {
      ok: false as const,
      status: 400,
      body: { error: "Brak parametru email", allowed: false },
    };
  }
  if (!isValidEmail(trimmed)) {
    return {
      ok: false as const,
      status: 400,
      body: { error: "Nieprawidłowy format adresu e-mail", allowed: false },
    };
  }
  return { ok: true as const, email: trimmed.toLowerCase() };
}
