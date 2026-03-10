import { useState, useCallback } from "react";

export interface Document {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface UseWiedzaDataResult {
  documents: Document[];
  notes: Note[];
  fetchDocuments: () => Promise<void>;
  fetchNotes: () => Promise<void>;
}

export function useWiedzaData(
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
): UseWiedzaDataResult {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await apiFetch("/api/documents");
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
      setDocuments([]);
    }
  }, [apiFetch]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await apiFetch("/api/notes");
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch notes", err);
      setNotes([]);
    }
  }, [apiFetch]);

  return { documents, notes, fetchDocuments, fetchNotes };
}
