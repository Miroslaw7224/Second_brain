import * as firestoreDb from "../lib/firestore-db.js";

export async function listNotes(userId: string) {
  return firestoreDb.getNotes(userId);
}

export async function createNote(
  userId: string,
  data: { title: string; content: string }
) {
  return firestoreDb.createNote(userId, data);
}

export async function updateNote(
  userId: string,
  id: string,
  data: { title: string; content: string }
) {
  return firestoreDb.updateNote(userId, id, data);
}

export async function deleteNote(userId: string, id: string) {
  return firestoreDb.deleteNote(userId, id);
}
