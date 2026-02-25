import type { TaskRecord } from "../lib/firestore-db.js";
import * as firestoreDb from "../lib/firestore-db.js";

export async function getTasks(userId: string) {
  return firestoreDb.getTasks(userId);
}

export async function createTask(
  userId: string,
  data: {
    title: string;
    description?: string;
    status?: TaskRecord["status"];
    due_date?: string | null;
    priority?: number | null;
  }
) {
  return firestoreDb.createTask(userId, data);
}

export async function updateTask(
  userId: string,
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: TaskRecord["status"];
    due_date: string | null;
    priority: number | null;
  }>
) {
  return firestoreDb.updateTask(userId, id, data);
}

export async function deleteTask(userId: string, id: string) {
  return firestoreDb.deleteTask(userId, id);
}
