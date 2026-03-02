export type TranslationDict = Record<string, string | string[]>;

export interface NoteResource {
  id: string;
  noteId?: string;
  userId: string;
  description: string;
  url: string;
  title: string;
  thumbnailUrl?: string;
  tags: string[];
  isFavorite?: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

/** Result of parsing a single block (Opis:/Description: ... URL: ... Tagi:/Tags: ...). */
export interface ParsedResourceBlock {
  description: string;
  url: string;
  tags: string[];
}

export interface ResourceSectionProps {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  t: TranslationDict;
}
