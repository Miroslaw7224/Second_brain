import type { NoteResource } from "./resourceTypes";

/** Unique tags across the list, in lexicographic order. */
export function collectResourceTags(resources: readonly NoteResource[]): string[] {
  return [...new Set(resources.flatMap((r) => r.tags || []))].sort();
}

/** Keeps resources that share at least one selected tag. An empty selection keeps the list. */
export function filterResourcesByTags(
  resources: readonly NoteResource[],
  selectedTags: readonly string[]
): NoteResource[] {
  if (selectedTags.length === 0) return [...resources];
  return resources.filter((r) => (r.tags || []).some((tag) => selectedTags.includes(tag)));
}

/** Matches a trimmed, case-insensitive query against title, description, URL, or tags. */
export function filterResourcesBySearch(
  resources: readonly NoteResource[],
  searchQuery: string
): NoteResource[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return [...resources];
  return resources.filter(
    (r) =>
      (r.title ?? "").toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q) ||
      (r.url ?? "").toLowerCase().includes(q) ||
      (r.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
  );
}

export type TagCount = { tag: string; count: number };

/** Tagi z liczbą zasobów, od najczęstszych; remis rozstrzyga alfabet. */
export function countResourceTags(resources: readonly NoteResource[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const r of resources) {
    for (const tag of r.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "pl"));
}

const CLOUDFLARE_TITLE = /^(just a moment|attention required)/i;

/** Zasób do poprawy: tytuł ze strony Cloudflare, tytuł równy URL-owi albo brak miniatury. */
export function resourceNeedsFix(r: NoteResource): boolean {
  const title = (r.title ?? "").trim();
  return CLOUDFLARE_TITLE.test(title) || title === (r.url ?? "").trim() || !r.thumbnailUrl;
}

export function filterResourcesNeedingFix(resources: readonly NoteResource[]): NoteResource[] {
  return resources.filter(resourceNeedsFix);
}

/** Favorites first. Order within each group stays as given. */
export function sortResourcesByFavorite(resources: readonly NoteResource[]): NoteResource[] {
  return [...resources].sort((a, b) => {
    const aFav = a.isFavorite === true ? 1 : 0;
    const bFav = b.isFavorite === true ? 1 : 0;
    return bFav - aFav;
  });
}
