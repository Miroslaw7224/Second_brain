import React, { useRef, useState } from "react";
import { Send, Brain, Trash2 } from "lucide-react";
import { KnowledgeNodeType } from "@/types/knowledge";
import { ApiFetch } from "./useKnowledgeNodes";

const SAVE_KEYWORDS = [
  "zapamiętaj",
  "zapisz",
  "dodaj notatkę",
  "dodaj zadanie",
  "add note",
  "add task",
  "remember that",
  "save this",
];

function isSaveCommand(msg: string): boolean {
  const lower = msg.toLowerCase();
  return SAVE_KEYWORDS.some((k) => lower.includes(k));
}

const TYPE_COLORS: Record<KnowledgeNodeType, string> = {
  note: "bg-blue-500",
  task: "bg-orange-500",
  resource: "bg-green-500",
  chat: "bg-purple-500",
  document: "bg-gray-500",
  event: "bg-red-500",
};

const TYPE_LABELS: Record<KnowledgeNodeType, string> = {
  note: "Notatka",
  task: "Zadanie",
  resource: "Zasób",
  chat: "Chat",
  document: "Dokument",
  event: "Wydarzenie",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface PendingNode {
  type: KnowledgeNodeType;
  title: string;
  content: string;
  tags: string[];
  sources: Array<{ title: string; url?: string }>;
  dueDate?: string;
}

interface Props {
  apiFetch: ApiFetch;
  lang: "pl" | "en";
  onNodeSaved?: () => void;
}

export function KnowledgeChatPanel({ apiFetch, lang, onNodeSaved }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingNodes, setPendingNodes] = useState<PendingNode[]>([]);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const addMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || pendingNodes.length > 0) return;
    const msg = input.trim();
    setInput("");
    const history = messages.map(({ role, content }) => ({ role, content }));
    addMessage({ role: "user", content: msg });
    setIsLoading(true);

    try {
      if (isSaveCommand(msg)) {
        const res = await apiFetch("/api/knowledge/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPendingNodes(data.nodes ?? []);
        scrollToBottom();
      } else {
        const res = await apiFetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, lang, history }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        addMessage({ role: "assistant", content: data.text, sources: data.sources });
      }
    } catch {
      addMessage({
        role: "assistant",
        content:
          lang === "pl"
            ? "Wystąpił błąd. Spróbuj ponownie."
            : "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (pendingNodes.length === 0) return;
    setSaving(true);
    const saved: string[] = [];
    try {
      for (const node of pendingNodes) {
        const res = await apiFetch("/api/knowledge/nodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...node, createdBy: "ai" }),
        });
        if (res.ok) saved.push(node.title);
      }
      setPendingNodes([]);
      const summary =
        saved.length === 1
          ? `✅ ${lang === "pl" ? "Zapisano" : "Saved"}: ${saved[0]}`
          : `✅ ${lang === "pl" ? "Zapisano" : "Saved"} ${saved.length}: ${saved.join(", ")}`;
      addMessage({ role: "assistant", content: summary });
      onNodeSaved?.();
    } catch {
      addMessage({ role: "assistant", content: lang === "pl" ? "Błąd zapisu." : "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSave = () => {
    setPendingNodes([]);
    addMessage({ role: "assistant", content: lang === "pl" ? "Pominięto." : "Discarded." });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      {messages.length > 0 && (
        <div className="flex justify-end px-4 pt-2 shrink-0">
          <button
            onClick={() => {
              setMessages([]);
              setPendingNodes([]);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--text3)] hover:text-red-400 hover:bg-red-50/10 transition-colors"
            aria-label={lang === "pl" ? "Wyczyść czat" : "Clear chat"}
          >
            <Trash2 size={13} />
            {lang === "pl" ? "Wyczyść czat" : "Clear chat"}
          </button>
        </div>
      )}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <Brain size={36} className="text-[var(--text3)] opacity-40" />
            <p className="text-[var(--text3)] text-sm">
              {lang === "pl"
                ? "Powiedz AI co zapisać lub zadaj pytanie o bazę wiedzy"
                : "Tell AI what to save or ask about your knowledge base"}
            </p>
            <p className="text-[var(--text3)] text-xs opacity-60">
              {lang === "pl"
                ? 'Użyj "zapamiętaj" lub "zapisz" aby dodać wiedzę'
                : 'Use "remember" or "save this" to add knowledge'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg2)] text-[var(--text)]"
              }`}
            >
              <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <p className="mt-1 text-xs opacity-60">{msg.sources.join(", ")}</p>
              )}
            </div>
          </div>
        ))}

        {pendingNodes.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            <p className="text-xs text-[var(--text3)]">
              {lang === "pl"
                ? `Znaleziono ${pendingNodes.length} ${pendingNodes.length === 1 ? "wpis" : "wpisy/wpisów"} do zapisania:`
                : `Found ${pendingNodes.length} ${pendingNodes.length === 1 ? "entry" : "entries"} to save:`}
            </p>
            <div className="space-y-2">
              {pendingNodes.map((node, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 py-1.5 border-b border-[var(--border)] last:border-0"
                >
                  <span
                    className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-white text-xs font-medium ${TYPE_COLORS[node.type]}`}
                  >
                    {TYPE_LABELS[node.type]}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text)] text-sm">{node.title}</p>
                    <p className="text-[var(--text2)] text-xs mt-0.5 leading-relaxed">
                      {node.content}
                    </p>
                    {node.sources.length > 0 && node.sources[0].url && (
                      <p className="text-[var(--text3)] text-xs mt-0.5 truncate">
                        {node.sources[0].url}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleConfirmSave}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving
                  ? lang === "pl"
                    ? "Zapisuję..."
                    : "Saving..."
                  : lang === "pl"
                    ? pendingNodes.length === 1
                      ? "Zapisz"
                      : `Zapisz wszystkie (${pendingNodes.length})`
                    : pendingNodes.length === 1
                      ? "Save"
                      : `Save all (${pendingNodes.length})`}
              </button>
              <button
                onClick={handleCancelSave}
                className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text2)] text-sm hover:bg-[var(--bg2)] transition-colors"
              >
                {lang === "pl" ? "Anuluj" : "Cancel"}
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg2)] rounded-2xl px-4 py-2.5 text-sm text-[var(--text3)]">
              ...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              lang === "pl"
                ? "Wpisz wiedzę do zapisania lub zadaj pytanie..."
                : "Type knowledge to save or ask a question..."
            }
            disabled={isLoading || !!pendingNode}
            rows={1}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-4 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 resize-none overflow-hidden"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !!pendingNode}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-[var(--text3)] pl-1">
          {lang === "pl"
            ? "Enter — wyślij · Shift+Enter — nowa linia"
            : "Enter — send · Shift+Enter — new line"}
        </p>
      </div>
    </div>
  );
}
