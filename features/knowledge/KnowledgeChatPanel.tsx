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
  const [pendingNode, setPendingNode] = useState<PendingNode | null>(null);
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
    if (!input.trim() || isLoading || pendingNode) return;
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
        setPendingNode(data.node);
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
    if (!pendingNode) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/knowledge/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pendingNode, sources: [], createdBy: "ai" }),
      });
      if (!res.ok) throw new Error();
      const saved = pendingNode;
      setPendingNode(null);
      addMessage({
        role: "assistant",
        content: `✅ ${lang === "pl" ? "Zapisano" : "Saved"}: ${saved.title}`,
      });
      onNodeSaved?.();
    } catch {
      addMessage({ role: "assistant", content: lang === "pl" ? "Błąd zapisu." : "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSave = () => {
    setPendingNode(null);
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
              setPendingNode(null);
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

        {pendingNode && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            <p className="text-xs text-[var(--text3)]">
              {lang === "pl" ? "Czy zapisać tę wiedzę?" : "Save this to your knowledge base?"}
            </p>
            <div className="flex items-start gap-2">
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-white text-xs font-medium ${TYPE_COLORS[pendingNode.type]}`}
              >
                {TYPE_LABELS[pendingNode.type]}
              </span>
              <p className="font-medium text-[var(--text)] text-sm">{pendingNode.title}</p>
            </div>
            <p className="text-[var(--text2)] text-xs leading-relaxed">{pendingNode.content}</p>
            {pendingNode.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {pendingNode.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--text3)] text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
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
                    ? "Zapisz"
                    : "Save"}
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
