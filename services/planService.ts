import * as firestoreDb from "../lib/firestore-db.js";
import { generateContent } from "../lib/gemini.js";

const RAG_PLAN_MODEL = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION_PL = `Jesteś asystentem planowania. Masz listę wpisów kalendarza użytkownika (data, godzina, czas w min, tytuł, tagi).
Zadania:
1) Gdy użytkownik pyta ile czasu poświęcił na coś (np. "ile czasu na testy w tym tygodniu", "sprawdź czas na #nauka") - policz sumę duration_minutes z wpisów pasujących do tagu/okresu i odpowiedz jednym zdaniem po polsku (np. "W tym tygodniu: 8h na #testy").
2) Gdy użytkownik mówi że ma coś do zrobienia (np. "mam do zrobienia w tym tygodniu testy modułu auth", "mam 3 dni na zrobienie testów auth") - zwróć TYLKO poprawny JSON bez markdown, w formacie:
{"action":"add_events","events":[{"title":"...","tags":["tag1"],"dates":["YYYY-MM-DD"],"duration_minutes":60,"start_minutes":540}]}
- start_minutes: 540 = 9:00. dates: jeden dzień = jeden blok; jeśli "3 dni" podaj 3 daty (np. następne 3 dni robocze). "w tym tygodniu" = jeden dzień (np. piątek).`;

const SYSTEM_INSTRUCTION_EN = `You are a planning assistant. You have the user's calendar events (date, time, duration_minutes, title, tags).
Tasks:
1) If the user asks how much time they spent on something (e.g. "how much time on tests this week", "check time on #learning") - sum duration_minutes from matching events and reply in one sentence.
2) If the user says they have something to do (e.g. "I have to do auth module tests this week", "I have 3 days to do auth tests") - return ONLY valid JSON, no markdown:
{"action":"add_events","events":[{"title":"...","tags":["tag1"],"dates":["YYYY-MM-DD"],"duration_minutes":60,"start_minutes":540}]}
- start_minutes: 540 = 9:00. dates: one date = one block; if "3 days" give 3 dates. "this week" = one day (e.g. Friday).`;

export async function ask(
  userId: string,
  params: { message: string; lang?: string }
): Promise<{ text: string; created?: number }> {
  const { message, lang = "en" } = params;
  const now = new Date();
  const past = new Date(now);
  past.setDate(past.getDate() - 60);
  const future = new Date(now);
  future.setDate(future.getDate() + 60);
  const startDate = past.toISOString().slice(0, 10);
  const endDate = future.toISOString().slice(0, 10);

  const events = await firestoreDb.getCalendarEvents(userId, { startDate, endDate });
  const eventsContext = events
    .map(
      (e) =>
        `- ${e.date} ${Math.floor(e.start_minutes / 60)}:${String(e.start_minutes % 60).padStart(2, "0")} ${e.duration_minutes}min "${e.title}" tags:${(e.tags || []).join(",")}`
    )
    .join("\n");

  const systemInstruction = lang === "pl" ? SYSTEM_INSTRUCTION_PL : SYSTEM_INSTRUCTION_EN;
  const text = await generateContent({
    model: RAG_PLAN_MODEL,
    contents: `User calendar events:\n${eventsContext}\n\nUser message: ${message}`,
    systemInstruction,
  });

  const jsonMatch = text.match(/\{[\s\S]*"action"\s*:\s*"add_events"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]) as { action?: string; events?: Array<{ title?: string; tags?: string[]; dates?: string[]; date?: string; duration_minutes?: number; start_minutes?: number; color?: string }> };
      if (data.action === "add_events" && Array.isArray(data.events)) {
        const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];
        let created = 0;
        for (const ev of data.events) {
          const dates = ev.dates ?? (ev.date ? [ev.date] : []);
          const title = ev.title ?? "Task";
          const tags = Array.isArray(ev.tags) ? ev.tags : [];
          const d = Number(ev.duration_minutes) ?? 60;
          const duration = Math.max(15, Math.round(d / 15) * 15);
          const startMin = Number(ev.start_minutes) ?? 540;
          const color = ev.color ?? colors[created % colors.length];
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
        const replyText =
          lang === "pl" ? `Dodano ${created} wpis(ów) do kalendarza.` : `Added ${created} event(s) to calendar.`;
        return { text: replyText, created };
      }
    } catch {
      // fall through to return raw text
    }
  }

  return { text };
}
