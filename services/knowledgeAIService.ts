import * as firestoreKnowledge from "@/lib/firestore-knowledge";
import { generateChatCompletion } from "@/lib/openai";
import * as knowledgeSearchService from "@/services/knowledgeSearchService";
import { KnowledgeNode, KnowledgeNodeType } from "@/types/knowledge";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIPv4, isIPv6 } from "node:net";

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

const FETCH_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_FETCH_REDIRECTS = 15;

function isPrivateIpv4Octets(a: number, b: number): boolean {
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 0) return true;
  return false;
}

function isBlockedIpv4Dotted(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return true;
  const [a, b, c, d] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if ([a, b, c, d].some((n) => n > 255)) return true;
  return isPrivateIpv4Octets(a, b);
}

/** Expand IPv6 with a single "::" shorthand to 8 hextets, or null if invalid. */
function expandIpv6Hextets(addrRaw: string): string[] | null {
  let addr = addrRaw.toLowerCase().split("%")[0]!;
  const v4Mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(addr);
  if (v4Mapped) return null;
  const doubleSep = "::";
  if (!addr.includes(doubleSep)) {
    const parts = addr.split(":").filter((p) => p.length > 0);
    if (parts.length !== 8) return null;
    return parts.map((h) => h.padStart(4, "0"));
  }
  const partsSplit = addr.split(doubleSep);
  if (partsSplit.length !== 2) return null;
  const [leftRaw, rightRaw] = partsSplit;
  const left = leftRaw ? leftRaw.split(":").filter(Boolean) : [];
  const right = rightRaw ? rightRaw.split(":").filter(Boolean) : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  const mid = Array(missing).fill("0") as string[];
  const merged = [...left, ...mid, ...right];
  if (merged.length !== 8) return null;
  return merged.map((h) => h.padStart(4, "0"));
}

function isBlockedIpv6Normalized(addrRaw: string): boolean {
  const base = addrRaw.replace(/^\[|\]$/g, "").replace(/^\s+|\s+$/g, "");
  const fm = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(base);
  if (fm) return isBlockedIpv4Dotted(fm[1]!);

  const hextets = expandIpv6Hextets(base);
  if (!hextets) {
    return isIPv6(base);
  }

  const lastOnlyOne =
    parseInt(hextets[7]!, 16) === 1 && hextets.slice(0, 7).every((h) => h === "0000");
  if (lastOnlyOne) return true;

  const first = parseInt(hextets[0]!, 16);
  // fc00::/7 unique local addresses
  if ((first & 0xfe00) === 0xfc00) return true;
  // fe80::/10 link-local
  if (first >= 0xfe80 && first <= 0xfebf) return true;

  return false;
}

function resolvedAddressIsBlocked(address: string): boolean {
  const a = address.replace(/^\[|\]$/g, "").trim();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(a);
  if (mapped) return isBlockedIpv4Dotted(mapped[1]!);
  if (isIPv4(a)) return isBlockedIpv4Dotted(a);
  if (isIPv6(a)) return isBlockedIpv6Normalized(a);
  return true;
}

async function hostnameResolvesOnlyToPublic(hostname: string): Promise<boolean> {
  const h = hostname.toLowerCase();
  if (!h || h === "localhost") return false;

  try {
    const records = await dnsLookup(h, { all: true });
    if (!records.length) return false;
    for (const rec of records) {
      const ip = typeof rec === "object" && "address" in rec ? rec.address : "";
      if (!ip || resolvedAddressIsBlocked(ip)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Block SSRF targets: literal private IPs plus hostnames resolving to blocked addresses. */
export async function isPublicUrl(rawUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) return false;
  // IPv6 hostnames contain ":" once compressed
  const isLiteralV6Host = hostname.includes(":") || isIPv6(hostname);
  const isLiteralV4Host = !isLiteralV6Host && isIPv4(hostname);

  if (isLiteralV4Host) {
    return !isBlockedIpv4Dotted(hostname);
  }
  if (isLiteralV6Host) {
    const v6Addr = hostname.replace(/^\[|\]$/g, "");
    if (!isIPv6(v6Addr)) return false;
    return !isBlockedIpv6Normalized(v6Addr);
  }

  return hostnameResolvesOnlyToPublic(hostname);
}

// Fetch page title and meta description — free, no external API, 3s timeout.
// Uses manual redirects and re-validates each hop after DNS/IP checks.
async function fetchPageMeta(url: string): Promise<{ title: string; description: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    let currentUrl = url;

    try {
      for (let hop = 0; hop <= MAX_FETCH_REDIRECTS; hop++) {
        if (!(await isPublicUrl(currentUrl))) return null;
        const res = await fetch(currentUrl, {
          redirect: "manual",
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SecondBrain/1.0)" },
        });

        if (FETCH_REDIRECT_STATUSES.has(res.status)) {
          const loc = res.headers.get("location") ?? res.headers.get("Location");
          if (!loc) return null;
          try {
            currentUrl = new URL(loc, currentUrl).href;
          } catch {
            return null;
          }
          continue;
        }

        if (!res.ok) return null;
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
        const descMatch =
          html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,400})["']/i) ??
          html.match(/<meta[^>]+content=["']([^"']{1,400})["'][^>]+name=["']description["']/i) ??
          html.match(
            /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,400})["']/i
          );
        const title = titleMatch?.[1]?.trim() ?? "";
        const description = descMatch?.[1]?.trim() ?? "";
        if (!title && !description) return null;
        return { title, description };
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
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
    const VALID_TYPES: KnowledgeNodeType[] = [
      "note",
      "task",
      "resource",
      "chat",
      "document",
      "event",
    ];
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map((n: Partial<ExtractedNode>) => ({
      type: VALID_TYPES.includes(n.type as KnowledgeNodeType)
        ? (n.type as KnowledgeNodeType)
        : "note",
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
