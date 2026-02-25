import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatDuration, CALENDAR_COLORS } from "./calendarConstants";
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

type TranslationDict = Record<string, string | string[]>;

interface ActivityLogProps {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  lang: "en" | "pl";
  t: TranslationDict;
  userTags?: UserTag[];
}

export function ActivityLog({ apiFetch, lang, t, userTags = [] }: ActivityLogProps) {
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

  const tagHours = useMemo(() => {
    const byTag = new Map<string, number>();
    for (const ev of events) {
      for (const tag of ev.tags) {
        if (!tag.trim()) continue;
        const prev = byTag.get(tag) ?? 0;
        byTag.set(tag, prev + ev.duration_minutes);
      }
    }
    const arr = Array.from(byTag.entries()).map(([tag, minutes]) => ({
      tag,
      hours: Math.round((minutes / 60) * 10) / 10,
    }));
    arr.sort((a, b) => b.hours - a.hours);
    return arr;
  }, [events]);

  const tagToColor = useMemo(() => {
    const map = new Map<string, string>();
    let idx = 0;
    for (const u of userTags) {
      if (u.tag) map.set(u.tag, u.color || CALENDAR_COLORS[idx % CALENDAR_COLORS.length]);
      idx++;
    }
    return map;
  }, [userTags]);

  const maxHours = useMemo(() => {
    if (tagHours.length === 0) return 5;
    const max = Math.max(...tagHours.map((d) => d.hours));
    return Math.ceil(max / 2.5) * 2.5;
  }, [tagHours]);

  const xAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= maxHours; v += 1.25) ticks.push(v);
    return ticks;
  }, [maxHours]);

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
    noTags: (t.activityNoTags as string) ?? "No tags in the selected period.",
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
      <div className="flex-1 overflow-auto p-6 flex gap-6 min-h-0">
        {loading ? (
          <div className="text-[#6B7280]">Loading…</div>
        ) : events.length === 0 ? (
          <p className="text-[#9CA3AF] font-medium">{labels.noEntries}</p>
        ) : (
          <>
            <ul className="flex-[2_2_0%] min-w-0 space-y-1.5 overflow-auto pr-2">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center gap-3 py-2 px-3 bg-white border border-[#E5E7EB] rounded-xl"
                >
                  <div
                    className="w-2 h-5 rounded flex-shrink-0"
                    style={{ backgroundColor: ev.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight">{ev.title}</p>
                    <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mt-0.5 leading-tight">
                      {ev.date} · {formatTime(ev.start_minutes)} · {formatDuration(ev.duration_minutes)}
                      {ev.tags.length > 0 && ` · ${ev.tags.map((tag) => `#${tag}`).join(" ")}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex-[3_3_0%] min-w-0 flex flex-col bg-white border border-[#E5E7EB] rounded-xl p-4">
              {tagHours.length === 0 ? (
                <p className="text-[#9CA3AF] font-medium text-sm">{labels.noTags}</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(140, tagHours.length * 28)}>
                    <BarChart
                      data={tagHours}
                      layout="vertical"
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        type="number"
                        domain={[0, maxHours]}
                        ticks={xAxisTicks}
                        stroke="#6B7280"
                        fontSize={12}
                      />
                      <YAxis
                        type="category"
                        dataKey="tag"
                        tickFormatter={(v) => `#${v}`}
                        width={100}
                        stroke="#6B7280"
                        fontSize={12}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value} h`, "Godziny"]}
                        labelFormatter={(label) => `#${label}`}
                      />
                      <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={24}>
                        {tagHours.map((entry) => (
                          <Cell key={entry.tag} fill={tagToColor.get(entry.tag) ?? "#3B82F6"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex flex-wrap gap-x-6 gap-y-2">
                    {tagHours.map(({ tag, hours }) => (
                      <div key={tag} className="flex items-center gap-2 text-sm">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tagToColor.get(tag) ?? "#3B82F6" }}
                        />
                        <span className="font-medium text-[#374151]">#{tag}</span>
                        <span className="text-[#6B7280]">{hours} h</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
