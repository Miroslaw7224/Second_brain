import * as firestoreDb from "@/lib/firestore-db";
import { generateContent } from "@/lib/gemini";
import * as resourceService from "@/services/resourceService";

const STOP_WORDS_EN = new Set([
  "are",
  "but",
  "for",
  "had",
  "has",
  "her",
  "his",
  "how",
  "its",
  "may",
  "new",
  "now",
  "old",
  "our",
  "out",
  "see",
  "the",
  "was",
  "way",
  "who",
  "all",
  "and",
  "any",
  "can",
  "did",
  "get",
  "has",
  "him",
  "let",
  "put",
  "say",
  "she",
  "too",
  "use",
  "that",
  "with",
  "have",
  "this",
  "will",
  "your",
  "from",
  "they",
  "been",
  "were",
  "what",
  "when",
  "which",
  "their",
  "would",
  "there",
  "could",
  "other",
  "about",
  "into",
  "than",
  "them",
  "these",
  "some",
  "make",
  "like",
  "just",
  "more",
  "also",
  "very",
  "only",
  "after",
  "before",
  "being",
  "both",
  "each",
  "over",
  "such",
  "then",
  "where",
  "while",
  "during",
  "until",
  "again",
  "because",
]);

const STOP_WORDS_PL = new Set([
  "nie",
  "że",
  "to",
  "jest",
  "się",
  "jak",
  "dla",
  "ale",
  "czy",
  "gdy",
  "już",
  "też",
  "tylko",
  "jeszcze",
  "który",
  "która",
  "którzy",
  "których",
  "czym",
  "gdzie",
  "kiedy",
  "więc",
  "albo",
  "jednak",
  "aby",
  "żeby",
  "tak",
  "taki",
  "taka",
  "takie",
  "jakie",
  "była",
  "było",
  "będzie",
  "mają",
  "miał",
  "można",
  "trzeba",
  "powinien",
  "może",
  "być",
  "będą",
  "byli",
  "były",
  "jego",
  "jej",
  "ich",
  "nim",
  "nią",
  "nim",
  "nich",
  "temu",
  "tego",
  "tej",
  "tym",
  "sam",
  "sama",
  "samo",
  "sami",
  "same",
  "także",
  "zawsze",
  "często",
  "nigdy",
  "wtedy",
  "dlaczego",
  "ponieważ",
  "chociaż",
  "mimo",
  "przez",
  "przed",
  "poza",
  "bez",
  "nad",
  "pod",
  "przy",
  "około",
]);

const MIN_TOKEN_LENGTH = 3;

/** Końcówki polskie do odcięcia (od najdłuższych), dla stemmera zapytania (Faza 2a). Bez "ię"/"ią" (dają np. projekcię→projekc). */
const PL_SUFFIXES = ["ami", "ach", "ów", "em", "om", "ie", "ia", "iu", "u", "y"].sort(
  (a, b) => b.length - a.length
);

/**
 * Heurystyczny stemmer PL: odcina typowe końcówki fleksyjne.
 * Używany tylko po stronie zapytania (Faza 2a); dla "projekt"/"projekcie"/"projektu" stem jest podciągiem, więc includes() w chunkach zadziała.
 */
function stemPl(word: string): string {
  if (word.length <= MIN_TOKEN_LENGTH) return word;
  let w = word;
  for (const suf of PL_SUFFIXES) {
    if (suf.length >= w.length) continue;
    if (w.endsWith(suf) && w.length - suf.length >= MIN_TOKEN_LENGTH) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

/**
 * Ekstrakcja słów kluczowych z zapytania użytkownika.
 * Tokenizacja po białych znakach, normalizacja (lowercase, usunięcie interpunkcji z brzegów),
 * próg długości >= 3, odfiltrowanie stop words PL/EN wg parametru lang.
 * Dla lang === "pl" tokeny są stemowane (Faza 2a), żeby "projekt" dopasował "projekcie" w treści chunków.
 */
export function extractKeywords(message: string, lang?: string): string[] {
  const stopWords = lang === "pl" ? STOP_WORDS_PL : STOP_WORDS_EN;
  let tokens = message
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase())
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !stopWords.has(t));
  if (lang === "pl") {
    tokens = tokens.map((t) => stemPl(t));
  }
  return [...new Set(tokens)];
}

export async function query(
  userId: string,
  params: { message: string; lang?: string }
): Promise<{ text: string; sources: string[] }> {
  const { message, lang = "en" } = params;
  const keywords = extractKeywords(message, lang);
  const relevantChunks = await firestoreDb.getChunksForSearch(userId, keywords, 5);
  const matchingResources = await resourceService.searchResources(userId, keywords);

  const chunksContext = relevantChunks
    .map((c) => `[Source: ${c.source_name ?? c.note_title ?? "Note"}]\n${c.content}`)
    .join("\n\n");

  const resourcesContext =
    matchingResources.length > 0
      ? matchingResources
          .map((r) => `Zasób użytkownika: ${r.description} | Tytuł: ${r.title} | URL: ${r.url}`)
          .join("\n")
      : "";

  const context =
    resourcesContext && chunksContext
      ? `${chunksContext}\n\n${resourcesContext}`
      : resourcesContext || chunksContext;

  const resourceInstruction =
    lang === "pl"
      ? " Gdy w kontekście znajdziesz zasób użytkownika (oznaczony jako 'Zasób użytkownika:'), przedstaw go w formie: 1) Link jako markdown [tytuł](url), 2) Opis dodany przez użytkownika, 3) Jedno zdanie wyjaśniające dlaczego ten zasób odpowiada na pytanie."
      : " When the context contains a user resource (marked as 'Zasób użytkownika:'), present it as: 1) Link as markdown [title](url), 2) The description the user added, 3) One sentence explaining why this resource answers the question.";

  const systemInstruction =
    lang === "pl"
      ? `Jesteś asystentem Nexus — osobistego systemu zarządzania wiedzą dla freelancerów i profesjonalistów. Pomagasz użytkownikowi wydobywać wartość z jego własnych notatek, dokumentów i zasobów.

Zasady:
- Odpowiadaj wyłącznie na podstawie dostarczonego kontekstu — nie dodawaj informacji spoza dokumentów użytkownika
- Bądź konkretny i zwięzły: skupiaj się na faktach z dokumentów, nie na ogólnikach
- Zawsze wskaż źródło: podaj nazwę dokumentu lub notatki, z której pochodzi informacja
- Jeśli kontekst nie zawiera odpowiedzi, nie mów tylko "nie wiem" — powiedz co jest dostępne i zaproponuj co użytkownik może zrobić, np. "Nie znalazłem tej informacji w Twoich notatkach. Czy chcesz ją dodać?"
- Odpowiadaj po polsku` + resourceInstruction
      : `You are a Nexus assistant — a personal knowledge management system for freelancers and professionals. You help users extract value from their own notes, documents, and resources.

Rules:
- Answer exclusively based on the provided context — do not add information outside the user's documents
- Be specific and concise: focus on facts from the documents, not generalities
- Always cite the source: name the document or note the information comes from
- If the context doesn't contain an answer, don't just say "I don't know" — state what is available and suggest next steps, e.g. "I couldn't find this in your notes. Would you like to add it?"
- Respond in English` + resourceInstruction;

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
