import { GoogleGenAI } from "@google/genai";
import { DomainError } from "@/lib/errors";
import { inferHttpStatus } from "@/lib/inferHttpStatus";

let client: InstanceType<typeof GoogleGenAI> | null = null;

function getClient(): InstanceType<typeof GoogleGenAI> {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export type GenerateContentParams = {
  model: string;
  contents: string;
  systemInstruction?: string;
};

const MAX_GEMINI_ATTEMPTS = 4;
const GEMINI_OVERLOAD_MESSAGE =
  "Model AI jest chwilowo przeciążony (duże obciążenie po stronie Google). Spróbuj ponownie za chwilę.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryGemini(err: unknown): boolean {
  const s = inferHttpStatus(err);
  if (s === 503 || s === 429 || s === 408) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("unavailable") ||
      msg.includes("high demand") ||
      msg.includes("overloaded") ||
      msg.includes("resource exhausted") ||
      msg.includes("rate limit")
    );
  }
  return false;
}

export async function generateContent(params: GenerateContentParams): Promise<string> {
  const ai = getClient();
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_GEMINI_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: params.model,
        contents: params.contents,
        config: params.systemInstruction
          ? { systemInstruction: params.systemInstruction }
          : undefined,
      });
      return (response.text ?? "").trim();
    } catch (err) {
      lastErr = err;
      if (!shouldRetryGemini(err)) {
        throw err instanceof Error ? err : new Error(String(err));
      }
      if (attempt === MAX_GEMINI_ATTEMPTS - 1) {
        console.error("[gemini] generateContent: retries exhausted", err);
        throw new DomainError(GEMINI_OVERLOAD_MESSAGE, 503);
      }
      const delayMs = Math.min(2000 * 2 ** attempt, 30_000) + Math.floor(Math.random() * 800);
      console.warn(
        `[gemini] generateContent retry ${attempt + 2}/${MAX_GEMINI_ATTEMPTS} in ${delayMs}ms`
      );
      await sleep(delayMs);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
