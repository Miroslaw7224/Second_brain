/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight, Search, History } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ThemeToggle } from '@/src/components/theme/ThemeToggle';

export interface AppHeaderTranslations {
  modeWiedza: string;
  modePlanowanie: string;
  brainActive: string;
  searchPlaceholder: string;
}

export interface AppHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  appMode: 'wiedza' | 'planowanie';
  setAppMode: (mode: 'wiedza' | 'planowanie') => void;
  t: AppHeaderTranslations;
}

function cn(...inputs: (string | undefined)[]) {
  return twMerge(clsx(inputs));
}

export function AppHeader({
  isSidebarOpen,
  setIsSidebarOpen,
  appMode,
  setAppMode,
  t,
}: AppHeaderProps) {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text)]"
        >
          <ChevronRight className={cn('w-5 h-5 transition-transform', isSidebarOpen && 'rotate-180')} />
        </button>
        <div className="flex bg-[var(--toggle-bg)] p-1 rounded-xl border border-[var(--border)]">
          <button
            onClick={() => setAppMode('wiedza')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
              appMode === 'wiedza' ? 'bg-[var(--surface)] shadow-[var(--shadow-sm)] text-[var(--text)]' : 'text-[var(--text2)] hover:text-[var(--text)]'
            )}
          >
            {t.modeWiedza}
          </button>
          <button
            onClick={() => setAppMode('planowanie')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
              appMode === 'planowanie' ? 'bg-[var(--surface)] shadow-[var(--shadow-sm)] text-[var(--text)]' : 'text-[var(--text2)] hover:text-[var(--text)]'
            )}
          >
            {t.modePlanowanie}
          </button>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-2 h-2 bg-[var(--green)] rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-[var(--text)]">{t.brainActive}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="pl-10 pr-4 py-2 bg-[var(--bg3)] border-none rounded-full text-sm w-64 text-[var(--text)] placeholder-[var(--text3)] focus:ring-2 focus:ring-[var(--accent)] transition-all"
          />
        </div>
        <ThemeToggle />
        <button className="p-2 hover:bg-[var(--bg3)] rounded-full transition-colors text-[var(--text2)]">
          <History className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
