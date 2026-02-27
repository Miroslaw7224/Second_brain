import React, { useState, useEffect } from "react";
import { Plus, Trash2, Check, Circle, ChevronUp, ChevronDown } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  priority: number | null;
  order?: number;
  created_at?: string;
  updated_at?: string;
}

type TranslationDict = Record<string, string | string[]>;

interface TasksSectionProps {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  lang: "en" | "pl";
  t: TranslationDict;
}

export function TasksSection({ apiFetch, lang, t }: TasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setTasks(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setTasks([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiFetch]);

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const res = await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const task = await res.json();
      setTasks((prev) => [task, ...prev]);
      setNewTitle("");
    } catch (err) {
      console.error("Add task failed", err);
    }
  };

  const updateStatus = async (id: string, status: Task["status"]) => {
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch (err) {
      console.error("Update task failed", err);
    }
  };

  const updateTitle = async (id: string) => {
    if (editingId !== id || editTitle.trim() === "") {
      setEditingId(null);
      return;
    }
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title: editTitle.trim() } : t)));
      setEditingId(null);
      setEditTitle("");
    } catch (err) {
      console.error("Update task failed", err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Delete task failed", err);
    }
  };

  const orderedIds = tasks.map((t) => t.id);

  const moveTask = async (taskId: string, direction: "up" | "down") => {
    const i = orderedIds.indexOf(taskId);
    if (i < 0) return;
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[i], next[j]] = [next[j], next[i]];
    try {
      await apiFetch("/api/tasks/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: next }),
      });
      setTasks((prev) => {
        const byId = new Map(prev.map((t) => [t.id, t]));
        return next.map((id) => byId.get(id)!).filter(Boolean);
      });
    } catch (err) {
      console.error("Reorder failed", err);
    }
  };

  const labels = {
    addPlaceholder: (t.tasksNewPlaceholder as string) ?? "New task...",
    todo: (t.tasksTodo as string) ?? "To do",
    inProgress: (t.tasksInProgress as string) ?? "In progress",
    done: (t.tasksDone as string) ?? "Done",
    noTasks: (t.tasksNoTasks as string) ?? "No tasks. Add your first.",
    moveUp: (t.tasksMoveUp as string) ?? "Move up",
    moveDown: (t.tasksMoveDown as string) ?? "Move down",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]">
      <div className="p-6 border-b border-[#E5E7EB] bg-white">
        <div className="max-w-2xl flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder={labels.addPlaceholder}
            className="flex-1 px-4 py-3 bg-[#F3F4F6] border-none rounded-xl text-base focus:ring-2 focus:ring-black"
          />
          <button
            onClick={addTask}
            className="flex items-center gap-2 px-4 py-3 bg-black text-white rounded-xl text-base font-semibold"
          >
            <Plus className="w-4 h-4" />
            {(t.tasksAdd as string) ?? "Add"}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 flex flex-col min-h-0">
        {loading ? (
          <div className="text-[#6B7280] text-base">Loading…</div>
        ) : tasks.length === 0 ? (
          <p className="text-[#9CA3AF] font-medium text-base">{labels.noTasks}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-w-0 w-full content-start">
            <div className="flex flex-col min-w-0 flex-1">
              <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-3">{labels.todo}</h3>
              <ul className="space-y-0.5 flex-1">
                {tasks
                  .filter((task) => task.status !== "done")
                  .map((task) => {
                    const idx = orderedIds.indexOf(task.id);
                    const canMoveUp = idx > 0;
                    const canMoveDown = idx >= 0 && idx < orderedIds.length - 1;
                    return (
                    <li
                      key={task.id}
                      className="flex items-center gap-1.5 py-1 px-2 bg-white border border-[#E5E7EB] rounded-lg"
                    >
                      <div className="flex flex-col flex-shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveTask(task.id, "up")}
                          disabled={!canMoveUp}
                          className="p-0.5 rounded hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed"
                          title={labels.moveUp}
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-[#6B7280]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTask(task.id, "down")}
                          disabled={!canMoveDown}
                          className="p-0.5 rounded hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed"
                          title={labels.moveDown}
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateStatus(task.id, "done")}
                        className="flex-shrink-0 p-0.5 rounded-full hover:bg-[#F3F4F6]"
                        title={labels.done}
                      >
                        <Circle className="w-4 h-4 text-[#9CA3AF]" />
                      </button>
                      {editingId === task.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => updateTitle(task.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") updateTitle(task.id);
                            if (e.key === "Escape") { setEditingId(null); setEditTitle(""); }
                          }}
                          className="flex-1 px-2 py-0.5 border border-[#E5E7EB] rounded text-sm min-w-0"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}
                          className="flex-1 text-left text-sm font-medium min-w-0 truncate"
                        >
                          {task.title}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                    );
                  })}
              </ul>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <ul className="space-y-0.5 flex-1">
                {tasks
                  .filter((task) => task.status === "done")
                  .map((task) => {
                    const idx = orderedIds.indexOf(task.id);
                    const canMoveUp = idx > 0;
                    const canMoveDown = idx >= 0 && idx < orderedIds.length - 1;
                    return (
                    <li
                      key={task.id}
                      className="flex items-center gap-1.5 py-1 px-2 bg-white border border-[#E5E7EB] rounded-lg opacity-90"
                    >
                      <div className="flex flex-col flex-shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveTask(task.id, "up")}
                          disabled={!canMoveUp}
                          className="p-0.5 rounded hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed"
                          title={labels.moveUp}
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-[#6B7280]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTask(task.id, "down")}
                          disabled={!canMoveDown}
                          className="p-0.5 rounded hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed"
                          title={labels.moveDown}
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateStatus(task.id, "todo")}
                        className="flex-shrink-0 p-0.5 rounded-full hover:bg-[#F3F4F6]"
                        title={labels.todo}
                      >
                        <Check className="w-4 h-4 text-emerald-500" />
                      </button>
                      {editingId === task.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => updateTitle(task.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") updateTitle(task.id);
                            if (e.key === "Escape") { setEditingId(null); setEditTitle(""); }
                          }}
                          className="flex-1 px-2 py-0.5 border border-[#E5E7EB] rounded text-sm min-w-0"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}
                          className="flex-1 text-left text-sm font-medium min-w-0 truncate line-through text-[#9CA3AF]"
                        >
                          {task.title}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
