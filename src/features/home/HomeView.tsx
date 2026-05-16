// src/features/home/HomeView.tsx
"use client";
import React, { useEffect, useState } from "react";
import type { translations } from "@/src/translations";
import { ActivityLog } from "@/src/components/ActivityLog";

type T = (typeof translations)["en"];

interface KnowledgeNode {
  id: string;
  type: "note" | "task" | "resource" | "chat" | "document" | "event";
  title: string;
  content: string;
  dueDate?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface HomeViewProps {
  user: User | null;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  lang: "en" | "pl";
  t: T;
  setAppMode: (mode: "home" | "wiedza" | "planowanie") => void;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function in48hISO() {
  const d = new Date();
  d.setHours(d.getHours() + 48);
  return d.toISOString().split("T")[0];
}

export default function HomeView({ user, apiFetch, lang, t, setAppMode }: HomeViewProps) {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/knowledge/nodes")
      .then((r) => r.json())
      .then((data) => setNodes(Array.isArray(data) ? data : []))
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const today = todayISO();
  const limit48h = in48hISO();

  const todayTasks = nodes.filter(
    (n) => n.type === "task" && n.dueDate && n.dueDate.startsWith(today)
  );
  const upcomingEvents = nodes.filter(
    (n) => n.type === "event" && n.dueDate && n.dueDate >= today && n.dueDate <= limit48h
  );
  const notesCount = nodes.filter((n) => n.type === "note").length;

  const greeting = `${t.homeGreeting}, ${user?.name?.split(" ")[0] ?? ""}`;
  const dateStr = new Date().toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg)]">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-[var(--text)]">{greeting} 👋</h2>
        <p className="text-sm text-[var(--text2)] mt-1">{dateStr}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t.homeTodayTasks, value: todayTasks.length, color: "var(--accent)" },
          { label: t.homeUpcoming, value: upcomingEvents.length, color: "var(--green)" },
          { label: lang === "pl" ? "Notatki" : "Notes", value: notesCount, color: "var(--text2)" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4"
          >
            <p className="text-2xl font-bold" style={{ color }}>
              {loading ? "—" : value}
            </p>
            <p className="text-xs text-[var(--text2)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Today's tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text2)]">
            {t.homeTodayTasks}
          </h3>
          <button
            onClick={() => setAppMode("planowanie")}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            {t.homeShowAll}
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--text3)]">…</p>
        ) : todayTasks.length === 0 ? (
          <p className="text-sm text-[var(--text3)]">{t.homeNoTasks}</p>
        ) : (
          <ul className="space-y-2">
            {todayTasks.slice(0, 5).map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl"
              >
                <div className="w-4 h-4 rounded border-2 border-[var(--accent)] flex-shrink-0" />
                <span className="text-sm text-[var(--text)] flex-1">{task.title}</span>
                <span className="text-xs text-[var(--accent)]">{task.dueDate}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming events */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text2)] mb-3">
          {t.homeUpcoming}
        </h3>
        {loading ? (
          <p className="text-sm text-[var(--text3)]">…</p>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-sm text-[var(--text3)]">{t.homeNoEvents}</p>
        ) : (
          <ul className="space-y-2">
            {upcomingEvents.slice(0, 3).map((ev) => (
              <li
                key={ev.id}
                className="flex items-center gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl"
              >
                <div className="w-2 h-2 rounded-full bg-[var(--green)] flex-shrink-0" />
                <span className="text-sm text-[var(--text)] flex-1">{ev.title}</span>
                <span className="text-xs text-[var(--text2)]">{ev.dueDate}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text2)] mb-3">
          {t.homeQuickActions}
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: t.homeAddNote, action: () => setAppMode("wiedza") },
            { label: t.homeAddTask, action: () => setAppMode("planowanie") },
            { label: t.homeAskAI, action: () => setAppMode("wiedza") },
            { label: t.homeSearch, action: () => setAppMode("wiedza") },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity log */}
      <div>
        <ActivityLog apiFetch={apiFetch} lang={lang} t={t as Record<string, string | string[]>} />
      </div>
    </div>
  );
}
