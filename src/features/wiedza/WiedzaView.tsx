/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Plus, MessageSquare, FileText, Trash2, Send, Loader2, Link, Pencil } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AppSidebar, type AppSidebarUser, type AppSidebarTranslations } from '@/src/components/layout/AppSidebar';
import { AppHeader } from '@/src/components/layout/AppHeader';
import { ResourceSection } from '@/src/components/ResourceSection';
import { NoteEditor } from '@/src/components/NoteEditor';
import type { translations } from '@/src/translations';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TranslationsEn = (typeof translations)['en'];

export interface Document {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export interface WiedzaViewProps {
  user: AppSidebarUser | null;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  lang: 'en' | 'pl';
  t: TranslationsEn;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  appMode: 'wiedza' | 'planowanie';
  setAppMode: (mode: 'wiedza' | 'planowanie') => void;
  onLogout: () => void;
  setLang: (lang: 'en' | 'pl') => void;
}

export default function WiedzaView({
  user,
  apiFetch,
  lang,
  t,
  isSidebarOpen,
  setIsSidebarOpen,
  appMode,
  setAppMode,
  onLogout,
  setLang,
}: WiedzaViewProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'resources'>('chat');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteEditMode, setNoteEditMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await apiFetch('/api/documents');
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch documents', err);
      setDocuments([]);
    }
  }, [apiFetch]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await apiFetch('/api/notes');
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch notes', err);
      setNotes([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchNotes();
    }
  }, [user, fetchDocuments, fetchNotes]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    try {
      const method = selectedNote.id ? 'PUT' : 'POST';
      const url = selectedNote.id ? `/api/notes/${selectedNote.id}` : '/api/notes';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedNote),
      });
      if (res.ok) {
        await fetchNotes();
        if (method === 'POST') {
          const data = await res.json();
          setSelectedNote({ ...data, created_at: data.created_at ?? new Date().toISOString() });
        }
        setNoteEditMode(false);
      }
    } catch (err) {
      console.error('Failed to save note', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) await fetchDocuments();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments((docs) => docs.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, lang }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.text, sources: data.sources },
      ]);
    } catch (err) {
      console.error('Chat failed', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sidebarT: AppSidebarTranslations = {
    title: t.title,
    subtitle: t.subtitle,
    logout: t.logout,
    proPlan: t.proPlan,
    docsLimit: t.docsLimit,
  };

  return (
    <>
      <AppSidebar
        isSidebarOpen={isSidebarOpen}
        lang={lang}
        setLang={setLang}
        user={user}
        onLogout={onLogout}
        documentsCount={documents.length}
        t={sidebarT}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left text-sm font-semibold',
                activeTab === 'chat'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--surface)] border-transparent hover:bg-[var(--bg2)] hover:border-[var(--bg3)] text-[var(--text)]'
              )}
            >
              <MessageSquare className="w-5 h-5 flex-shrink-0" />
              <span>{t.chatTab}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left text-sm font-semibold',
                activeTab === 'notes'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--surface)] border-transparent hover:bg-[var(--bg2)] hover:border-[var(--bg3)] text-[var(--text)]'
              )}
            >
              <FileText className="w-5 h-5 flex-shrink-0" />
              <span>{t.notesTab}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left text-sm font-semibold',
                activeTab === 'resources'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--surface)] border-transparent hover:bg-[var(--bg2)] hover:border-[var(--bg3)] text-[var(--text)]'
              )}
            >
              <Link className="w-5 h-5 flex-shrink-0" />
              <span>{(t.tabResources as string) ?? 'Zasoby'}</span>
            </button>
          </div>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-widest">{t.knowledge}</h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text)]"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              className="hidden"
              accept=".txt,.md,.json"
            />
          </div>
          <div className="space-y-1">
            {documents.length === 0 ? (
              <div className="px-4 py-8 text-center border-2 border-dashed border-[var(--border)] rounded-2xl">
                <FileText className="w-8 h-8 text-[var(--text3)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text3)]">{t.noDocs}</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="group flex items-center justify-between p-3 hover:bg-[var(--bg2)] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[var(--bg3)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-[var(--bg3)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-[var(--text)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-[10px] text-[var(--text3)] uppercase font-bold">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </AppSidebar>

      <main className="flex-1 min-w-0 flex flex-col relative">
        <AppHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          appMode={appMode}
          setAppMode={setAppMode}
          t={{
            modeWiedza: t.modeWiedza,
            modePlanowanie: t.modePlanowanie,
            brainActive: t.brainActive,
            searchPlaceholder: t.searchPlaceholder,
          }}
        />

        <div className="flex-1 min-w-0 overflow-hidden flex flex-col min-h-0">
          {activeTab === 'chat' ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[var(--bg)]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
                  <div className="w-20 h-20 bg-[var(--accent)] rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-black/10">
                    <Brain className="text-white w-10 h-10" />
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight mb-4">{t.welcomeTitle}</h2>
                  <p className="text-[var(--text2)] text-lg mb-12">{t.welcomeSubtitle}</p>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    {t.prompts.map((prompt, i) => (
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
                      className={cn('flex gap-4', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
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
          ) : activeTab === 'resources' ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
              <ResourceSection apiFetch={apiFetch} t={t} />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-64 border-r border-[var(--border)] bg-[var(--surface)] overflow-y-auto p-4 space-y-2">
                <button
                  onClick={() => {
                    setSelectedNote({ id: '', title: '', content: '', created_at: '' });
                    setNoteEditMode(true);
                  }}
                  className="w-full flex items-center gap-2 p-3 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:scale-[1.02] transition-all mb-4"
                >
                  <Plus className="w-4 h-4" />
                  {t.newNote}
                </button>
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setNoteEditMode(false);
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-xl transition-all border',
                      selectedNote?.id === note.id
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--surface)] text-[var(--text)] border-transparent hover:bg-[var(--bg3)]'
                    )}
                  >
                    <p className="text-sm font-bold truncate">{note.title || 'Untitled'}</p>
                    <p
                      className={cn(
                        'text-[10px] uppercase font-bold',
                        selectedNote?.id === note.id ? 'text-white/60' : 'text-[var(--text3)]'
                      )}
                    >
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex-1 bg-[var(--surface)] p-8 overflow-y-auto min-w-0">
                {selectedNote ? (
                  <div className="w-full max-w-full space-y-6">
                    {noteEditMode || selectedNote.id === '' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={selectedNote.title}
                            onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
                            placeholder={t.noteTitlePlaceholder}
                            className="text-3xl font-bold border-none focus:ring-0 w-full p-0"
                          />
                          <div className="flex items-center gap-2">
                            {selectedNote.id !== '' && (
                              <>
                                <button
                                  onClick={() => setNoteEditMode(false)}
                                  className="px-4 py-2 border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text)] hover:bg-[var(--bg2)] transition-all"
                                >
                                  {t.noteCancelEdit}
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(selectedNote.id)}
                                  className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={handleSaveNote}
                              className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:scale-105 transition-all"
                            >
                              {t.saveNote}
                            </button>
                          </div>
                        </div>
                        <NoteEditor
                          key={selectedNote.id || 'new'}
                          content={selectedNote.content}
                          onContentChange={(html) => setSelectedNote({ ...selectedNote, content: html })}
                          placeholder={t.noteContentPlaceholder}
                        />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-4">
                          <h1 className="text-3xl font-bold text-[var(--text)] flex-1 min-w-0">
                            {selectedNote.title || t.noteTitlePlaceholder}
                          </h1>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setNoteEditMode(true)}
                              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:scale-105 transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                              {t.noteEdit}
                            </button>
                            <button
                              onClick={() => handleDeleteNote(selectedNote.id)}
                              className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                              title={t.deleteNote}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div
                          className="prose prose-lg max-w-none min-h-[20vh] text-[var(--text)] leading-relaxed prose-p:my-2 prose-headings:font-bold prose-headings:text-[var(--text)]"
                          dangerouslySetInnerHTML={{
                            __html: selectedNote.content
                              ? selectedNote.content.trim().startsWith('<')
                                ? selectedNote.content
                                : `<p>${selectedNote.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
                              : '<p class="text-[var(--text3)]">' + t.noteContentPlaceholder + '</p>',
                          }}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-[var(--bg3)] rounded-2xl flex items-center justify-center mb-4">
                      <Plus className="w-8 h-8 text-[var(--text3)]" />
                    </div>
                    <p className="text-[var(--text3)] font-medium">{t.newNote}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {activeTab === 'chat' && (
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
                      handleSend();
                    }
                  }}
                  placeholder={t.inputPlaceholder}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-4 resize-none max-h-32"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    input.trim() && !isLoading ? 'bg-[var(--accent)] text-white hover:scale-105' : 'bg-[var(--bg3)] text-[var(--text3)]'
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-center mt-3 text-[var(--text3)] font-medium uppercase tracking-widest">
                {t.disclaimer}
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
