/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight, Search, History } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
    <header className="h-16 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
        >
          <ChevronRight className={cn('w-5 h-5 transition-transform', isSidebarOpen && 'rotate-180')} />
        </button>
        <div className="flex bg-[#F3F4F6] p-1 rounded-xl">
          <button
            onClick={() => setAppMode('wiedza')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
              appMode === 'wiedza' ? 'bg-white shadow-sm text-black' : 'text-[#6B7280] hover:text-black'
            )}
          >
            {t.modeWiedza}
          </button>
          <button
            onClick={() => setAppMode('planowanie')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
              appMode === 'planowanie' ? 'bg-white shadow-sm text-black' : 'text-[#6B7280] hover:text-black'
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
  );
}
