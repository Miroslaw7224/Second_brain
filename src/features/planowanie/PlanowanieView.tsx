/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Briefcase, ListTodo, Tag, Send, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AppSidebar, type AppSidebarUser, type AppSidebarTranslations } from '@/src/components/layout/AppSidebar';
import { AppHeader } from '@/src/components/layout/AppHeader';
import { CalendarView } from '@/src/components/CalendarView';
import { TasksSection } from '@/src/components/TasksSection';
import { ActivityLog } from '@/src/components/ActivityLog';
import { TagsSection, type UserTag } from '@/src/components/TagsSection';
import type { translations } from '@/src/translations';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TranslationsEn = (typeof translations)['en'];

export interface PlanowanieViewProps {
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

export default function PlanowanieView({
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
}: PlanowanieViewProps) {
  const [planningTab, setPlanningTab] = useState<'calendar' | 'activity' | 'tasks' | 'tags'>('calendar');
  const [planAskInput, setPlanAskInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [planAskLoading, setPlanAskLoading] = useState(false);
  const [planAskPendingMessage, setPlanAskPendingMessage] = useState<string | null>(null);
  const [planAskUnknownTags, setPlanAskUnknownTags] = useState<string[]>([]);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [userTags, setUserTags] = useState<UserTag[]>([]);

  const fetchTags = useCallback(async () => {
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
  }, [apiFetch]);

  useEffect(() => {
    if (user) {
      fetchTags();
    }
  }, [user, fetchTags]);

  const handlePlanAsk = async () => {
    if (!planAskInput.trim() || planAskLoading) return;
    const msg = planAskInput.trim();
    setPlanAskInput('');
    setPlanAskLoading(true);
    setPlanAskPendingMessage(null);
    setPlanAskUnknownTags([]);

    const updatedMessages = [...messages, { role: 'user' as const, content: msg }];
    setMessages(updatedMessages);

    try {
      const res = await apiFetch('/api/plan/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: updatedMessages.slice(-19, -1),
          lang,
        }),
      });
      const data = await res.json();
      const assistantContent = data.text || data.error || '';
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }].slice(-20));
      if (data.unknownTags && Array.isArray(data.unknownTags) && data.unknownTags.length > 0) {
        setPlanAskPendingMessage(msg);
        setPlanAskUnknownTags(data.unknownTags);
      }
      if (data.created) {
        setCalendarRefreshKey((k) => k + 1);
        if (planningTab === 'calendar') setPlanningTab('calendar');
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }].slice(-20));
    } finally {
      setPlanAskLoading(false);
    }
  };

  const handlePlanAskAddTagAndRetry = async () => {
    if (!planAskPendingMessage || planAskUnknownTags.length === 0 || planAskLoading) return;
    setPlanAskLoading(true);
    try {
      for (const tagName of planAskUnknownTags) {
        await apiFetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: tagName.trim(), title: tagName.trim() }),
        });
      }
      await fetchTags();
      const res = await apiFetch('/api/plan/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: planAskPendingMessage, history: messages, lang }),
      });
      const data = await res.json();
      const assistantContent = data.text || data.error || '';
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }].slice(-20));
      setPlanAskPendingMessage(null);
      setPlanAskUnknownTags([]);
      if (data.created) {
        setCalendarRefreshKey((k) => k + 1);
        if (planningTab === 'calendar') setPlanningTab('calendar');
      }
    } catch (err) {
      const errorMsg = lang === 'pl' ? 'Nie udało się dodać tagu lub wpisu.' : 'Failed to add tag or entry.';
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }].slice(-20));
    } finally {
      setPlanAskLoading(false);
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
        documentsCount={0}
        t={sidebarT}
      >
        <div>
          <h2 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-widest mb-3 px-2">
            {t.modePlanowanie}
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => setPlanningTab('calendar')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left',
                planningTab === 'calendar'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--surface)] border-transparent hover:bg-[var(--bg2)] hover:border-[var(--bg3)]'
              )}
            >
              <Calendar className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{t.tabCalendar}</span>
            </button>
            <button
              onClick={() => setPlanningTab('activity')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left',
                planningTab === 'activity'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--surface)] border-transparent hover:bg-[var(--bg2)] hover:border-[var(--bg3)]'
              )}
            >
              <Briefcase className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{t.tabActivity}</span>
            </button>
            <button
              onClick={() => setPlanningTab('tasks')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left',
                planningTab === 'tasks'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--surface)] border-transparent hover:bg-[var(--bg2)] hover:border-[var(--bg3)]'
              )}
            >
              <ListTodo className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{t.tabTasks}</span>
            </button>
            <button
              onClick={() => setPlanningTab('tags')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left',
                planningTab === 'tags'
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--surface)] border-transparent hover:bg-[var(--bg2)] hover:border-[var(--bg3)]'
              )}
            >
              <Tag className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{t.tabTags}</span>
            </button>
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
          {planningTab === 'calendar' ? (
            <CalendarView
              apiFetch={apiFetch}
              lang={lang}
              t={t}
              userTags={userTags}
              refreshTrigger={calendarRefreshKey}
            />
          ) : planningTab === 'activity' ? (
            <ActivityLog apiFetch={apiFetch} lang={lang} t={t} userTags={userTags} />
          ) : planningTab === 'tags' ? (
            <TagsSection
              apiFetch={apiFetch}
              lang={lang}
              t={t}
              userTags={userTags}
              onTagsChange={fetchTags}
            />
          ) : (
            <TasksSection apiFetch={apiFetch} lang={lang} t={t} />
          )}
        </div>

        <div className="flex-shrink-0 p-4 bg-[var(--surface)] border-t border-[var(--border)]">
          <div className="max-w-2xl mx-auto">
            <div
              className="overflow-y-auto mb-2 space-y-2 px-2 py-1 rounded-lg bg-[var(--bg2)]"
              style={{ maxHeight: 240 }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-sm px-3 py-2 rounded-lg max-w-[85%]',
                    m.role === 'user'
                      ? 'ml-auto bg-[var(--accent)] text-white'
                      : 'mr-auto bg-[var(--bg3)] text-[var(--text)]'
                  )}
                >
                  {m.content}
                </div>
              ))}
              {planAskLoading && (
                <div className="flex items-center gap-1 text-[var(--text3)] text-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span>…</span>
                </div>
              )}
            </div>
            {planAskUnknownTags.length > 0 && (
              <button
                type="button"
                onClick={handlePlanAskAddTagAndRetry}
                disabled={planAskLoading}
                className="mb-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:brightness-110 disabled:opacity-50"
              >
                {lang === 'pl'
                  ? planAskUnknownTags.length === 1
                    ? `Dodaj tag "${planAskUnknownTags[0]}" i wpis`
                    : 'Dodaj tagi i wpis'
                  : planAskUnknownTags.length === 1
                    ? `Add tag "${planAskUnknownTags[0]}" and entry`
                    : 'Add tags and entry'}
              </button>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={planAskInput}
                onChange={(e) => setPlanAskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePlanAsk()}
                placeholder={t.planAskPlaceholder}
                className="flex-1 px-4 py-2 bg-[var(--bg3)] border-none rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]"
              />
              <button
                onClick={handlePlanAsk}
                disabled={!planAskInput.trim() || planAskLoading}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1',
                  planAskInput.trim() && !planAskLoading ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg3)] text-[var(--text3)]'
                )}
              >
                {planAskLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
