import { GoogleGenAI } from "@google/genai";
import type { MindMapNode } from "@/src/features/mind-maps/mindMapTypes";
import { nanoid } from "nanoid";

export type AINodeResult = {
  label: string;
  description: string;
};

const MINDMAP_NODE_INTERFACE = `
export interface MindMapNode {
  /** Unique within a mind map (use nanoid()). */
  id: string;
  label: string;
  /** Rich text (TipTap JSON or HTML depending on editor implementation). */
  note: string;
  /** UI state persisted in the document. */
  collapsed: boolean;
  children: MindMapNode[];
}
`.trim();

let client: InstanceType<typeof GoogleGenAI> | null = null;

function getClient(): InstanceType<typeof GoogleGenAI> {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function buildPrompt(query: string): string {
  return `
Wyszukaj informacje o narzędziu lub pojęciu: "${query}".

Odpowiedz WYŁĄCZNIE poprawnym JSON (bez markdown, bez backticków), w formacie:
{
  "label": "Krótka nazwa (max 4 słowa)",
  "description": "Opis (2-4 zdania, po polsku)"
}

Zasady:
- "label" ma być zwięzły i nie zawierać dopisków typu "(narzędzie)", "(platforma)".
- "description" ma być konkretny, bez lania wody i bez linków.
`.trim();
}

function extractJsonObject(text: string): string {
  const trimmed = (text ?? "").trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini response does not contain JSON object");
  return match[0];
}

function normalizeResult(result: AINodeResult): AINodeResult {
  const label = (result.label ?? "").trim();
  const description = (result.description ?? "").trim();
  if (!label || !description) throw new Error("Gemini JSON missing label/description");

  const shortLabel = label.split(/\s+/).slice(0, 4).join(" ");
  return { label: shortLabel, description };
}

export async function generateNodeFromWeb(query: string): Promise<AINodeResult> {
  const q = (query ?? "").trim();
  if (!q) throw new Error("Query is required");

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(q),
    config: { tools: [{ googleSearch: {} }] },
  });

  const text = (response.text ?? "").trim();
  const json = extractJsonObject(text);
  const parsed = JSON.parse(json) as AINodeResult;
  return normalizeResult(parsed);
}

function normalizeImportedNode(node: unknown, isRoot: boolean): MindMapNode {
  if (!node || typeof node !== "object") {
    throw new Error("Gemini JSON is not an object");
  }
  const n = node as Partial<MindMapNode> & { children?: unknown };

  const label = typeof n.label === "string" ? n.label.trim() : "";
  const note = typeof n.note === "string" ? n.note : "";
  const collapsed = typeof n.collapsed === "boolean" ? n.collapsed : false;

  const rawChildren = Array.isArray(n.children) ? n.children : [];
  const children = rawChildren.map((c) => normalizeImportedNode(c, false));

  return {
    id: isRoot ? "root" : nanoid(),
    label: label || (isRoot ? "Importowana mapa" : "Węzeł"),
    note,
    collapsed,
    children,
  };
}

function buildImportPrompt(structureText: string): string {
  return `
Przepisz poniższą strukturę jako JSON MindMapNode zgodny z tym interfejsem:
${MINDMAP_NODE_INTERFACE}

Odpowiedz TYLKO czystym JSON, bez markdown.

Struktura:
${structureText}
`.trim();
}

export async function importMindMap(params: {
  structureText: string;
  image?: { mimeType: string; bytes: Uint8Array };
}): Promise<MindMapNode> {
  const structureText = (params.structureText ?? "").trim();
  if (!structureText) throw new Error("structureText is required");

  const ai = getClient();

  const parts: Array<Record<string, unknown>> = [{ text: buildImportPrompt(structureText) }];
  if (params.image) {
    const b64 = Buffer.from(params.image.bytes).toString("base64");
    parts.push({ inlineData: { mimeType: params.image.mimeType, data: b64 } });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    // @google/genai supports multimodal parts; keep typing loose to avoid SDK type drift.
    contents: [{ role: "user", parts }] as unknown as any,
  });

  const text = (response.text ?? "").trim();
  const json = extractJsonObject(text);
  const parsed = JSON.parse(json) as unknown;
  return normalizeImportedNode(parsed, true);
}
