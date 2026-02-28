import React, { useState, useEffect, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2, Pencil, Play, Square } from "lucide-react";
import { CalendarEventForm, type CalendarEventFormData } from "./CalendarEventForm";
import { StartSessionModal } from "./StartSessionModal";
import { CALENDAR_COLORS, formatDuration } from "./calendarConstants";
import type { UserTag } from "./TagsSection";
import type { ActiveSession } from "@/src/lib/activeSession";

export interface CalendarEvent {
  id: string;
  date: string;
  start_minutes: number;
  duration_minutes: number;
  title: string;
  tags: string[];
  color: string;
  created_at?: string;
}

const HOURS = 24;
const MAX_STACK = 3;

function getDaysInMonth(year: number, month: number): { date: string; dayOfWeek: number; day: number }[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: { date: string; dayOfWeek: number; day: number }[] = [];
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      dayOfWeek: date.getDay(),
      day: d,
    });
  }
  return days;
}

function assignLanes(events: CalendarEvent[]): Map<string, number> {
  const lanes = new Map<string, number>();
  const sorted = [...events].sort((a, b) => a.start_minutes - b.start_minutes);
  for (const ev of sorted) {
    const end = ev.start_minutes + ev.duration_minutes;
    const used = new Set<number>();
    for (const other of sorted) {
      if (other.id === ev.id) continue;
      const oEnd = other.start_minutes + other.duration_minutes;
      if (ev.start_minutes < oEnd && other.start_minutes < end) {
        const L = lanes.get(other.id);
        if (L != null) used.add(L);
      }
    }
    let lane = 0;
    while (used.has(lane) && lane < MAX_STACK) lane++;
    lanes.set(ev.id, Math.min(lane, MAX_STACK - 1));
  }
  return lanes;
}

/** For each event, number of events that overlap with it (including itself). Used to scale bar height. */
function getOverlapCounts(events: CalendarEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ev of events) {
    const end = ev.start_minutes + ev.duration_minutes;
    let n = 0;
    for (const other of events) {
      const oEnd = other.start_minutes + other.duration_minutes;
      if (ev.start_minutes < oEnd && other.start_minutes < end) n++;
    }
    counts.set(ev.id, n);
  }
  return counts;
}

type TranslationDict = Record<string, string | string[]>;

interface CalendarViewProps {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  lang: "en" | "pl";
  t: TranslationDict;
  userTags?: UserTag[];
  /** Increment to force refetch of events (e.g. after plan/ask adds events). */
  refreshTrigger?: number;
  activeSession?: ActiveSession | null;
  onStartSession?: (payload: { title: string; tags: string[]; color: string }) => void;
  onEndSession?: () => void | Promise<void>;
  sessionEndError?: string | null;
  clearSessionEndError?: () => void;
}

const MONTH_NAMES: Record<"pl" | "en", string[]> = {
  pl: ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const DAY_NAMES = { pl: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };

export function CalendarView({
  apiFetch,
  lang,
  t,
  userTags = [],
  refreshTrigger,
  activeSession = null,
  onStartSession,
  onEndSession,
  sessionEndError = null,
  clearSessionEndError,
}: CalendarViewProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [startSessionModalOpen, setStartSessionModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const monthLabel = MONTH_NAMES[lang][viewMonth];
  const days = getDaysInMonth(viewYear, viewMonth);
  const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const endDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(days.length).padStart(2, "0")}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setEvents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startDate, endDate, apiFetch, refreshTrigger]);

  const eventTags = Array.from(new Set(events.flatMap((e) => e.tags)));
  const userTagNames = userTags.map((u) => u.tag).filter(Boolean);
  const allTags = Array.from(new Set([...eventTags, ...userTagNames]));
  const tagTitles: Record<string, string> = {};
  const tagColors: Record<string, string> = {};
  let colorIndex = 0;
  for (const u of userTags) {
    if (u.tag) {
      if (u.title) tagTitles[u.tag] = u.title;
      tagColors[u.tag] = u.color || CALENDAR_COLORS[colorIndex % CALENDAR_COLORS.length];
      colorIndex++;
    }
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleOpenAdd = (date: string) => {
    setAddDate(date);
    setEditingEvent(null);
    setSaveError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setAddDate(null);
    setSaveError(null);
    setModalOpen(true);
  };

  const handleSave = async (data: CalendarEventFormData) => {
    setSaveError(null);
    try {
      if (editingEvent) {
        const res = await apiFetch(`/api/calendar/events/${editingEvent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error((errBody as { error?: string }).error ?? `HTTP ${res.status}`);
        }
      } else {
        const res = await apiFetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error((errBody as { error?: string }).error ?? `HTTP ${res.status}`);
        }
      }
      setModalOpen(false);
      setEditingEvent(null);
      setAddDate(null);
      const res = await apiFetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`);
      const data2 = await res.json();
      setEvents(Array.isArray(data2) ? data2 : []);
    } catch (err) {
      console.error("Save calendar event failed", err);
      setSaveError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setModalOpen(false);
      setEditingEvent(null);
    } catch (err) {
      console.error("Delete calendar event failed", err);
    }
  };

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const cellWidth = 80;
  const rowHeight = 44;
  const dayLabelWidth = 80;
  const totalWidth = dayLabelWidth + HOURS * cellWidth;
  const totalHeight = (days.length + 1) * rowHeight;

  const formatSessionTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const sessionInProgressLabel = (t.sessionInProgressSince as string)?.replace("{time}", activeSession ? formatSessionTime(activeSession.startedAt) : "") ?? (activeSession ? `Work in progress since ${formatSessionTime(activeSession.startedAt)}` : "");

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-[var(--bg3)] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold min-w-[180px] text-center">
            {monthLabel} {viewYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-[var(--bg3)] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text3)] hidden sm:inline">
              {(t.calendarClickToEdit as string) ?? "Click an event to edit"}
            </span>
            {activeSession ? (
              <>
                <span className="text-sm font-medium text-[var(--text2)]">
                  {sessionInProgressLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onEndSession?.()}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--accent)] text-[var(--accent)] bg-transparent rounded-xl text-sm font-semibold hover:bg-[var(--accent-bg)]"
                >
                  <Square className="w-4 h-4" />
                  {(t.sessionEndButton as string) ?? "End work"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setStartSessionModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg3)] text-[var(--text)] border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--bg2)]"
              >
                <Play className="w-4 h-4" />
                {(t.sessionStartButton as string) ?? "Start work"}
              </button>
            )}
            <button
            onClick={() => { setAddDate(days[0]?.date ?? startDate); setEditingEvent(null); setSaveError(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            {(t.calendarAddEntry as string) ?? "Add entry"}
          </button>
          </div>
      </div>

      {sessionEndError && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center justify-between gap-2">
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {sessionEndError}
          </p>
          {clearSessionEndError && (
            <button
              type="button"
              onClick={clearSessionEndError}
              className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      <div
        className="flex-1 min-w-0 min-h-0 flex flex-col p-4"
        ref={gridRef}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64 text-[var(--text2)]">Loading…</div>
        ) : (
          <div
            className="overflow-auto overflow-x-scroll overflow-y-auto w-full"
            style={{ maxWidth: "100%", flex: "1 1 0" }}
          >
            <div style={{ width: totalWidth, minWidth: totalWidth }}>
            {/* Header row: sticky at top when scrolling down */}
            <div className="flex border-b border-[var(--border)] bg-[var(--bg2)] sticky top-0 z-20 shadow-sm" style={{ height: rowHeight }}>
              <div className="flex-shrink-0 border-r border-[var(--border)] flex items-center px-2 text-xs font-bold text-[var(--text3)] bg-[var(--bg2)] sticky left-0 z-30" style={{ width: dayLabelWidth }}>
                {(t.calendarDay as string) ?? "Day"}
              </div>
              <div className="flex bg-[var(--bg2)]">
                {Array.from({ length: HOURS }, (_, h) => (
                  <div
                    key={h}
                    className="border-r border-[var(--border)] text-[10px] text-[var(--text3)] font-medium flex items-center justify-center flex-shrink-0"
                    style={{ width: cellWidth, height: rowHeight }}
                  >
                    {h}
                  </div>
                ))}
              </div>
            </div>
            {/* Rows: one per day (vertical axis = days) */}
            {days.map((day) => {
              const dayEvents = events.filter((e) => e.date === day.date);
              const lanes = assignLanes(dayEvents);
              const overlapCounts = getOverlapCounts(dayEvents);
              const isToday = day.date === todayStr;
              return (
                <div
                  key={day.date}
                  className={`flex border-b border-[var(--border)] relative ${isToday ? "bg-[var(--accent-bg)] ring-1 ring-inset ring-[var(--accent)]" : "bg-[var(--surface)]"}`}
                  style={{ height: rowHeight }}
                >
                  <div
                    className={`flex-shrink-0 border-r border-[var(--border)] flex items-center px-2 text-sm font-medium sticky left-0 z-10 ${isToday ? "bg-[var(--accent-bg)] font-semibold text-[var(--accent)]" : "bg-[var(--bg2)]"}`}
                    style={{ width: dayLabelWidth }}
                  >
                    {day.day} {DAY_NAMES[lang][day.dayOfWeek]}
                  </div>
                  <div
                    className="flex-1 relative"
                    style={{ width: HOURS * cellWidth }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("[data-event]")) return;
                      setAddDate(day.date);
                      setEditingEvent(null);
                      setSaveError(null);
                      setModalOpen(true);
                    }}
                  >
                    {dayEvents.map((ev) => {
                      const lane = lanes.get(ev.id) ?? 0;
                      const stackSize = Math.max(1, Math.min(MAX_STACK, overlapCounts.get(ev.id) ?? 1));
                      const leftPx = (ev.start_minutes / 60) * cellWidth;
                      const widthPx = (ev.duration_minutes / 60) * cellWidth;
                      const heightPct = 100 / stackSize - 2;
                      const topPct = lane * (100 / stackSize);
                      return (
                        <div
                          key={ev.id}
                          data-event
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(ev); }}
                          className="absolute rounded overflow-hidden cursor-pointer border border-white/50 shadow-sm flex items-center gap-1 group hover:ring-2 hover:ring-white/80"
                          style={{
                            left: leftPx,
                            width: Math.max(24, widthPx),
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            backgroundColor: ev.color,
                          }}
                          title={`${ev.title} ${ev.tags.map((t) => `#${t}`).join(" ")} · ${formatDuration(ev.duration_minutes)} · ${(t.calendarClickToEdit as string) ?? "Click to edit"}`}
                        >
                          <span className="truncate text-[10px] font-medium text-white px-1 drop-shadow flex-1 min-w-0">
                            {ev.title}
                          </span>
                          <Pencil className="w-3 h-3 text-white/90 flex-shrink-0 opacity-70 group-hover:opacity-100 mr-1" aria-hidden />
                        </div>
                      );
                    })}
                    {activeSession && day.date === todayStr && (() => {
                      const started = new Date(activeSession.startedAt);
                      const sessionStartMinutes = started.getHours() * 60 + started.getMinutes();
                      const sessionEndMinutes = nowMinutes;
                      if (sessionEndMinutes <= sessionStartMinutes) return null;
                      const leftPx = (sessionStartMinutes / 60) * cellWidth;
                      const widthPx = Math.max(24, ((sessionEndMinutes - sessionStartMinutes) / 60) * cellWidth);
                      return (
                        <div
                          data-event
                          data-active-session
                          onClick={(e) => { e.stopPropagation(); onEndSession?.(); }}
                          className="absolute rounded overflow-hidden cursor-pointer border-2 border-dashed border-white/80 shadow-sm flex items-center gap-1 group hover:ring-2 hover:ring-white/80 z-10"
                          style={{
                            left: leftPx,
                            width: widthPx,
                            top: "2%",
                            height: "96%",
                            backgroundColor: activeSession.color,
                            opacity: 0.85,
                          }}
                          title={`${activeSession.title} · ${(t.sessionInProgressSince as string)?.replace("{time}", `${String(started.getHours()).padStart(2, "0")}:${String(started.getMinutes()).padStart(2, "0")}`) ?? "In progress"} – ${(t.sessionEndButton as string) ?? "End work"}`}
                        >
                          <span className="truncate text-[10px] font-medium text-white px-1 drop-shadow flex-1 min-w-0">
                            {activeSession.title}
                          </span>
                          <Square className="w-3 h-3 text-white/90 flex-shrink-0 opacity-70 group-hover:opacity-100 mr-1" aria-hidden />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">
              {editingEvent ? ((t.calendarEditEntry as string) ?? "Edit entry") : ((t.calendarNewEntry as string) ?? "New entry")}
            </h3>
            <CalendarEventForm
              initial={
                editingEvent
                  ? {
                      date: editingEvent.date,
                      start_minutes: editingEvent.start_minutes,
                      duration_minutes: editingEvent.duration_minutes,
                      title: editingEvent.title,
                      tags: editingEvent.tags,
                    }
                  : addDate
                    ? { date: addDate, start_minutes: 9 * 60, duration_minutes: 60, title: "", tags: [] }
                    : undefined
              }
              existingTags={allTags}
              tagTitles={tagTitles}
              tagColors={tagColors}
              onSubmit={handleSave}
              onCancel={() => { setModalOpen(false); setEditingEvent(null); setAddDate(null); setSaveError(null); }}
              submitLabel={editingEvent ? ((t.calendarSave as string) ?? "Save") : ((t.calendarAddEntry as string) ?? "Add")}
            />
            {saveError && (
              <p className="mt-3 text-sm text-red-500" role="alert">
                {saveError}
              </p>
            )}
            {editingEvent && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => handleDelete(editingEvent.id)}
                  className="flex items-center gap-2 text-red-500 text-sm font-medium hover:bg-red-50 px-3 py-2 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  {(t.calendarDeleteEntry as string) ?? "Delete entry"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {startSessionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">
              {(t.sessionModalTitle as string) ?? "Start work"}
            </h3>
            <StartSessionModal
              existingTags={allTags}
              tagTitles={tagTitles}
              tagColors={tagColors}
              onSubmit={(payload) => {
                onStartSession?.(payload);
                setStartSessionModalOpen(false);
              }}
              onCancel={() => setStartSessionModalOpen(false)}
              submitLabel={(t.sessionSubmitStart as string) ?? "Start work"}
              cancelLabel={(t.calendarCancel as string) ?? "Cancel"}
              titleLabel={(t.sessionModalTitleLabel as string) ?? "Title"}
              tagsLabel={(t.sessionModalTagsLabel as string) ?? "Tags"}
              tagPlaceholder={(t.sessionModalTagPlaceholder as string) ?? "#tag or pick below"}
              suggestionsLabel={(t.sessionModalSuggestionsLabel as string) ?? "Suggestions"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
