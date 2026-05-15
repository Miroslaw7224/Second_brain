import * as firestoreKnowledge from "@/lib/firestore-knowledge";
import { generateChatCompletion } from "@/lib/openai";
import * as knowledgeSearchService from "@/services/knowledgeSearchService";
import * as knowledgeNodeService from "@/services/knowledgeNodeService";
import { KnowledgeNode, KnowledgeNodeType } from "@/types/knowledge";

const SAVE_KEYWORDS = [
  "zapamiętaj",
  "zapisz",
  "dodaj notatkę",
  "dodaj zadanie",
  "add note",
  "add task",
  "remember that",
  "save this",
];

const SYSTEM_PROMPT = `Jesteś asystentem osobistej bazy wiedzy. Odpowiadaj na pytania WYŁĄCZNIE na podstawie dostarczonego kontekstu.

Zasady:
- Odpowiedzi zwięzłe: max 3-4 zdania, konkretne fakty
- Zawsze podaj źródło: [→ tytuł (nodeId)]
- Jeśli są powiązane węzły, dodaj: Powiązane: [Tytuł A], [Tytuł B]
- Odpowiadaj w języku użytkownika (PL jeśli pisze po polsku, EN jeśli po angielsku)
- Jeśli informacji nie ma w kontekście: NIE wymyślaj faktów. Zamiast tego zapytaj użytkownika co chce zrobić — np. "Nie mam tej informacji w bazie. Czy chcesz ją teraz dodać?" albo "Brak danych na ten temat — chcesz żebym pomógł to zapisać?"`;

function isSaveCommand(message: string): boolean {
  const lower = message.toLowerCase();
  return SAVE_KEYWORDS.some((k) => lower.includes(k));
}

export async function extractNodeFromMessage(message: string): Promise<{
  type: KnowledgeNodeType;
  title: string;
  content: string;
  tags: string[];
  dueDate?: string;
}> {
  const prompt = `Wyciągnij strukturę wiedzy z tej wiadomości. Zwróć TYLKO JSON, bez markdown:
{
  "type": "note" | "task" | "resource" | "event",
  "title": "krótki tytuł (max 50 znaków)",
  "content": "zwięzła treść (max 3 zdania)",
  "tags": ["tag1", "tag2"],
  "dueDate": "YYYY-MM-DD lub null"
}

Wiadomość: ${message}`;

  try {
    const response = await generateChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    const parsed = JSON.parse(response);
    return {
      type: parsed.type ?? "note",
      title: parsed.title ?? message.slice(0, 50),
      content: parsed.content ?? message,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      dueDate: parsed.dueDate ?? undefined,
    };
  } catch {
    return {
      type: "note",
      title: message.slice(0, 50),
      content: message,
      tags: [],
    };
  }
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

async function handleSaveCommand(
  userId: string,
  message: string
): Promise<{ text: string; sources: string[] }> {
  const extracted = await extractNodeFromMessage(message);
  const node = await knowledgeNodeService.createNode(userId, {
    ...extracted,
    sources: [],
    createdBy: "ai",
  });

  buildConnections(userId, node.id).catch((err) =>
    console.error("[knowledgeAI] buildConnections error:", err)
  );

  return {
    text: `Zapisano: ${node.title}\nTyp: ${node.type}`,
    sources: [node.title],
  };
}

export async function query(
  userId: string,
  { message, lang }: { message: string; lang?: string }
): Promise<{ text: string; sources: string[] }> {
  if (isSaveCommand(message)) {
    return handleSaveCommand(userId, message);
  }

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

  const responseText = await generateChatCompletion({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Kontekst:\n${context}\n\nPytanie: ${message}` },
    ],
  });

  const sources = searchResults.map(({ node }) => node.title);
  return { text: responseText, sources };
}
