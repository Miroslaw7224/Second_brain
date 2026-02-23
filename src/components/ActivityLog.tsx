import React, { useState, useEffect } from "react";
import { formatDuration } from "./calendarConstants";

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

type TranslationDict = Record<string, string | string[]>;

interface ActivityLogProps {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  lang: "en" | "pl";
  t: TranslationDict;
}

export function ActivityLog({ apiFetch, lang, t }: ActivityLogProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEvents(Array.isArray(data) ? data.sort((a: CalendarEvent, b: CalendarEvent) => a.date.localeCompare(b.date) || a.start_minutes - b.start_minutes) : []);
      })
      .catch(() => { if (!cancelled) setEvents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiFetch, startDate, endDate]);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const labels = {
    title: (t.activityTitle as string) ?? "What I did",
    from: (t.activityFrom as string) ?? "From",
    to: (t.activityTo as string) ?? "To",
    noEntries: (t.activityNoEntries as string) ?? "No entries in the selected period.",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]">
      <div className="p-6 border-b border-[#E5E7EB] bg-white">
        <h2 className="text-lg font-bold mb-4">{labels.title}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <span>{labels.from}</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-[#F3F4F6] border-none rounded-lg text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <span>{labels.to}</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-[#F3F4F6] border-none rounded-lg text-sm"
            />
          </label>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-[#6B7280]">Loading…</div>
        ) : events.length === 0 ? (
          <p className="text-[#9CA3AF] font-medium">{labels.noEntries}</p>
        ) : (
          <ul className="space-y-3 max-w-2xl">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center gap-4 p-4 bg-white border border-[#E5E7EB] rounded-xl"
              >
                <div
                  className="w-2 h-10 rounded flex-shrink-0"
                  style={{ backgroundColor: ev.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{ev.title}</p>
                  <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mt-0.5">
                    {ev.date} · {formatTime(ev.start_minutes)} · {formatDuration(ev.duration_minutes)}
                    {ev.tags.length > 0 && ` · ${ev.tags.map((t) => `#${t}`).join(" ")}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
