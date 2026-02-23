import React, { useState, useEffect, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { CalendarEventForm, type CalendarEventFormData } from "./CalendarEventForm";
import { CALENDAR_COLORS, formatDuration } from "./calendarConstants";
import { clsx } from "clsx";
import type { UserTag } from "./TagsSection";

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
}

const MONTH_NAMES: Record<"pl" | "en", string[]> = {
  pl: ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const DAY_NAMES = { pl: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };

export function CalendarView({ apiFetch, lang, t, userTags = [] }: CalendarViewProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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
  }, [startDate, endDate, apiFetch]);

  const eventTags = Array.from(new Set(events.flatMap((e) => e.tags)));
  const userTagNames = userTags.map((u) => u.tag).filter(Boolean);
  const allTags = Array.from(new Set([...eventTags, ...userTagNames]));
  const tagTitles: Record<string, string> = {};
  for (const u of userTags) {
    if (u.tag && u.title) tagTitles[u.tag] = u.title;
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
    setModalOpen(true);
  };

  const handleOpenEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setAddDate(null);
    setModalOpen(true);
  };

  const handleSave = async (data: CalendarEventFormData) => {
    try {
      if (editingEvent) {
        await apiFetch(`/api/calendar/events/${editingEvent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await apiFetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      setModalOpen(false);
      setEditingEvent(null);
      setAddDate(null);
      setEvents((prev) => {
        const rest = prev.filter((e) => e.id !== editingEvent?.id);
        return rest;
      });
      const res = await apiFetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`);
      const data2 = await res.json();
      setEvents(Array.isArray(data2) ? data2 : []);
    } catch (err) {
      console.error("Save calendar event failed", err);
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

  const cellWidth = 80;
  const rowHeight = 44;
  const dayLabelWidth = 80;
  const totalWidth = dayLabelWidth + HOURS * cellWidth;
  const totalHeight = (days.length + 1) * rowHeight;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]">
      <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold min-w-[180px] text-center">
            {monthLabel} {viewYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
          <button
            onClick={() => { setAddDate(days[0]?.date ?? startDate); setEditingEvent(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            {(t.calendarAddEntry as string) ?? "Add entry"}
          </button>
      </div>

      <div
        className="flex-1 min-w-0 min-h-0 flex flex-col p-4"
        ref={gridRef}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64 text-[#6B7280]">Loading…</div>
        ) : (
          <div
            className="overflow-auto overflow-x-scroll overflow-y-auto w-full"
            style={{ maxWidth: "100%", flex: "1 1 0" }}
          >
            <div style={{ width: totalWidth, minWidth: totalWidth }}>
            {/* Header row: sticky at top when scrolling down */}
            <div className="flex border-b border-[#E5E7EB] bg-[#F9FAFB] sticky top-0 z-20 shadow-sm" style={{ height: rowHeight }}>
              <div className="flex-shrink-0 border-r border-[#E5E7EB] flex items-center px-2 text-xs font-bold text-[#9CA3AF] bg-[#F9FAFB] sticky left-0 z-30" style={{ width: dayLabelWidth }}>
                {(t.calendarDay as string) ?? "Day"}
              </div>
              <div className="flex bg-[#F9FAFB]">
                {Array.from({ length: HOURS }, (_, h) => (
                  <div
                    key={h}
                    className="border-r border-[#E5E7EB] text-[10px] text-[#9CA3AF] font-medium flex items-center justify-center flex-shrink-0"
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
              return (
                <div
                  key={day.date}
                  className="flex border-b border-[#E5E7EB] bg-white relative"
                  style={{ height: rowHeight }}
                >
                  <div
                    className="flex-shrink-0 border-r border-[#E5E7EB] flex items-center px-2 text-sm font-medium bg-[#F9FAFB] sticky left-0 z-10"
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
                          className="absolute rounded overflow-hidden cursor-pointer border border-white/50 shadow-sm flex items-center"
                          style={{
                            left: leftPx,
                            width: Math.max(24, widthPx),
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            backgroundColor: ev.color,
                          }}
                          title={`${ev.title} ${ev.tags.map((t) => `#${t}`).join(" ")} · ${formatDuration(ev.duration_minutes)}`}
                        >
                          <span className="truncate text-[10px] font-medium text-white px-1 drop-shadow">
                            {ev.title}
                          </span>
                        </div>
                      );
                    })}
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
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
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
                      color: editingEvent.color,
                    }
                  : addDate
                    ? { date: addDate, start_minutes: 9 * 60, duration_minutes: 60, title: "", tags: [], color: CALENDAR_COLORS[0] }
                    : undefined
              }
              existingTags={allTags}
              tagTitles={tagTitles}
              onSubmit={handleSave}
              onCancel={() => { setModalOpen(false); setEditingEvent(null); setAddDate(null); }}
              submitLabel={editingEvent ? ((t.calendarSave as string) ?? "Save") : ((t.calendarAddEntry as string) ?? "Add")}
            />
            {editingEvent && (
              <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
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
    </div>
  );
}
