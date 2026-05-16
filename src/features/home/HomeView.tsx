// src/features/home/HomeView.tsx
"use client";
import React, { useCallback, useEffect, useState } from "react";
import type { translations } from "@/src/translations";
import { ActivityLog } from "@/src/components/ActivityLog";
import type { UserTag } from "@/src/components/TagsSection";
import { StartSessionModal } from "@/src/components/StartSessionModal";
import {
  getActiveSession,
  setActiveSession,
  clearActiveSession,
  type ActiveSession,
} from "@/src/lib/activeSession";
import {
  AppSidebar,
  type AppSidebarUser,
  type AppSidebarTranslations,
} from "@/src/components/layout/AppSidebar";
import { AppHeader } from "@/src/components/layout/AppHeader";

type T = (typeof translations)["en"];

interface KnowledgeNode {
  id: string;
  type: "note" | "task" | "resource" | "chat" | "document" | "event";
  title: string;
  content: string;
  dueDate?: string;
}

interface HomeViewProps {
  user: AppSidebarUser | null;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  lang: "en" | "pl";
  t: T;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  appMode: "home" | "wiedza" | "planowanie";
  setAppMode: (mode: "home" | "wiedza" | "planowanie") => void;
  onLogout: () => void;
  setLang: (lang: "en" | "pl") => void;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function in48hISO() {
  const d = new Date();
  d.setHours(d.getHours() + 48);
  return d.toISOString().split("T")[0];
}

export default function HomeView({
  user,
  apiFetch,
  lang,
  t,
  isSidebarOpen,
  setIsSidebarOpen,
  appMode,
  setAppMode,
  onLogout,
  setLang,
}: HomeViewProps) {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [activeSession, setActiveSessionState] = useState<ActiveSession | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionEndError, setSessionEndError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/knowledge/nodes")
      .then((r) => r.json())
      .then((data) => setNodes(Array.isArray(data) ? data : []))
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  useEffect(() => {
    apiFetch("/api/tags")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUserTags(Array.isArray(data) ? data : []))
      .catch(() => setUserTags([]));
  }, [apiFetch]);

  useEffect(() => {
    if (user?.id) setActiveSessionState(getActiveSession(user.id));
  }, [user?.id]);

  const handleStartSession = useCallback(
    (payload: { title: string; tags: string[]; color: string }) => {
      if (!user?.id) return;
      const session: ActiveSession = {
        title: payload.title,
        startedAt: new Date().toISOString(),
        tags: payload.tags,
        color: payload.color,
      };
      setActiveSessionState(session);
      setActiveSession(user.id, session);
    },
    [user?.id]
  );

  const handleEndSession = useCallback(async () => {
    if (!activeSession || !user?.id) return;
    setSessionEndError(null);
    const started = new Date(activeSession.startedAt);
    const now = Date.now();
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const startMinutes = Math.floor((started.getHours() * 60 + started.getMinutes()) / 15) * 15;
    const durationMinutes = Math.ceil((now - started.getTime()) / (15 * 60 * 1000)) * 15;
    try {
      const res = await apiFetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          start_minutes: startMinutes,
          duration_minutes: durationMinutes,
          title: activeSession.title,
          tags: activeSession.tags,
          color: activeSession.color,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setActiveSessionState(null);
      clearActiveSession(user.id);
    } catch (err) {
      setSessionEndError(err instanceof Error ? err.message : "Failed to save");
    }
  }, [activeSession, user?.id, apiFetch]);

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

  const sidebarT: AppSidebarTranslations = {
    title: t.title,
    subtitle: t.subtitle,
    logout: t.logout,
    proPlan: t.proPlan,
    docsLimit: t.docsLimit,
  };

  return (
    <>
      <AppSidebar
        isSidebarOpen={isSidebarOpen}
        lang={lang}
        setLang={setLang}
        user={user}
        onLogout={onLogout}
        documentsCount={0}
        t={sidebarT}
        onGoHome={() => setAppMode("home")}
        activeMode={appMode}
      >
        {null}
      </AppSidebar>

      <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
        <AppHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          appMode={appMode}
          setAppMode={setAppMode}
          t={{
            modeWiedza: t.modeWiedza,
            modePlanowanie: t.modePlanowanie,
            brainActive: t.brainActive,
            searchPlaceholder: t.searchPlaceholder,
            feedback: t.feedback,
          }}
        />
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
              {
                label: lang === "pl" ? "Notatki" : "Notes",
                value: notesCount,
                color: "var(--text2)",
              },
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
            <ActivityLog
              apiFetch={apiFetch}
              lang={lang}
              t={t as Record<string, string | string[]>}
              userTags={userTags}
              activeSession={activeSession}
              onStartSession={() => setSessionModalOpen(true)}
              onEndSession={handleEndSession}
            />
          </div>

          {sessionModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--bg2)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-base font-bold text-[var(--text)] mb-4">
                  {lang === "pl" ? "Rozpocznij sesję pracy" : "Start work session"}
                </h3>
                <StartSessionModal
                  existingTags={userTags.map((u) => u.tag)}
                  tagTitles={Object.fromEntries(userTags.map((u) => [u.tag, u.title ?? u.tag]))}
                  tagColors={Object.fromEntries(userTags.map((u) => [u.tag, u.color]))}
                  onSubmit={(payload) => {
                    handleStartSession(payload);
                    setSessionModalOpen(false);
                  }}
                  onCancel={() => setSessionModalOpen(false)}
                  submitLabel={lang === "pl" ? "Rozpocznij" : "Start"}
                  cancelLabel={lang === "pl" ? "Anuluj" : "Cancel"}
                  titleLabel={lang === "pl" ? "Tytuł" : "Title"}
                  tagsLabel={lang === "pl" ? "Tagi" : "Tags"}
                  tagPlaceholder={lang === "pl" ? "Dodaj tag..." : "Add tag..."}
                  suggestionsLabel={lang === "pl" ? "Ostatnie tagi" : "Recent tags"}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
