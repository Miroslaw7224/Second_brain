import { getFirestore } from "firebase-admin/firestore";
import * as knowledgeNodeService from "@/services/knowledgeNodeService";
import { KnowledgeNodeInput } from "@/types/knowledge";

async function fetchCollection<T>(userId: string, collectionName: string): Promise<T[]> {
  const snap = await getFirestore()
    .collection("users")
    .doc(userId)
    .collection(collectionName)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
}

export async function migrateNotes(userId: string): Promise<number> {
  const notes = await fetchCollection<{ id: string; title: string; content: string }>(
    userId,
    "notes"
  );
  await Promise.all(
    notes.map((note) =>
      knowledgeNodeService.createNode(userId, {
        type: "note",
        title: note.title || "Bez tytułu",
        content: note.content || "",
        tags: [],
        sources: [],
        createdBy: "user",
      } satisfies KnowledgeNodeInput)
    )
  );
  return notes.length;
}

export async function migrateResources(userId: string): Promise<number> {
  const resources = await fetchCollection<{
    id: string;
    title: string;
    description: string;
    url: string;
    tags: string[];
  }>(userId, "resources");
  await Promise.all(
    resources.map((r) =>
      knowledgeNodeService.createNode(userId, {
        type: "resource",
        title: r.title || "Bez tytułu",
        content: r.description || "",
        tags: r.tags ?? [],
        sources: [{ title: r.title, url: r.url }],
        createdBy: "user",
      } satisfies KnowledgeNodeInput)
    )
  );
  return resources.length;
}

export async function migrateDocuments(userId: string): Promise<number> {
  const documents = await fetchCollection<{ id: string; name: string; content: string }>(
    userId,
    "documents"
  );
  await Promise.all(
    documents.map((doc) =>
      knowledgeNodeService.createNode(userId, {
        type: "document",
        title: doc.name || "Bez tytułu",
        content: (doc.content || "").slice(0, 500),
        tags: [],
        sources: [],
        createdBy: "user",
      } satisfies KnowledgeNodeInput)
    )
  );
  return documents.length;
}

export async function migrateTasks(userId: string): Promise<number> {
  const tasks = await fetchCollection<{
    id: string;
    title: string;
    description: string;
    due_date: string | null;
  }>(userId, "tasks");
  await Promise.all(
    tasks.map((task) =>
      knowledgeNodeService.createNode(userId, {
        type: "task",
        title: task.title || "Bez tytułu",
        content: task.description || "",
        tags: [],
        sources: [],
        dueDate: task.due_date ?? undefined,
        createdBy: "user",
      } satisfies KnowledgeNodeInput)
    )
  );
  return tasks.length;
}

export async function migrateCalendarEvents(userId: string): Promise<number> {
  const events = await fetchCollection<{
    id: string;
    title: string;
    date: string;
    start_minutes: number;
    duration_minutes: number;
    tags: string[];
  }>(userId, "calendar_events");
  await Promise.all(
    events.map((evt) =>
      knowledgeNodeService.createNode(userId, {
        type: "event",
        title: evt.title || "Bez tytułu",
        content: `${evt.date} ${Math.floor(evt.start_minutes / 60)}:${String(evt.start_minutes % 60).padStart(2, "0")} (${evt.duration_minutes} min)`,
        tags: evt.tags ?? [],
        sources: [],
        dueDate: evt.date,
        createdBy: "user",
      } satisfies KnowledgeNodeInput)
    )
  );
  return events.length;
}

export async function migrateAll(userId: string): Promise<{
  notes: number;
  resources: number;
  documents: number;
  tasks: number;
  events: number;
  total: number;
}> {
  const [notes, resources, documents, tasks, events] = await Promise.all([
    migrateNotes(userId).catch(() => 0),
    migrateResources(userId).catch(() => 0),
    migrateDocuments(userId).catch(() => 0),
    migrateTasks(userId).catch(() => 0),
    migrateCalendarEvents(userId).catch(() => 0),
  ]);
  return {
    notes,
    resources,
    documents,
    tasks,
    events,
    total: notes + resources + documents + tasks + events,
  };
}
