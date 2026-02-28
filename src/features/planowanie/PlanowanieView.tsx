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
  const [planAskResponse, setPlanAskResponse] = useState('');
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
    setPlanAskResponse('');
    setPlanAskPendingMessage(null);
    setPlanAskUnknownTags([]);
    try {
      const res = await apiFetch('/api/plan/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, lang }),
      });
      const data = await res.json();
      setPlanAskResponse(data.text || data.error || '');
      if (data.unknownTags && Array.isArray(data.unknownTags) && data.unknownTags.length > 0) {
        setPlanAskPendingMessage(msg);
        setPlanAskUnknownTags(data.unknownTags);
      }
      if (data.created) {
        setCalendarRefreshKey((k) => k + 1);
        if (planningTab === 'calendar') setPlanningTab('calendar');
      }
    } catch (err) {
      setPlanAskResponse('Sorry, something went wrong.');
    } finally {
      setPlanAskLoading(false);
    }
  };

  const handlePlanAskAddTagAndRetry = async () => {
    if (!planAskPendingMessage || planAskUnknownTags.length === 0 || planAskLoading) return;
    setPlanAskLoading(true);
    setPlanAskResponse('');
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
        body: JSON.stringify({ message: planAskPendingMessage, lang }),
      });
      const data = await res.json();
      setPlanAskResponse(data.text || data.error || '');
      setPlanAskPendingMessage(null);
      setPlanAskUnknownTags([]);
      if (data.created) {
        setCalendarRefreshKey((k) => k + 1);
        if (planningTab === 'calendar') setPlanningTab('calendar');
      }
    } catch (err) {
      setPlanAskResponse(lang === 'pl' ? 'Nie udało się dodać tagu lub wpisu.' : 'Failed to add tag or entry.');
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
          <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3 px-2">
            {t.modePlanowanie}
          </h2>
          <div className="space-y-1">
            <button
              onClick={() => setPlanningTab('calendar')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left',
                planningTab === 'calendar'
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6]'
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
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6]'
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
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6]'
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
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-transparent hover:bg-[#F9FAFB] hover:border-[#F3F4F6]'
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

        <div className="flex-shrink-0 p-4 bg-white border-t border-[#E5E7EB]">
          <div className="max-w-2xl mx-auto">
            {planAskResponse && (
              <p className="text-sm text-[#374151] mb-2 px-2 py-1 bg-[#F3F4F6] rounded-lg">
                {planAskResponse}
              </p>
            )}
            {planAskUnknownTags.length > 0 && (
              <button
                type="button"
                onClick={handlePlanAskAddTagAndRetry}
                disabled={planAskLoading}
                className="mb-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-black text-white hover:bg-[#333] disabled:opacity-50"
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
                className="flex-1 px-4 py-2 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-black"
              />
              <button
                onClick={handlePlanAsk}
                disabled={!planAskInput.trim() || planAskLoading}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1',
                  planAskInput.trim() && !planAskLoading ? 'bg-black text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]'
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
