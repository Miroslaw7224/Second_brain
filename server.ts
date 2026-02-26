import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import { getFirestore, verifyIdToken } from "./lib/firebase-admin.js";
import { DomainError } from "./lib/errors.js";
import * as planService from "./services/planService.js";
import * as ragService from "./services/ragService.js";
import * as calendarService from "./services/calendarService.js";
import * as documentService from "./services/documentService.js";
import * as noteService from "./services/noteService.js";
import * as resourceService from "./services/resourceService.js";
import * as tagService from "./services/tagService.js";
import * as taskService from "./services/taskService.js";

getFirestore(); // fail fast if Firebase not configured

function handleServiceError(err: unknown, res: express.Response): void {
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
}

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
      const docs = await documentService.listDocuments(userId);
      res.json(docs.map((d) => ({ id: d.id, name: d.name, content: d.content, type: d.type, created_at: d.created_at })));
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.get("/api/notes", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    try {
      const notes = await noteService.listNotes(userId);
      res.json(notes.map((n) => ({ id: n.id, title: n.title, content: n.content, created_at: n.created_at })));
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.post("/api/notes", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { title, content } = req.body;
    try {
      const result = await noteService.createNote(userId, { title, content });
      res.json(result);
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.put("/api/notes/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.uid!;
    const { title, content } = req.body;
    try {
      await noteService.updateNote(userId, id, { title, content });
      res.json({ success: true });
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.delete("/api/notes/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.uid!;
    try {
      await noteService.deleteNote(userId, id);
      res.json({ success: true });
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.get("/api/resources", authMiddleware, async (req, res) => {
    try {
      const userId = req.uid!;
      const resources = await resourceService.getResources(userId);
      res.json(resources);
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.post("/api/resources", authMiddleware, async (req, res) => {
    try {
      const userId = req.uid!;
      const { description, url, tags } = req.body;
      if (!description || typeof description !== "string" || !url || typeof url !== "string") {
        res.status(400).json({ error: "description and url are required" });
        return;
      }
      const resource = await resourceService.addResource(userId, {
        description: description.trim(),
        url: url.trim(),
        tags: Array.isArray(tags) ? tags : tags != null ? [String(tags)] : undefined,
      });
      res.status(201).json(resource);
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.delete("/api/resources/:resourceId", authMiddleware, async (req, res) => {
    try {
      const { resourceId } = req.params;
      const userId = req.uid!;
      await resourceService.deleteResource(userId, resourceId);
      res.status(204).send();
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.put("/api/resources/:resourceId", authMiddleware, async (req, res) => {
    try {
      const { resourceId } = req.params;
      const userId = req.uid!;
      const { title, tags } = req.body;
      if (title === undefined && tags === undefined) {
        res.status(400).json({ error: "title or tags is required" });
        return;
      }
      const data: { title?: string; tags?: string[] } = {};
      if (title !== undefined) data.title = typeof title === "string" ? title.trim() : String(title).trim();
      if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : [String(tags)];
      await resourceService.updateResource(userId, resourceId, data);
      res.json({ success: true });
    } catch (err) {
      handleServiceError(err, res);
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
      const result = await documentService.ingestDocument(userId, { name, content, type });
      res.json(result);
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.post("/api/chat", authMiddleware, async (req, res) => {
    const { message, lang = "en" } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const userId = req.uid!;
    try {
      const result = await ragService.query(userId, { message, lang });
      res.json(result);
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.delete("/api/documents/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.uid!;
    try {
      await documentService.deleteDocument(userId, id);
      res.json({ success: true });
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  // Calendar events
  app.get("/api/calendar/events", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    try {
      const events = await calendarService.getCalendarEvents(userId, { startDate, endDate });
      res.json(events);
    } catch (err) {
      handleServiceError(err, res);
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
      const event = await calendarService.createCalendarEvent(userId, {
        date,
        start_minutes: Number(start_minutes) ?? 0,
        duration_minutes: Number(duration_minutes),
        title: title ?? "",
        tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
        color: color ?? "#3B82F6",
      });
      res.json(event);
    } catch (err) {
      handleServiceError(err, res);
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
      await calendarService.updateCalendarEvent(userId, id, {
        date: body.date,
        start_minutes: body.start_minutes,
        duration_minutes: body.duration_minutes,
        title: body.title,
        tags: body.tags,
        color: body.color,
      });
      res.json({ success: true });
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.delete("/api/calendar/events/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    try {
      await calendarService.deleteCalendarEvent(userId, id);
      res.json({ success: true });
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  // Tasks (to-do)
  app.get("/api/tasks", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    try {
      const tasks = await taskService.getTasks(userId);
      res.json(tasks);
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.post("/api/tasks", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { title, description, status, due_date, priority } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title required" });
    }
    try {
      const task = await taskService.createTask(userId, {
        title,
        description: description ?? "",
        status: status ?? "todo",
        due_date: due_date ?? null,
        priority: priority ?? null,
      });
      res.json(task);
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.put("/api/tasks/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    const { title, description, status, due_date, priority } = req.body;
    try {
      await taskService.updateTask(userId, id, {
        title,
        description,
        status,
        due_date,
        priority,
      });
      res.json({ success: true });
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    try {
      await taskService.deleteTask(userId, id);
      res.json({ success: true });
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  // User tags (tag + default title for calendar entries)
  app.get("/api/tags", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    try {
      const list = await tagService.getUserTags(userId);
      res.json(list);
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.post("/api/tags", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { tag, title, color } = req.body;
    if (!tag || typeof tag !== "string" || !tag.trim()) {
      return res.status(400).json({ error: "tag required" });
    }
    try {
      const created = await tagService.createUserTag(userId, {
        tag: tag.trim(),
        title: typeof title === "string" ? title.trim() : "",
        color: typeof color === "string" ? color.trim() || undefined : undefined,
      });
      res.json(created);
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.put("/api/tags/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    const { tag, title, color } = req.body;
    try {
      await tagService.updateUserTag(userId, id, {
        tag: typeof tag === "string" ? tag.trim() : undefined,
        title: typeof title === "string" ? title.trim() : undefined,
        color: color !== undefined ? (typeof color === "string" ? color.trim() || null : null) : undefined,
      });
      res.json({ success: true });
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  app.delete("/api/tags/:id", authMiddleware, async (req, res) => {
    const userId = req.uid!;
    const { id } = req.params;
    try {
      await tagService.deleteUserTag(userId, id);
      res.json({ success: true });
    } catch (err) {
      handleServiceError(err, res);
    }
  });

  // Plan AI: time summary by tag + add events from natural language
  app.post("/api/plan/ask", authMiddleware, async (req, res) => {
    const { message, lang = "en" } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message required" });
    }
    const userId = req.uid!;
    try {
      const result = await planService.ask(userId, { message, lang });
      res.json(result);
    } catch (err) {
      handleServiceError(err, res);
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
