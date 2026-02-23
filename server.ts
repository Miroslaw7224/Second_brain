import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { getFirestore, verifyIdToken } from "./lib/firebase-admin.js";
import * as firestoreDb from "./lib/firestore-db.js";

getFirestore(); // fail fast if Firebase not configured

const upload = multer({ storage: multer.memoryStorage() });

declare global {
  namespace Express {
    interface Request {
      uid?: string;
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }
    const idToken = authHeader.slice(7);
    try {
      req.uid = await verifyIdToken(idToken);
      next();
    } catch (err: any) {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };

  app.get("/api/auth/me", authMiddleware, (req, res) => {
    res.json({ uid: req.uid });
  });

  app.get("/api/documents", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    try {
      const docs = await firestoreDb.getDocuments(userId);
      res.json(docs.map((d) => ({ id: d.id, name: d.name, content: d.content, type: d.type, created_at: d.created_at })));
    } catch (err: any) {
      console.error("Firestore getDocuments:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/notes", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    try {
      const notes = await firestoreDb.getNotes(userId);
      res.json(notes.map((n) => ({ id: n.id, title: n.title, content: n.content, created_at: n.created_at })));
    } catch (err: any) {
      console.error("Firestore getNotes:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notes", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { title, content } = req.body;
    try {
      const result = await firestoreDb.createNote(userId, { title, content });
      res.json(result);
    } catch (err: any) {
      console.error("Firestore createNote:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/notes/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.uid!;
    const { title, content } = req.body;
    try {
      await firestoreDb.updateNote(userId, id, { title, content });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Firestore updateNote:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/notes/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.uid!;
    try {
      await firestoreDb.deleteNote(userId, id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Firestore deleteNote:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/upload", authMiddleware, upload.single("file"), async (req: express.Request, res) => {
    const userId = req.uid!;
    const file = (req as express.Request & { file?: { originalname: string; buffer: Buffer; mimetype: string } }).file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const name = file.originalname;
    const content = file.buffer.toString("utf-8");
    const type = file.mimetype;

    try {
      const { id: docId } = await firestoreDb.createDocument(userId, { name, content, type });
      const paragraphs = content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
      if (paragraphs.length > 0) {
        await firestoreDb.addChunks(
          userId,
          paragraphs.map((p: string) => ({ documentId: docId, content: p }))
        );
      }
      res.json({ id: docId, name });
    } catch (err: any) {
      console.error("Firestore upload:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chat", authMiddleware, async (req, res) => {
    const { message, lang = "en" } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const userId = req.uid!;
    const keywords = message.split(" ").filter((w: string) => w.length > 3);

    try {
      const relevantChunks = await firestoreDb.getChunksForSearch(userId, keywords, 5);

      const context = relevantChunks
        .map((c: any) => `[Source: ${c.source_name || c.note_title || "Note"}]\n${c.content}`)
        .join("\n\n");

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const systemInstruction =
        lang === "pl"
          ? "Jesteś asystentem 'Drugi Mózg' dla freelancerów. Odpowiadaj na pytania użytkownika WYŁĄCZNIE na podstawie dostarczonego kontekstu. Jeśli odpowiedzi nie ma w kontekście, powiedz, że nie wiesz. Zawsze podawaj nazwę dokumentu źródłowego w swojej odpowiedzi. Odpowiadaj w języku polskim."
          : "You are a 'Second Brain' assistant for freelancers. Answer the user's question based ONLY on the provided context. If the answer is not in the context, say you don't know. Always cite the source document name in your answer. Respond in English.";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Context from user documents:\n${context}\n\nUser Question: ${message}`,
        config: { systemInstruction },
      });

      const sources = Array.from(
        new Set(relevantChunks.map((c: any) => c.source_name || c.note_title || "Note"))
      );
      res.json({ text: response.text, sources });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/documents/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.uid!;
    try {
      await firestoreDb.deleteDocument(userId, id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Firestore deleteDocument:", err);
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Using Firebase Auth and Firestore.");
  });
}

startServer();
