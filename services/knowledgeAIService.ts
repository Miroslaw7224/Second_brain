import * as firestoreKnowledge from "@/lib/firestore-knowledge";
import { generateChatCompletion } from "@/lib/openai";
import * as knowledgeSearchService from "@/services/knowledgeSearchService";
import { KnowledgeNode, KnowledgeNodeType } from "@/types/knowledge";

const SYSTEM_PROMPT = `Jesteś asystentem osobistej bazy wiedzy. Prowadzisz konwersację — masz dostęp do historii rozmowy i MUSISZ z niej korzystać.

Odpowiadanie na pytania:
- Korzystaj z dostarczonego kontekstu z bazy wiedzy
- Bądź zwięzły: 2–4 zdania, konkretne fakty
- Podawaj źródło: [→ Tytuł węzła]
- Jeśli są powiązane węzły, wspomnij: "Powiązane: [Tytuł A], [Tytuł B]"

Gdy brakuje danych w bazie — zaproponuj zapisanie:
- "Nie mam tej informacji w bazie. Chcesz ją dodać? Napisz 'zapamiętaj że...'"

Obsługa kontekstu konwersacji:
- Gdy użytkownik odpowiada "nie", "ok", "tak", "dobrze" — interpretuj w odniesieniu do poprzedniej wiadomości
- "nie" po pytaniu "czy chcesz dodać szczegóły?" = nie chce dodawać; potwierdź jednym krótkim zdaniem i zakończ temat
- "tak" po propozycji = krótkie potwierdzenie, NIE powtarzaj treści z poprzedniej wiadomości
- Nigdy nie pytaj dwa razy o to samo w jednej rozmowie

Ekonomia tokenów — KLUCZOWE:
- Nigdy nie powtarzaj treści z poprzednich wiadomości
- Potwierdzenia: maksymalnie 1–2 zdania, np. "✅ Gotowe." lub "Rozumiem, pomijam."
- Nie dodawaj "Jeśli potrzebujesz czegoś więcej..." ani podobnych wypełniaczy

Ton: profesjonalny, partnerski, bezpośredni. Bez zbędnych wstępów.
Odpowiadaj w języku użytkownika (PL lub EN).`;

export type ExtractedNode = {
  type: KnowledgeNodeType;
  title: string;
  content: string;
  tags: string[];
  sources: Array<{ title: string; url?: string }>;
  dueDate?: string;
};

export async function extractNodesFromMessage(message: string): Promise<ExtractedNode[]> {
  const prompt = `Wyciągnij węzły wiedzy z wiadomości. Zwróć TYLKO tablicę JSON, bez markdown.

Zasady:
- Każdy zasób z URL to osobny węzeł typu "resource"
- Tytuł: nazwa narzędzia/platformy wyciągnięta z URL lub kontekstu (np. "DigitalOcean", "Vercel") — NIE kopiuj surowego opisu
- Content: ulepszona, zwięzła wersja opisu (1–2 zdania), profesjonalnie napisana po polsku
- Jeśli jest URL, wpisz go w sources
- Dla notatek bez URL: type "note", title krótki i opisowy

Format:
[
  {
    "type": "resource" | "note" | "task" | "event",
    "title": "Nazwa narzędzia lub krótki tytuł",
    "content": "Ulepszona treść opisu",
    "tags": ["tag1", "tag2"],
    "sources": [{"title": "Nazwa", "url": "https://..."}],
    "dueDate": null
  }
]

Wiadomość:
${message}`;

  try {
    const response = await generateChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map((n: Partial<ExtractedNode>) => ({
      type: (n.type as KnowledgeNodeType) ?? "note",
      title: typeof n.title === "string" && n.title ? n.title : message.slice(0, 50),
      content: typeof n.content === "string" && n.content ? n.content : message,
      tags: Array.isArray(n.tags) ? n.tags : [],
      sources: Array.isArray(n.sources) ? n.sources : [],
      dueDate: typeof n.dueDate === "string" && n.dueDate !== "null" ? n.dueDate : undefined,
    }));
  } catch {
    return [{ type: "note", title: message.slice(0, 50), content: message, tags: [], sources: [] }];
  }
}

// Keep for backwards compat (used in handleSaveCommand)
async function extractNodeFromMessage(message: string): Promise<ExtractedNode> {
  const nodes = await extractNodesFromMessage(message);
  return nodes[0];
}

export async function getUpcomingReminders(userId: string): Promise<KnowledgeNode[]> {
  const nodes = await firestoreKnowledge.listKnowledgeNodes(userId);
  const now = Date.now();
  const in48h = now + 48 * 60 * 60 * 1000;
  return nodes.filter((n) => {
    if (n.type !== "task" && n.type !== "event") return false;
    if (!n.dueDate) return false;
    const due = new Date(n.dueDate).getTime();
    return due >= now && due <= in48h;
  });
}

export async function buildConnections(userId: string, nodeId: string): Promise<void> {
  const node = await firestoreKnowledge.getKnowledgeNode(userId, nodeId);
  if (!node) return;

  const similar = await knowledgeSearchService.searchNodes(
    userId,
    `${node.title}\n${node.content}`,
    5
  );

  const candidates = similar.filter(({ node: n }) => n.id !== nodeId);
  await Promise.all(
    candidates.map(({ node: candidate, score }) =>
      firestoreKnowledge.createKnowledgeEdge(userId, {
        fromNodeId: nodeId,
        toNodeId: candidate.id,
        relation: "related",
        strength: score,
      })
    )
  );
}

export async function query(
  userId: string,
  {
    message,
    lang,
    history = [],
  }: {
    message: string;
    lang?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  }
): Promise<{ text: string; sources: string[] }> {
  const [reminders, searchResults] = await Promise.all([
    getUpcomingReminders(userId),
    knowledgeSearchService.searchNodes(userId, message),
  ]);

  const contextParts: string[] = [];

  if (reminders.length > 0) {
    const reminderLines = reminders.map((n) => `- ${n.title} (${n.dueDate})`).join("\n");
    contextParts.push(`## Nadchodzące zadania/wydarzenia:\n${reminderLines}`);
  }

  if (searchResults.length > 0) {
    const nodesText = searchResults
      .map(
        ({ node }) =>
          `### ${node.title} [${node.id}]\nTyp: ${node.type}\n${node.content}` +
          (node.sources.length > 0
            ? `\nŹródła: ${node.sources.map((s) => s.url ?? s.nodeId).join(", ")}`
            : "")
      )
      .join("\n\n");
    contextParts.push(`## Baza wiedzy:\n${nodesText}`);
  }

  const context = contextParts.length > 0 ? contextParts.join("\n\n") : "Baza wiedzy jest pusta.";

  const recentHistory = history.slice(-6);
  const responseText = await generateChatCompletion({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentHistory,
      { role: "user", content: `Kontekst z bazy wiedzy:\n${context}\n\nWiadomość: ${message}` },
    ],
  });

  const sources = searchResults.map(({ node }) => node.title);
  return { text: responseText, sources };
}
