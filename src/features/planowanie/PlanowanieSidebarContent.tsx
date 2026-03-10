import React from "react";
import { Calendar, Briefcase, ListTodo, Tag } from "lucide-react";
import { cn } from "@/src/lib/cn";

export interface PlanowanieSidebarContentProps {
  planningTab: "calendar" | "activity" | "tasks" | "tags";
  setPlanningTab: (tab: "calendar" | "activity" | "tasks" | "tags") => void;
  modePlanowanie: string;
  tabCalendar: string;
  tabActivity: string;
  tabTasks: string;
  tabTags: string;
}

export function PlanowanieSidebarContent({
  planningTab,
  setPlanningTab,
  modePlanowanie,
  tabCalendar,
  tabActivity,
  tabTasks,
  tabTags,
}: PlanowanieSidebarContentProps) {
  const tabClass = (tab: "calendar" | "activity" | "tasks" | "tags") =>
    cn(
      "w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left",
      planningTab === tab
        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
        : "bg-[var(--surface)] border-transparent hover:bg-[var(--bg2)] hover:border-[var(--bg3)]"
    );

  return (
    <div>
      <h2 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-widest mb-3 px-2">
        {modePlanowanie}
      </h2>
      <div className="space-y-1">
        <button onClick={() => setPlanningTab("calendar")} className={tabClass("calendar")}>
          <Calendar className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{tabCalendar}</span>
        </button>
        <button onClick={() => setPlanningTab("activity")} className={tabClass("activity")}>
          <Briefcase className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{tabActivity}</span>
        </button>
        <button onClick={() => setPlanningTab("tasks")} className={tabClass("tasks")}>
          <ListTodo className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{tabTasks}</span>
        </button>
        <button onClick={() => setPlanningTab("tags")} className={tabClass("tags")}>
          <Tag className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{tabTags}</span>
        </button>
      </div>
    </div>
  );
}
