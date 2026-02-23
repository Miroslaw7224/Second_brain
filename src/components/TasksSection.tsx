import React, { useState, useEffect } from "react";
import { Plus, Trash2, Check, Circle } from "lucide-react";
import { clsx } from "clsx";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  priority: number | null;
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

  const labels = {
    addPlaceholder: (t.tasksNewPlaceholder as string) ?? "New task...",
    todo: (t.tasksTodo as string) ?? "To do",
    inProgress: (t.tasksInProgress as string) ?? "In progress",
    done: (t.tasksDone as string) ?? "Done",
    noTasks: (t.tasksNoTasks as string) ?? "No tasks. Add your first.",
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
            className="flex-1 px-4 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-black"
          />
          <button
            onClick={addTask}
            className="flex items-center gap-2 px-4 py-3 bg-black text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            {(t.tasksAdd as string) ?? "Add"}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-[#6B7280]">Loading…</div>
        ) : tasks.length === 0 ? (
          <p className="text-[#9CA3AF] font-medium">{labels.noTasks}</p>
        ) : (
          <ul className="space-y-2 max-w-2xl">
            {tasks.map((task) => (
              <li
                key={task.id}
                className={clsx(
                  "flex items-center gap-3 p-4 bg-white border border-[#E5E7EB] rounded-xl",
                  task.status === "done" && "opacity-75"
                )}
              >
                <button
                  type="button"
                  onClick={() => updateStatus(task.id, task.status === "done" ? "todo" : "done")}
                  className="flex-shrink-0 p-0.5 rounded-full hover:bg-[#F3F4F6]"
                >
                  {task.status === "done" ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#9CA3AF]" />
                  )}
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
                    className="flex-1 px-2 py-1 border border-[#E5E7EB] rounded text-sm"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}
                    className={clsx(
                      "flex-1 text-left text-sm font-medium",
                      task.status === "done" && "line-through text-[#9CA3AF]"
                    )}
                  >
                    {task.title}
                  </button>
                )}
                <span className="text-[10px] text-[#9CA3AF] uppercase font-bold">
                  {task.status === "todo" ? labels.todo : task.status === "in_progress" ? labels.inProgress : labels.done}
                </span>
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
