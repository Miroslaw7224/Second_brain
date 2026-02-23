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
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Required for Firebase signInWithPopup: allow opener to check popup (window.closed)
  app.use((_req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
  });

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

  // Calendar events
  app.get("/api/calendar/events", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    try {
      const events = await firestoreDb.getCalendarEvents(userId, { startDate, endDate });
      res.json(events);
    } catch (err: any) {
      console.error("getCalendarEvents:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/calendar/events", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { date, start_minutes, duration_minutes, title, tags, color } = req.body;
    if (!date || duration_minutes == null) {
      return res.status(400).json({ error: "date and duration_minutes required" });
    }
    if (duration_minutes % 15 !== 0) {
      return res.status(400).json({ error: "duration_minutes must be a multiple of 15" });
    }
    try {
      const event = await firestoreDb.createCalendarEvent(userId, {
        date,
        start_minutes: Number(start_minutes) ?? 0,
        duration_minutes: Number(duration_minutes),
        title: title ?? "",
        tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
        color: color ?? "#3B82F6",
      });
      res.json(event);
    } catch (err: any) {
      console.error("createCalendarEvent:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/calendar/events/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    const body = req.body;
    if (body.duration_minutes != null && body.duration_minutes % 15 !== 0) {
      return res.status(400).json({ error: "duration_minutes must be a multiple of 15" });
    }
    try {
      await firestoreDb.updateCalendarEvent(userId, id, {
        date: body.date,
        start_minutes: body.start_minutes,
        duration_minutes: body.duration_minutes,
        title: body.title,
        tags: body.tags,
        color: body.color,
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("updateCalendarEvent:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/calendar/events/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    try {
      await firestoreDb.deleteCalendarEvent(userId, id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("deleteCalendarEvent:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Tasks (to-do)
  app.get("/api/tasks", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    try {
      const tasks = await firestoreDb.getTasks(userId);
      res.json(tasks);
    } catch (err: any) {
      console.error("getTasks:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tasks", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { title, description, status, due_date, priority } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title required" });
    }
    try {
      const task = await firestoreDb.createTask(userId, {
        title,
        description: description ?? "",
        status: status ?? "todo",
        due_date: due_date ?? null,
        priority: priority ?? null,
      });
      res.json(task);
    } catch (err: any) {
      console.error("createTask:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/tasks/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    const { title, description, status, due_date, priority } = req.body;
    try {
      await firestoreDb.updateTask(userId, id, {
        title,
        description,
        status,
        due_date,
        priority,
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("updateTask:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    try {
      await firestoreDb.deleteTask(userId, id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("deleteTask:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // User tags (tag + default title for calendar entries)
  app.get("/api/tags", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    try {
      const list = await firestoreDb.getUserTags(userId);
      res.json(list);
    } catch (err: any) {
      console.error("getUserTags:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tags", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { tag, title } = req.body;
    if (!tag || typeof tag !== "string" || !tag.trim()) {
      return res.status(400).json({ error: "tag required" });
    }
    try {
      const created = await firestoreDb.createUserTag(userId, {
        tag: tag.trim(),
        title: typeof title === "string" ? title.trim() : "",
      });
      res.json(created);
    } catch (err: any) {
      console.error("createUserTag:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/tags/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    const { tag, title } = req.body;
    try {
      await firestoreDb.updateUserTag(userId, id, {
        tag: typeof tag === "string" ? tag.trim() : undefined,
        title: typeof title === "string" ? title.trim() : undefined,
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("updateUserTag:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/tags/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    try {
      await firestoreDb.deleteUserTag(userId, id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("deleteUserTag:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Plan AI: time summary by tag + add events from natural language
  app.post("/api/plan/ask", authMiddleware, async (req, res) => {
    const { message, lang = "en" } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message required" });
    }
    const userId = req.uid!;
    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - 60);
    const future = new Date(now);
    future.setDate(future.getDate() + 60);
    const startDate = past.toISOString().slice(0, 10);
    const endDate = future.toISOString().slice(0, 10);
    try {
      const events = await firestoreDb.getCalendarEvents(userId, { startDate, endDate });
      const eventsContext = events
        .map(
          (e: any) =>
            `- ${e.date} ${Math.floor(e.start_minutes / 60)}:${String(e.start_minutes % 60).padStart(2, "0")} ${e.duration_minutes}min "${e.title}" tags:${(e.tags || []).join(",")}`
        )
        .join("\n");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const systemInstruction =
        lang === "pl"
          ? `Jesteś asystentem planowania. Masz listę wpisów kalendarza użytkownika (data, godzina, czas w min, tytuł, tagi).
Zadania:
1) Gdy użytkownik pyta ile czasu poświęcił na coś (np. "ile czasu na testy w tym tygodniu", "sprawdź czas na #nauka") - policz sumę duration_minutes z wpisów pasujących do tagu/okresu i odpowiedz jednym zdaniem po polsku (np. "W tym tygodniu: 8h na #testy").
2) Gdy użytkownik mówi że ma coś do zrobienia (np. "mam do zrobienia w tym tygodniu testy modułu auth", "mam 3 dni na zrobienie testów auth") - zwróć TYLKO poprawny JSON bez markdown, w formacie:
{"action":"add_events","events":[{"title":"...","tags":["tag1"],"dates":["YYYY-MM-DD"],"duration_minutes":60,"start_minutes":540}]}
- start_minutes: 540 = 9:00. dates: jeden dzień = jeden blok; jeśli "3 dni" podaj 3 daty (np. następne 3 dni robocze). "w tym tygodniu" = jeden dzień (np. piątek).`
          : `You are a planning assistant. You have the user's calendar events (date, time, duration_minutes, title, tags).
Tasks:
1) If the user asks how much time they spent on something (e.g. "how much time on tests this week", "check time on #learning") - sum duration_minutes from matching events and reply in one sentence.
2) If the user says they have something to do (e.g. "I have to do auth module tests this week", "I have 3 days to do auth tests") - return ONLY valid JSON, no markdown:
{"action":"add_events","events":[{"title":"...","tags":["tag1"],"dates":["YYYY-MM-DD"],"duration_minutes":60,"start_minutes":540}]}
- start_minutes: 540 = 9:00. dates: one date = one block; if "3 days" give 3 dates. "this week" = one day (e.g. Friday).`;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `User calendar events:\n${eventsContext}\n\nUser message: ${message}`,
        config: { systemInstruction },
      });
      let text = (response.text || "").trim();
      const jsonMatch = text.match(/\{[\s\S]*"action"\s*:\s*"add_events"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[0]);
          if (data.action === "add_events" && Array.isArray(data.events)) {
            const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];
            let created = 0;
            for (const ev of data.events) {
              const dates = ev.dates || (ev.date ? [ev.date] : []);
              const title = ev.title || "Task";
              const tags = Array.isArray(ev.tags) ? ev.tags : [];
              const d = Number(ev.duration_minutes) || 60;
              const duration = Math.max(15, Math.round(d / 15) * 15);
              const startMin = Number(ev.start_minutes) || 540;
              const color = ev.color || colors[created % colors.length];
              for (const date of dates) {
                await firestoreDb.createCalendarEvent(userId, {
                  date: String(date).slice(0, 10),
                  start_minutes: startMin,
                  duration_minutes: duration,
                  title,
                  tags,
                  color,
                });
                created++;
              }
            }
            text = lang === "pl" ? `Dodano ${created} wpis(ów) do kalendarza.` : `Added ${created} event(s) to calendar.`;
            return res.json({ text, created });
          }
        } catch (parseErr) {
          console.error("Plan ask parse:", parseErr);
        }
      }
      res.json({ text });
    } catch (error: any) {
      console.error("Plan ask error:", error);
      res.status(500).json({ error: error.message });
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
