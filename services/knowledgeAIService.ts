import * as firestoreKnowledge from "@/lib/firestore-knowledge";
import { generateChatCompletion } from "@/lib/openai";
import * as knowledgeSearchService from "@/services/knowledgeSearchService";
import { KnowledgeNode, KnowledgeNodeType } from "@/types/knowledge";

const SYSTEM_PROMPT = `Jesteś asystentem osobistej bazy wiedzy. Prowadzisz konwersację — masz dostęp do historii rozmowy i MUSISZ z niej korzystać.

Kontekst z bazy wiedzy jest zawsze dostarczany przed wiadomością użytkownika. Nawet jeśli dopasowanie nie jest idealne — ZAWSZE sprawdź czy któryś z węzłów odpowiada pytaniu. Jeśli tytuł węzła pasuje do pytania (np. user pyta o "Railway" a węzeł ma tytuł "Railway") — użyj go jako odpowiedzi.

Odpowiadanie na pytania:
- NAJPIERW przejrzyj dostarczone węzły bazy wiedzy — odpowiedź może być właśnie tam
- Gdy pytanie zawiera nazwy własne (np. "Railway, Google Cloud") — szukaj węzłów o dokładnie tych tytułach
- Bądź zwięzły: 2–4 zdania, konkretne fakty
- Podawaj źródło: [→ Tytuł węzła]
- Jeśli są powiązane węzły, wspomnij: "Powiązane: [Tytuł A], [Tytuł B]"

Gdy NAPRAWDĘ brakuje danych (żaden węzeł nie pasuje tytułem ani treścią):
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

// Fetch page title and meta description — free, no external API, 3s timeout
async function fetchPageMeta(url: string): Promise<{ title: string; description: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SecondBrain/1.0)" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,400})["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']{1,400})["'][^>]+name=["']description["']/i) ??
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,400})["']/i);
    const title = titleMatch?.[1]?.trim() ?? "";
    const description = descMatch?.[1]?.trim() ?? "";
    if (!title && !description) return null;
    return { title, description };
  } catch {
    return null;
  }
}

export async function extractNodesFromMessage(message: string): Promise<ExtractedNode[]> {
  // Extract URLs from message to pre-fetch page metadata
  const urlMatches = message.match(/https?:\/\/[^\s]+/g) ?? [];
  const uniqueUrls = [...new Set(urlMatches)].slice(0, 10);

  // Fetch all pages in parallel (best-effort, failures silently ignored)
  const metaByUrl = new Map<string, { title: string; description: string }>();
  if (uniqueUrls.length > 0) {
    const results = await Promise.all(uniqueUrls.map((u) => fetchPageMeta(u)));
    uniqueUrls.forEach((u, i) => {
      if (results[i]) metaByUrl.set(u, results[i]!);
    });
  }

  const pageContext =
    metaByUrl.size > 0
      ? "\n\nDodatkowy kontekst pobrany ze stron (użyj go do ulepszenia opisów):\n" +
        [...metaByUrl.entries()]
          .map(([u, m]) => `${u}\nTytuł strony: ${m.title}\nMeta opis: ${m.description}`)
          .join("\n\n")
      : "";

  const prompt = `Wyciągnij węzły wiedzy z wiadomości. Zwróć TYLKO tablicę JSON, bez markdown.

JĘZYK: Pole "content" ZAWSZE po polsku — niezależnie od języka pobranego kontekstu ze strony.

Zasady:
- Każdy zasób z URL to osobny węzeł typu "resource"
- Tytuł: nazwa narzędzia/platformy (np. "DigitalOcean", "Vercel") — zachowaj oryginalną nazwę własną
- Content: zwięzły opis (1–2 zdania) PO POLSKU, oparty na dostarczonym kontekście — NIE zmyślaj funkcji których nie ma w kontekście
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
${message}${pageContext}`;

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
  // If the message looks like a comma-separated list of proper nouns, also search each term
  // individually so short names match their node titles (e.g. "Railway, Google Cloud, Langfuse")
  const terms = message
    .split(/[,\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && t.length < 60 && !t.includes(" "));
  const isNameList = terms.length >= 2 && terms.every((t) => /^[A-Z]/.test(t));

  const [reminders, searchResults, ...extraResults] = await Promise.all([
    getUpcomingReminders(userId),
    knowledgeSearchService.searchNodes(userId, message),
    ...(isNameList ? terms.map((t) => knowledgeSearchService.searchNodes(userId, t, 3)) : []),
  ]);

  // Merge and deduplicate results, keeping highest score per node
  const merged = new Map<string, { node: KnowledgeNode; score: number }>();
  for (const r of [searchResults, ...extraResults].flat()) {
    const existing = merged.get(r.node.id);
    if (!existing || r.score > existing.score) merged.set(r.node.id, r);
  }
  const dedupedResults = Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const contextParts: string[] = [];

  if (reminders.length > 0) {
    const reminderLines = reminders.map((n) => `- ${n.title} (${n.dueDate})`).join("\n");
    contextParts.push(`## Nadchodzące zadania/wydarzenia:\n${reminderLines}`);
  }

  if (dedupedResults.length > 0) {
    const nodesText = dedupedResults
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

  const sources = dedupedResults.map(({ node }) => node.title);
  return { text: responseText, sources };
}
