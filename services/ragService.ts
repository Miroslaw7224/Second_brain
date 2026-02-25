import * as firestoreDb from "../lib/firestore-db.js";
import { generateContent } from "../lib/gemini.js";

// TODO: lepsza ekstrakcja słów kluczowych (obecna heurystyka słabo działa po polsku)
function extractKeywords(message: string): string[] {
  return message.split(" ").filter((w) => w.length > 3);
}

export async function query(
  userId: string,
  params: { message: string; lang?: string }
): Promise<{ text: string; sources: string[] }> {
  const { message, lang = "en" } = params;
  const keywords = extractKeywords(message);
  const relevantChunks = await firestoreDb.getChunksForSearch(userId, keywords, 5);

  const context = relevantChunks
    .map((c) => `[Source: ${c.source_name ?? c.note_title ?? "Note"}]\n${c.content}`)
    .join("\n\n");

  const systemInstruction =
    lang === "pl"
      ? "Jesteś asystentem 'Drugi Mózg' dla freelancerów. Odpowiadaj na pytania użytkownika WYŁĄCZNIE na podstawie dostarczonego kontekstu. Jeśli odpowiedzi nie ma w kontekście, powiedz, że nie wiesz. Zawsze podawaj nazwę dokumentu źródłowego w swojej odpowiedzi. Odpowiadaj w języku polskim."
      : "You are a 'Second Brain' assistant for freelancers. Answer the user's question based ONLY on the provided context. If the answer is not in the context, say you don't know. Always cite the source document name in your answer. Respond in English.";

  const text = await generateContent({
    model: "gemini-3-flash-preview",
    contents: `Context from user documents:\n${context}\n\nUser Question: ${message}`,
    systemInstruction,
  });

  const sources = Array.from(
    new Set(relevantChunks.map((c) => c.source_name ?? c.note_title ?? "Note"))
  );

  return { text, sources };
}
