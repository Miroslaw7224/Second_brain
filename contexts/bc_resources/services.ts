import * as repositories from "./repositories";
import type { Resource } from "./models";

// ── zasoby ──────────────────────────────────────────────────────────────────────

export async function addResource(data: {
  description: string;
  url: string;
  tags?: string[];
  noteId?: string;
}): Promise<Resource> {
  const { title, thumbnailUrl } = await fetchPageMetadata(data.url);
  return repositories.addResource({
    description: data.description,
    url: data.url,
    title,
    thumbnailUrl,
    tags: data.tags ?? [],
    ...(data.noteId != null && { noteId: data.noteId }),
  });
}

export async function getResources(): Promise<Resource[]> {
  return repositories.getResources();
}

export async function deleteResource(resourceId: string): Promise<void> {
  return repositories.deleteResource(resourceId);
}

export async function updateResource(
  resourceId: string,
  data: {
    title?: string;
    description?: string;
    url?: string;
    tags?: string[];
    isFavorite?: boolean;
  }
): Promise<void> {
  return repositories.updateResource(resourceId, data);
}

const BLOCKED_TITLE = /^(just a moment|attention required)/i;

/** Tytuł strony ochronnej (Cloudflare), nie właściwej treści. */
export function isBlockedTitle(title: string): boolean {
  return BLOCKED_TITLE.test(title.trim());
}

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39|#x27);/gi, (m) => NAMED_ENTITIES[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)));
}

/** Host bez `www.` jako tytuł zastępczy; przy nieprawidłowym adresie sam adres. */
export function hostTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

async function fetchPageMetadata(url: string): Promise<{ title: string; thumbnailUrl?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    const rawTitle = decodeHtmlEntities(titleMatch?.[1]?.trim() ?? "");
    return {
      title: rawTitle === "" ? url : isBlockedTitle(rawTitle) ? hostTitle(url) : rawTitle,
      thumbnailUrl: ogImage?.[1],
    };
  } catch {
    return { title: url };
  }
}

/** Wyszukiwanie po słowach kluczowych (opis, tytuł, tagi); puste `keywords` = wszystkie. */
export async function searchResources(keywords: string[]): Promise<Resource[]> {
  const allResources = await repositories.getResources();

  if (keywords.length === 0) {
    return allResources;
  }

  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return allResources.filter((r) => {
    const desc = (r.description ?? "").toLowerCase();
    const title = (r.title ?? "").toLowerCase();
    const tagStr = (r.tags ?? []).join(" ").toLowerCase();
    return lowerKeywords.some((k) => desc.includes(k) || title.includes(k) || tagStr.includes(k));
  });
}
