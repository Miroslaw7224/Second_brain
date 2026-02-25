import * as firestoreDb from "../lib/firestore-db.js";

export async function listDocuments(userId: string) {
  return firestoreDb.getDocuments(userId);
}

export async function ingestDocument(
  userId: string,
  data: { name: string; content: string; type: string }
) {
  const { id: docId } = await firestoreDb.createDocument(userId, data);
  const paragraphs = data.content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
  if (paragraphs.length > 0) {
    await firestoreDb.addChunks(
      userId,
      paragraphs.map((p: string) => ({ documentId: docId, content: p }))
    );
  }
  return { id: docId, name: data.name };
}

export async function deleteDocument(userId: string, id: string) {
  return firestoreDb.deleteDocument(userId, id);
}
