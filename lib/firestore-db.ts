import { getFirestore } from "./firebase-admin.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const COLLECTION_USERS = "users";

export type DocumentRecord = {
  id: string;
  name: string;
  content: string;
  type: string;
  created_at?: string;
  createdAt?: Timestamp;
};

export type NoteRecord = {
  id: string;
  title: string;
  content: string;
  created_at?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type ChunkRecord = {
  id: string;
  content: string;
  documentId?: string;
  noteId?: string;
  sourceName?: string;
  noteTitle?: string;
};

function db() {
  return getFirestore();
}

function documentsCol(userId: string) {
  return db().collection(COLLECTION_USERS).doc(String(userId)).collection("documents");
}

function notesCol(userId: string) {
  return db().collection(COLLECTION_USERS).doc(String(userId)).collection("notes");
}

function chunksCol(userId: string) {
  return db().collection(COLLECTION_USERS).doc(String(userId)).collection("chunks");
}

export async function getDocuments(userId: string): Promise<DocumentRecord[]> {
  const snap = await documentsCol(userId).orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt;
    return {
      id: d.id,
      name: data.name ?? "",
      content: data.content ?? "",
      type: data.type ?? "",
      created_at: createdAt?.toDate?.()?.toISOString?.(),
      createdAt,
    };
  });
}

export async function getNotes(userId: string): Promise<NoteRecord[]> {
  const snap = await notesCol(userId).orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? "",
      content: data.content ?? "",
      created_at: data.createdAt?.toDate?.()?.toISOString?.(),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

export async function createNote(
  userId: string,
  data: { title: string; content: string }
): Promise<{ id: string; title: string; content: string }> {
  const col = notesCol(userId);
  const ref = await col.add({
    title: data.title,
    content: data.content,
    createdAt: FieldValue.serverTimestamp(),
  });
  await chunksCol(userId).add({
    noteId: ref.id,
    content: data.content,
  });
  return { id: ref.id, title: data.title, content: data.content };
}

export async function updateNote(
  userId: string,
  noteId: string,
  data: { title: string; content: string }
): Promise<void> {
  const noteRef = notesCol(userId).doc(noteId);
  await noteRef.update({
    title: data.title,
    content: data.content,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await deleteChunksByNote(userId, noteId);
  await chunksCol(userId).add({ noteId, content: data.content });
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  await deleteChunksByNote(userId, noteId);
  await notesCol(userId).doc(noteId).delete();
}

export async function createDocument(
  userId: string,
  data: { name: string; content: string; type: string }
): Promise<{ id: string; name: string }> {
  const col = documentsCol(userId);
  const ref = await col.add({
    name: data.name,
    content: data.content,
    type: data.type,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id, name: data.name };
}

export async function addChunks(
  userId: string,
  chunks: { documentId?: string; noteId?: string; content: string }[]
): Promise<void> {
  const col = chunksCol(userId);
  for (const c of chunks) {
    await col.add({
      documentId: c.documentId ?? null,
      noteId: c.noteId ?? null,
      content: c.content,
    });
  }
}

const FIRESTORE_BATCH_LIMIT = 500;

export async function deleteChunksByDocument(userId: string, documentId: string): Promise<void> {
  const snap = await chunksCol(userId).where("documentId", "==", documentId).get();
  for (let i = 0; i < snap.docs.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = db().batch();
    snap.docs.slice(i, i + FIRESTORE_BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function deleteChunksByNote(userId: string, noteId: string): Promise<void> {
  const snap = await chunksCol(userId).where("noteId", "==", noteId).get();
  for (let i = 0; i < snap.docs.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = db().batch();
    snap.docs.slice(i, i + FIRESTORE_BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function deleteDocument(userId: string, docId: string): Promise<void> {
  await deleteChunksByDocument(userId, docId);
  await documentsCol(userId).doc(docId).delete();
}

export type ChunkWithSource = {
  content: string;
  source_name?: string;
  note_title?: string;
  documentId?: string;
  noteId?: string;
};

export async function getChunksForSearch(
  userId: string,
  keywords: string[],
  limitCount: number = 5
): Promise<ChunkWithSource[]> {
  const snap = await chunksCol(userId).get();
  let docs = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as { id: string; content: string; documentId?: string; noteId?: string }[];

  if (keywords.length > 0) {
    docs = docs.filter((d) =>
      keywords.some((k) => (d.content ?? "").toLowerCase().includes(k.toLowerCase()))
    );
  }
  docs = docs.slice(0, limitCount);

  const docIds = [...new Set(docs.map((d) => d.documentId).filter(Boolean))] as string[];
  const noteIds = [...new Set(docs.map((d) => d.noteId).filter(Boolean))] as string[];

  const namesByDoc: Record<string, string> = {};
  const namesByNote: Record<string, string> = {};

  for (const id of docIds) {
    const ref = documentsCol(userId).doc(id);
    const s = await ref.get();
    if (s.exists) namesByDoc[id] = (s.data()?.name as string) ?? "";
  }
  for (const id of noteIds) {
    const ref = notesCol(userId).doc(id);
    const s = await ref.get();
    if (s.exists) namesByNote[id] = (s.data()?.title as string) ?? "";
  }

  return docs.map((d) => ({
    content: d.content,
    source_name: d.documentId ? namesByDoc[d.documentId] : undefined,
    note_title: d.noteId ? namesByNote[d.noteId] : undefined,
    documentId: d.documentId,
    noteId: d.noteId,
  }));
}
