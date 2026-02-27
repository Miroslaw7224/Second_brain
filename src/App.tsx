/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Brain, 
  Plus, 
  MessageSquare, 
  FileText, 
  Trash2, 
  Send, 
  Upload,
  Loader2,
  X,
  ChevronRight,
  Search,
  History,
  Calendar,
  Briefcase,
  ListTodo,
  Tag,
  Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getFirebaseAuth } from './lib/firebase-client';
import { CalendarView } from '@/src/components/CalendarView';
import { TasksSection } from '@/src/components/TasksSection';
import { ActivityLog } from '@/src/components/ActivityLog';
import { TagsSection, type UserTag } from '@/src/components/TagsSection';
import { ResourceSection } from '@/src/components/ResourceSection';
import { translations } from '@/src/translations';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Document {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

function firebaseUserToAppUser(fbUser: { uid: string; email: string | null; displayName: string | null }): User {
  return {
    id: fbUser.uid,
    email: fbUser.email ?? '',
    name: fbUser.displayName ?? fbUser.email ?? 'User',
  };
}

interface AppProps {
  /** When true, skip login screen (used under protected layout). */
  authenticated?: boolean;
}

export default function App({ authenticated = false }: AppProps = {}) {
  const [lang, setLang] = useState<'en' | 'pl'>('pl');
  const t = translations[lang];
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [appMode, setAppMode] = useState<'wiedza' | 'planowanie'>('wiedza');
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'resources'>('chat');
  const [planningTab, setPlanningTab] = useState<'calendar' | 'activity' | 'tasks' | 'tags'>('calendar');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [planAskInput, setPlanAskInput] = useState('');
  const [planAskResponse, setPlanAskResponse] = useState('');
  const [planAskLoading, setPlanAskLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser ? firebaseUserToAppUser(fbUser) : null);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await apiFetch('/api/tags');
      if (!res.ok) {
        setUserTags([]);
        return;
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setUserTags([]);
        return;
      }
      const data = await res.json();
      setUserTags(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch tags', err);
      setUserTags([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchNotes();
      fetchTags();
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      const auth = getFirebaseAuth();
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      console.error('Google login failed', err);
      setAuthError(err.message ?? 'Google sign-in failed');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const auth = getFirebaseAuth();
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name?.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      }
    } catch (err: any) {
      setAuthError(err.message ?? 'Authentication failed');
    }
  };

  const handleLogout = () => {
    signOut(getFirebaseAuth());
    setMessages([]);
    setDocuments([]);
    setNotes([]);
  };

  const handleGuestLogin = async () => {
    setAuthError('');
    try {
      await signInAnonymously(getFirebaseAuth());
    } catch (err: any) {
      setAuthError(err.message ?? 'Guest sign-in failed');
    }
  };

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const auth = getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    };
    return fetch(url, { ...options, headers });
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await apiFetch('/api/documents');
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch documents', err);
      setDocuments([]);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await apiFetch('/api/notes');
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch notes', err);
      setNotes([]);
    }
  };

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
      }
    } catch (err) {
      console.error('Failed to save note', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(prev => prev.filter(n => n.id !== id));
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
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        await fetchDocuments();
      }
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
      setDocuments(docs => docs.filter(d => d.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handlePlanAsk = async () => {
    if (!planAskInput.trim() || planAskLoading) return;
    const msg = planAskInput.trim();
    setPlanAskInput('');
    setPlanAskLoading(true);
    setPlanAskResponse('');
    try {
      const res = await apiFetch('/api/plan/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, lang }),
      });
      const data = await res.json();
      setPlanAskResponse(data.text || data.error || '');
      if (data.created && planningTab === 'calendar') {
        setPlanningTab('calendar');
      }
    } catch (err) {
      setPlanAskResponse('Sorry, something went wrong.');
    } finally {
      setPlanAskLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, lang }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.text,
        sources: data.sources 
      }]);
    } catch (err) {
      console.error('Chat failed', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading && !authenticated) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
      </div>
    );
  }

  if (!authenticated && !user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-black/5 border border-[#E5E7EB] overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Brain className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">Second Brain</h1>
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">Freelancer Edition</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6">{authMode === 'login' ? t.login : t.register}</h2>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-[#4B5563] uppercase mb-1">Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-black transition-all"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#4B5563] uppercase mb-1">{t.email}</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-black transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4B5563] uppercase mb-1">{t.password}</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-black transition-all"
                  required
                />
              </div>
              {authError && <p className="text-xs text-red-500 font-medium">{authError}</p>}
              <button 
                type="submit"
                className="w-full py-3 bg-black text-white rounded-xl font-bold hover:scale-[1.02] transition-all"
              >
                {authMode === 'login' ? t.login : t.register}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E7EB]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[#9CA3AF] font-bold">Or</span>
              </div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 p-3 bg-white border border-[#E5E7EB] rounded-xl text-sm font-semibold text-[#4B5563] hover:bg-[#F9FAFB] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t.signInGoogle}
            </button>

            <button 
              onClick={handleGuestLogin}
              className="w-full mt-3 py-3 bg-[#F3F4F6] text-[#4B5563] rounded-xl text-sm font-bold hover:bg-[#E5E7EB] transition-all"
            >
              {t.continueGuest}
            </button>

            <p className="text-center mt-8 text-sm text-[#6B7280]">
              {authMode === 'login' ? t.noAccount : t.hasAccount}{' '}
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="font-bold text-black hover:underline"
              >
                {authMode === 'login' ? t.register : t.login}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden"
      >
        <div className="p-6 flex items-center gap-3 border-bottom border-[#F3F4F6]">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <Brain className="text-white w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg tracking-tight">{t.title}</h1>
            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">{t.subtitle}</p>
          </div>
          <button 
            onClick={() => setLang(lang === 'en' ? 'pl' : 'en')}
            className="px-2 py-1 bg-[#F3F4F6] rounded text-[10px] font-bold hover:bg-[#E5E7EB] transition-colors"
          >
            {lang === 'en' ? 'PL' : 'EN'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {appMode === 'planowanie' && (
          <div>
            <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3 px-2">{t.modePlanowanie}</h2>
            <div className="space-y-1">
              <button
                onClick={() => setPlanningTab('calendar')}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left",
                  planningTab === 'calendar' ? "bg-black text-white border-black" : "bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6]"
                )}
              >
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{t.tabCalendar}</span>
              </button>
              <button
                onClick={() => setPlanningTab('activity')}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left",
                  planningTab === 'activity' ? "bg-black text-white border-black" : "bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6]"
                )}
              >
                <Briefcase className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{t.tabActivity}</span>
              </button>
              <button
                onClick={() => setPlanningTab('tasks')}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left",
                  planningTab === 'tasks' ? "bg-black text-white border-black" : "bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6]"
                )}
              >
                <ListTodo className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{t.tabTasks}</span>
              </button>
              <button
                onClick={() => setPlanningTab('tags')}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left",
                  planningTab === 'tags' ? "bg-black text-white border-black" : "bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6]"
                )}
              >
                <Tag className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{t.tabTags}</span>
              </button>
            </div>
          </div>
          )}
          {appMode === 'wiedza' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left text-sm font-semibold",
                  activeTab === 'chat' ? "bg-black text-white border-black" : "bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6] text-[#374151]"
                )}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                <span>{t.chatTab}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left text-sm font-semibold",
                  activeTab === 'notes' ? "bg-black text-white border-black" : "bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6] text-[#374151]"
                )}
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span>{t.notesTab}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('resources')}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left text-sm font-semibold",
                  activeTab === 'resources' ? "bg-black text-white border-black" : "bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6] text-[#374151]"
                )}
              >
                <Link className="w-5 h-5 flex-shrink-0" />
                <span>{(t.tabResources as string) ?? 'Zasoby'}</span>
              </button>
            </div>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">{t.knowledge}</h2>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 hover:bg-[#F3F4F6] rounded-lg transition-colors text-[#4B5563]"
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
                <div className="px-4 py-8 text-center border-2 border-dashed border-[#F3F4F6] rounded-2xl">
                  <FileText className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                  <p className="text-sm text-[#9CA3AF]">{t.noDocs}</p>
                </div>
              ) : (
                documents.map(doc => (
                  <div 
                    key={doc.id}
                    className="group flex items-center justify-between p-3 hover:bg-[#F9FAFB] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[#F3F4F6]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-[#F3F4F6] rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-[#4B5563]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">{new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          )}
        </div>

        <div className="p-4 border-t border-[#F3F4F6] space-y-4">
          <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-xl">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-[10px] font-bold text-white">
              {(user?.name ?? user?.email ?? 'U').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user?.name || user?.email || 'User'}</p>
              <button 
                onClick={handleLogout}
                className="text-[10px] font-bold text-[#9CA3AF] hover:text-black uppercase tracking-wider"
              >
                {t.logout}
              </button>
            </div>
          </div>

          <div className="bg-[#F9FAFB] p-4 rounded-2xl">
            <p className="text-xs font-bold text-[#4B5563] mb-1">{t.proPlan}</p>
            <p className="text-xs text-[#6B7280] mb-3">{t.docsLimit}</p>
            <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-black h-full transition-all duration-500" 
                style={{ width: `${(documents.length / 50) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
            >
              <ChevronRight className={cn("w-5 h-5 transition-transform", isSidebarOpen && "rotate-180")} />
            </button>
            <div className="flex bg-[#F3F4F6] p-1 rounded-xl">
              <button 
                onClick={() => setAppMode('wiedza')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                  appMode === 'wiedza' ? "bg-white shadow-sm text-black" : "text-[#6B7280] hover:text-black"
                )}
              >
                {t.modeWiedza}
              </button>
              <button 
                onClick={() => setAppMode('planowanie')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                  appMode === 'planowanie' ? "bg-white shadow-sm text-black" : "text-[#6B7280] hover:text-black"
                )}
              >
                {t.modePlanowanie}
              </button>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold">{t.brainActive}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input 
                type="text" 
                placeholder={t.searchPlaceholder} 
                className="pl-10 pr-4 py-2 bg-[#F3F4F6] border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-black transition-all"
              />
            </div>
            <button className="p-2 hover:bg-[#F3F4F6] rounded-full transition-colors">
              <History className="w-5 h-5 text-[#4B5563]" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col min-h-0">
          {appMode === 'planowanie' ? (
            planningTab === 'calendar' ? (
              <CalendarView apiFetch={apiFetch} lang={lang} t={t} userTags={userTags} />
            ) : planningTab === 'activity' ? (
              <ActivityLog apiFetch={apiFetch} lang={lang} t={t} userTags={userTags} />
            ) : planningTab === 'tags' ? (
              <TagsSection apiFetch={apiFetch} lang={lang} t={t} userTags={userTags} onTagsChange={fetchTags} />
            ) : (
              <TasksSection apiFetch={apiFetch} lang={lang} t={t} />
            )
          ) : activeTab === 'chat' ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
                  <div className="w-20 h-20 bg-black rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-black/10">
                    <Brain className="text-white w-10 h-10" />
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight mb-4">{t.welcomeTitle}</h2>
                  <p className="text-[#6B7280] text-lg mb-12">{t.welcomeSubtitle}</p>
                  
                  <div className="grid grid-cols-2 gap-4 w-full">
                    {t.prompts.map((prompt, i) => (
                      <button 
                        key={i}
                        onClick={() => setInput(prompt)}
                        className="p-4 text-left bg-white border border-[#E5E7EB] rounded-2xl hover:border-black hover:shadow-sm transition-all text-sm font-medium"
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
                        "flex gap-4",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        msg.role === 'user' ? "bg-black" : "bg-[#F3F4F6]"
                      )}>
                        {msg.role === 'user' ? (
                          <div className="text-[10px] font-bold text-white">ME</div>
                        ) : (
                          <Brain className="w-4 h-4 text-black" />
                        )}
                      </div>
                      <div className={cn(
                        "flex flex-col gap-2 max-w-[85%]",
                        msg.role === 'user' ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "p-4 rounded-2xl text-sm leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-black text-white" 
                            : "bg-white border border-[#E5E7EB] text-[#1A1A1A]"
                        )}>
                          <div className="markdown-body">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {msg.sources.map((source, si) => (
                              <div key={si} className="flex items-center gap-1.5 px-2 py-1 bg-[#F3F4F6] rounded-md text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
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
                      <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-black animate-spin" />
                      </div>
                      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-[#D1D5DB] rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-[#D1D5DB] rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-1.5 h-1.5 bg-[#D1D5DB] rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          ) : activeTab === 'resources' ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]">
              <ResourceSection apiFetch={apiFetch} t={t} />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-64 border-r border-[#E5E7EB] bg-white overflow-y-auto p-4 space-y-2">
                <button 
                  onClick={() => setSelectedNote({ id: '', title: '', content: '', created_at: '' })}
                  className="w-full flex items-center gap-2 p-3 bg-black text-white rounded-xl text-sm font-semibold hover:scale-[1.02] transition-all mb-4"
                >
                  <Plus className="w-4 h-4" />
                  {t.newNote}
                </button>
                {notes.map(note => (
                  <button 
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl transition-all border",
                      selectedNote?.id === note.id 
                        ? "bg-black text-white border-black" 
                        : "bg-white text-black border-transparent hover:bg-[#F3F4F6]"
                    )}
                  >
                    <p className="text-sm font-bold truncate">{note.title || 'Untitled'}</p>
                    <p className={cn(
                      "text-[10px] uppercase font-bold",
                      selectedNote?.id === note.id ? "text-white/60" : "text-[#9CA3AF]"
                    )}>
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex-1 bg-white p-8 overflow-y-auto">
                {selectedNote ? (
                  <div className="max-w-2xl mx-auto space-y-6">
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
                          <button
                            onClick={() => handleDeleteNote(selectedNote.id)}
                            className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={handleSaveNote}
                          className="px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:scale-105 transition-all"
                        >
                          {t.saveNote}
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={selectedNote.content}
                      onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })}
                      placeholder={t.noteContentPlaceholder}
                      className="w-full h-[60vh] border-none focus:ring-0 p-0 text-lg leading-relaxed resize-none"
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-[#F3F4F6] rounded-2xl flex items-center justify-center mb-4">
                      <Plus className="w-8 h-8 text-[#9CA3AF]" />
                    </div>
                    <p className="text-[#9CA3AF] font-medium">{t.newNote}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Area (Only for Chat) */}
        {appMode === 'wiedza' && activeTab === 'chat' && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA] to-transparent">
            <div className="max-w-3xl mx-auto relative">
              <div className="relative flex items-end gap-2 bg-white border border-[#E5E7EB] rounded-[2rem] p-2 shadow-lg shadow-black/5 focus-within:border-black transition-all">
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
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    input.trim() && !isLoading ? "bg-black text-white hover:scale-105" : "bg-[#F3F4F6] text-[#9CA3AF]"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-center mt-3 text-[#9CA3AF] font-medium uppercase tracking-widest">
                {t.disclaimer}
              </p>
            </div>
          </div>
        )}

        {/* Plan AI bar (Planning mode) – not absolute so calendar scrollbar stays visible above */}
        {appMode === 'planowanie' && (
          <div className="flex-shrink-0 p-4 bg-white border-t border-[#E5E7EB]">
            <div className="max-w-2xl mx-auto">
              {planAskResponse && (
                <p className="text-sm text-[#374151] mb-2 px-2 py-1 bg-[#F3F4F6] rounded-lg">{planAskResponse}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={planAskInput}
                  onChange={(e) => setPlanAskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePlanAsk()}
                  placeholder={t.planAskPlaceholder}
                  className="flex-1 px-4 py-2 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-black"
                />
                <button
                  onClick={handlePlanAsk}
                  disabled={!planAskInput.trim() || planAskLoading}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1",
                    planAskInput.trim() && !planAskLoading ? "bg-black text-white" : "bg-[#F3F4F6] text-[#9CA3AF]"
                  )}
                >
                  {planAskLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
