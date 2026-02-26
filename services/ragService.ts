import * as firestoreDb from "../lib/firestore-db.js";
import { generateContent } from "../lib/gemini.js";
import * as resourceService from "./resourceService.js";

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
  const matchingResources = await resourceService.searchResources(userId, keywords);

  const chunksContext = relevantChunks
    .map((c) => `[Source: ${c.source_name ?? c.note_title ?? "Note"}]\n${c.content}`)
    .join("\n\n");

  const resourcesContext =
    matchingResources.length > 0
      ? matchingResources
          .map(
            (r) =>
              `Zasób użytkownika: ${r.description} | Tytuł: ${r.title} | URL: ${r.url}`
          )
          .join("\n")
      : "";

  const context =
    resourcesContext && chunksContext
      ? `${chunksContext}\n\n${resourcesContext}`
      : resourcesContext || chunksContext;

  const resourceInstruction =
    lang === "pl"
      ? " Gdy w kontekście znajdziesz zasób użytkownika (oznaczony jako 'Zasób użytkownika:'), odpowiedz podając: 1) Link jako markdown [tytuł](url), 2) Opis który użytkownik dodał, 3) Jedno zdanie dlaczego ten zasób pasuje do pytania."
      : " When the context contains a user resource (marked as 'Zasób użytkownika:'), respond with: 1) Link as markdown [title](url), 2) The description the user added, 3) One sentence on why this resource fits the question.";

  const systemInstruction =
    lang === "pl"
      ? "Jesteś asystentem 'Drugi Mózg' dla freelancerów. Odpowiadaj na pytania użytkownika WYŁĄCZNIE na podstawie dostarczonego kontekstu. Jeśli odpowiedzi nie ma w kontekście, powiedz, że nie wiesz. Zawsze podawaj nazwę dokumentu źródłowego w swojej odpowiedzi. Odpowiadaj w języku polskim." +
        resourceInstruction
      : "You are a 'Second Brain' assistant for freelancers. Answer the user's question based ONLY on the provided context. If the answer is not in the context, say you don't know. Always cite the source document name in your answer. Respond in English." +
        resourceInstruction;

  const text = await generateContent({
    model: "gemini-3-flash-preview",
    contents: `Context from user documents:\n${context}\n\nUser Question: ${message}`,
    systemInstruction,
  });

  const sources = Array.from(
    new Set([
      ...relevantChunks.map((c) => c.source_name ?? c.note_title ?? "Note"),
      ...matchingResources.map((r) => r.title || r.description),
    ])
  );

  return { text, sources };
}
