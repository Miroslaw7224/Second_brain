import React from 'react';
import { Brain, FileText, Send, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/cn';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export interface ChatPanelProps {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  prompts: string[];
  welcomeTitle: string;
  welcomeSubtitle: string;
  inputPlaceholder: string;
  disclaimer: string;
}

export function ChatPanel({
  messages,
  input,
  setInput,
  onSend,
  isLoading,
  chatEndRef,
  prompts,
  welcomeTitle,
  welcomeSubtitle,
  inputPlaceholder,
  disclaimer,
}: ChatPanelProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[var(--bg)]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-[var(--accent)] rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-black/10">
              <Brain className="text-white w-10 h-10" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4">{welcomeTitle}</h2>
            <p className="text-[var(--text2)] text-lg mb-12">{welcomeSubtitle}</p>
            <div className="grid grid-cols-2 gap-4 w-full">
              {prompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="p-4 text-left bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:border-[var(--accent)] hover:shadow-sm transition-all text-sm font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-8 pb-32">
            {messages.map((msg, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={i}
                className={cn(
                  'flex gap-4',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    msg.role === 'user' ? 'bg-[var(--accent)]' : 'bg-[var(--bg3)]'
                  )}
                >
                  {msg.role === 'user' ? (
                    <div className="text-[10px] font-bold text-white">ME</div>
                  ) : (
                    <Brain className="w-4 h-4 text-black" />
                  )}
                </div>
                <div
                  className={cn(
                    'flex flex-col gap-2 max-w-[85%]',
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'p-4 rounded-2xl text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]'
                    )}
                  >
                    <div className="markdown-body">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.sources.map((source, si) => (
                        <div
                          key={si}
                          className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg3)] rounded-md text-[10px] font-bold text-[var(--text2)] uppercase tracking-wider"
                        >
                          <FileText className="w-3 h-3" />
                          {source}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg3)] flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-black animate-spin" />
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-[var(--text3)] rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-[var(--text3)] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-[var(--text3)] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <div className="max-w-3xl mx-auto relative">
          <div className="relative flex items-end gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-2 shadow-lg shadow-black/5 focus-within:border-[var(--accent)] transition-all">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder={inputPlaceholder}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-4 resize-none max-h-32"
            />
            <button
              onClick={onSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                input.trim() && !isLoading
                  ? 'bg-[var(--accent)] text-white hover:scale-105'
                  : 'bg-[var(--bg3)] text-[var(--text3)]'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-center mt-3 text-[var(--text3)] font-medium uppercase tracking-widest">
            {disclaimer}
          </p>
        </div>
      </div>
    </>
  );
}
