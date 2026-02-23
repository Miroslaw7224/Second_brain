/**
 * One-time migration: SQLite (brain.db) -> Firestore.
 * Creates Firebase Auth users from SQLite users (by email) if they don't exist,
 * then migrates documents, notes, and chunks under users/{firebaseUid}/...
 *
 * Usage: npx tsx scripts/migrate-sqlite-to-firestore.ts [path/to/brain.db]
 * Requires: .env with FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *           (or GOOGLE_APPLICATION_CREDENTIALS)
 */
import "dotenv/config";
import Database from "better-sqlite3";
import path from "path";
import { getFirestore, getAuth } from "../lib/firebase-admin.js";
import { FieldValue } from "firebase-admin/firestore";

const DB_PATH = process.argv[2] ?? path.join(process.cwd(), "brain.db");

type SqliteUser = { id: number; email: string | null; password: string | null; name: string | null };
type SqliteDocument = { id: number; user_id: number; name: string; content: string; type: string; created_at: string };
type SqliteNote = { id: number; user_id: number; title: string; content: string; created_at: string };
type SqliteChunk = { id: number; document_id: number | null; note_id: number | null; content: string };

const TEMP_PASSWORD = process.env.MIGRATION_TEMP_PASSWORD ?? "MigrationTemp1!";

async function main() {
  const db = new Database(DB_PATH, { readonly: true });
  const users = db.prepare("SELECT id, email, password, name FROM users").all() as SqliteUser[];
  const documents = db.prepare("SELECT id, user_id, name, content, type, created_at FROM documents").all() as SqliteDocument[];
  const notes = db.prepare("SELECT id, user_id, title, content, created_at FROM notes").all() as SqliteNote[];
  const chunks = db.prepare("SELECT id, document_id, note_id, content FROM chunks").all() as SqliteChunk[];
  db.close();

  const firestore = getFirestore();
  const auth = getAuth();

  const userIdMap = new Map<number, string>();

  for (const u of users) {
    const email = (u.email ?? "").trim();
    if (!email) {
      console.warn(`Skipping user id=${u.id}: no email`);
      continue;
    }
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
      console.log(`User ${email} -> existing Firebase uid ${uid}`);
    } catch {
      try {
        const created = await auth.createUser({
          email,
          emailVerified: false,
          password: (u.password && u.password.length > 0) ? u.password : TEMP_PASSWORD,
          displayName: (u.name ?? email).trim() || undefined,
        });
        uid = created.uid;
        console.log(`User ${email} -> created Firebase uid ${uid} (password: ${(u.password && u.password.length > 0) ? "from SQLite" : "temp"})`);
      } catch (err: any) {
        console.error(`Failed to get/create user for ${email}:`, err.message);
        continue;
      }
    }
    userIdMap.set(u.id, uid);
  }

  for (const [sqliteUserId, firebaseUid] of userIdMap) {
    const userDocs = documents.filter((d) => d.user_id === sqliteUserId);
    const userNotes = notes.filter((n) => n.user_id === sqliteUserId);
    const userChunks = chunks.filter((c) => {
      if (c.document_id != null) {
        const doc = documents.find((d) => d.id === c.document_id);
        if (doc && doc.user_id === sqliteUserId) return true;
      }
      if (c.note_id != null) {
        const note = notes.find((n) => n.id === c.note_id);
        if (note && note.user_id === sqliteUserId) return true;
      }
      return false;
    });

    const docIdMap = new Map<number, string>();
    const notesCol = firestore.collection("users").doc(firebaseUid).collection("notes");
    const docsCol = firestore.collection("users").doc(firebaseUid).collection("documents");
    const chunksCol = firestore.collection("users").doc(firebaseUid).collection("chunks");

    for (const d of userDocs) {
      const ref = await docsCol.add({
        name: d.name ?? "",
        content: d.content ?? "",
        type: d.type ?? "",
        createdAt: FieldValue.serverTimestamp(),
      });
      docIdMap.set(d.id, ref.id);
    }

    const noteIdMap = new Map<number, string>();
    for (const n of userNotes) {
      const ref = await notesCol.add({
        title: n.title ?? "",
        content: n.content ?? "",
        createdAt: FieldValue.serverTimestamp(),
      });
      noteIdMap.set(n.id, ref.id);
    }

    for (const c of userChunks) {
      const documentId = c.document_id != null ? docIdMap.get(c.document_id) ?? null : null;
      const noteId = c.note_id != null ? noteIdMap.get(c.note_id) ?? null : null;
      if (!documentId && !noteId) continue;
      await chunksCol.add({
        documentId,
        noteId,
        content: c.content ?? "",
      });
    }

    console.log(`Migrated user ${firebaseUid}: ${userDocs.length} docs, ${userNotes.length} notes, ${userChunks.length} chunks`);
  }

  console.log("Migration done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
