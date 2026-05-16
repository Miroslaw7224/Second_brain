"use client";
import React from "react";
import { Home, MessageCircle, CheckSquare, FileText, MoreHorizontal } from "lucide-react";
import { cn } from "@/src/lib/cn";

type AppMode = "home" | "wiedza" | "planowanie";

interface MobileNavProps {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  lang: "en" | "pl";
  onMoreOpen: () => void;
}

interface NavTab {
  id: string;
  icon: React.ReactNode;
  labelPl: string;
  labelEn: string;
  action: () => void;
  active: boolean;
}

export function MobileNav({ appMode, setAppMode, lang, onMoreOpen }: MobileNavProps) {
  const tabs: NavTab[] = [
    {
      id: "home",
      icon: <Home className="w-5 h-5" />,
      labelPl: "Home",
      labelEn: "Home",
      action: () => setAppMode("home"),
      active: appMode === "home",
    },
    {
      id: "wiedza",
      icon: <MessageCircle className="w-5 h-5" />,
      labelPl: "Wiedza",
      labelEn: "Knowledge",
      action: () => setAppMode("wiedza"),
      active: appMode === "wiedza",
    },
    {
      id: "planowanie",
      icon: <CheckSquare className="w-5 h-5" />,
      labelPl: "Zadania",
      labelEn: "Tasks",
      action: () => setAppMode("planowanie"),
      active: appMode === "planowanie",
    },
    {
      id: "notatki",
      icon: <FileText className="w-5 h-5" />,
      labelPl: "Notatki",
      labelEn: "Notes",
      action: () => setAppMode("wiedza"),
      active: false,
    },
    {
      id: "more",
      icon: <MoreHorizontal className="w-5 h-5" />,
      labelPl: "Więcej",
      labelEn: "More",
      action: onMoreOpen,
      active: false,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-[var(--bg2)] border-t border-[var(--border)] h-16 safe-area-inset-bottom">
      {tabs.map((tab) => {
        const label = lang === "pl" ? tab.labelPl : tab.labelEn;
        return (
          <button
            key={tab.id}
            aria-label={label}
            onClick={tab.action}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
              tab.active ? "text-[var(--accent)]" : "text-[var(--text3)] hover:text-[var(--text2)]"
            )}
          >
            {tab.icon}
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
