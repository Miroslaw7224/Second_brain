/** Zasób użytkownika: link z opisem i tagami (`Resources/resources.yaml`). */
export type Resource = {
  id: string;
  noteId?: string; // opcjonalne: zasoby są na poziomie użytkownika, nie notatki
  description: string;
  url: string;
  title: string;
  thumbnailUrl?: string;
  tags: string[];
  isFavorite?: boolean;
  createdAt?: string; // ISO 8601
  updatedAt?: string; // ISO 8601
};

/** Scalanie wariantów tagów przy zapisie: klucz = tag małymi literami, wartość = tag docelowy. */
export const TAG_MERGE_MAP: Readonly<Record<string, string>> = {
  kurs: "Learning",
  kursy: "Learning",
  nauka: "Learning",
  "moje projekty": "Projekty",
};
