/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Brain } from 'lucide-react';
import { motion } from 'motion/react';

export interface AppSidebarUser {
  id: string;
  email: string;
  name: string;
}

export interface AppSidebarTranslations {
  title: string;
  subtitle: string;
  logout: string;
  proPlan: string;
  docsLimit: string;
}

export interface AppSidebarProps {
  isSidebarOpen: boolean;
  lang: 'en' | 'pl';
  setLang: (lang: 'en' | 'pl') => void;
  user: AppSidebarUser | null;
  onLogout: () => void;
  documentsCount: number;
  t: AppSidebarTranslations;
  children: React.ReactNode;
}

export function AppSidebar({
  isSidebarOpen,
  lang,
  setLang,
  user,
  onLogout,
  documentsCount,
  t,
  children,
}: AppSidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
      className="bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden"
    >
      <div className="p-6 flex items-center gap-3 border-b border-[#F3F4F6]">
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
        {children}
      </div>

      <div className="p-4 border-t border-[#F3F4F6] space-y-4">
        <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-xl">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-[10px] font-bold text-white">
            {(user?.name ?? user?.email ?? 'U').substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{user?.name || user?.email || 'User'}</p>
            <button
              onClick={onLogout}
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
              style={{ width: `${(documentsCount / 50) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
