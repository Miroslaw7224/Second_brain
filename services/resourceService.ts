import {
  addResourceToFirestore,
  getResourcesFromFirestore,
  deleteResourceFromFirestore,
  updateResourceInFirestore,
  type NoteResourceRecord,
} from "@/lib/firestore-db";

// -----------------------------------------------
// CRUD (zasoby na poziomie użytkownika, niezależne od notatek)
// -----------------------------------------------

export async function addResource(
  userId: string,
  data: { description: string; url: string; tags?: string[]; noteId?: string }
): Promise<NoteResourceRecord> {
  const { title, thumbnailUrl } = await fetchPageMetadata(data.url);
  const resource = await addResourceToFirestore(userId, {
    userId,
    description: data.description,
    url: data.url,
    title,
    thumbnailUrl,
    tags: data.tags ?? [],
    ...(data.noteId != null && { noteId: data.noteId }),
  });
  return resource;
}

export async function getResources(userId: string): Promise<NoteResourceRecord[]> {
  return getResourcesFromFirestore(userId);
}

export async function deleteResource(
  userId: string,
  resourceId: string
): Promise<void> {
  return deleteResourceFromFirestore(userId, resourceId);
}

export async function updateResource(
  userId: string,
  resourceId: string,
  data: { title?: string; tags?: string[] }
): Promise<void> {
  return updateResourceInFirestore(userId, resourceId, data);
}

// -----------------------------------------------
// Pobieranie metadanych strony
// -----------------------------------------------

async function fetchPageMetadata(
  url: string
): Promise<{ title: string; thumbnailUrl?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    return {
      title: titleMatch?.[1]?.trim() ?? url,
      thumbnailUrl: ogImage?.[1],
    };
  } catch {
    return { title: url };
  }
}

// -----------------------------------------------
// Integracja z RAG (keyword search)
// -----------------------------------------------

export async function searchResources(
  userId: string,
  keywords: string[]
): Promise<NoteResourceRecord[]> {
  const allResources = await getResourcesFromFirestore(userId);

  if (keywords.length === 0) {
    return allResources;
  }

  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return allResources.filter((r) => {
    const desc = (r.description ?? "").toLowerCase();
    const title = (r.title ?? "").toLowerCase();
    const tagStr = (r.tags ?? []).join(" ").toLowerCase();
    return lowerKeywords.some(
      (k) => desc.includes(k) || title.includes(k) || tagStr.includes(k)
    );
  });
}
