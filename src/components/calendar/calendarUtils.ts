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

const MAX_STACK = 3;

export function getDaysInMonth(
  year: number,
  month: number
): { date: string; dayOfWeek: number; day: number }[] {
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

export function assignLanes(events: CalendarEvent[]): Map<string, number> {
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
export function getOverlapCounts(events: CalendarEvent[]): Map<string, number> {
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

export const MONTH_NAMES: Record<"pl" | "en", string[]> = {
  pl: [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
};

export const DAY_NAMES: Record<"pl" | "en", string[]> = {
  pl: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export const CALENDAR_MAX_STACK = MAX_STACK;
