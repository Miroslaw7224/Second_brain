"use client";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Network, Link, Calendar, Map } from "lucide-react";

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  lang: "en" | "pl";
}

export function MobileMoreDrawer({ isOpen, onClose, onLogout, lang }: MobileMoreDrawerProps) {
  const items = [
    {
      id: "graph",
      icon: <Network className="w-5 h-5" />,
      labelPl: "Graf wiedzy",
      labelEn: "Knowledge Graph",
    },
    {
      id: "resources",
      icon: <Link className="w-5 h-5" />,
      labelPl: "Zasoby",
      labelEn: "Resources",
    },
    {
      id: "calendar",
      icon: <Calendar className="w-5 h-5" />,
      labelPl: "Kalendarz",
      labelEn: "Calendar",
    },
    {
      id: "mindmaps",
      icon: <Map className="w-5 h-5" />,
      labelPl: "Mapy myśli",
      labelEn: "Mind Maps",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            data-testid="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg2)] border-t border-[var(--border)] rounded-t-2xl pb-8 md:hidden"
          >
            <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mt-3 mb-4" />
            <div className="px-4 space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={onClose}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-semibold text-[var(--text)] hover:bg-[var(--bg3)] transition-colors text-left"
                >
                  <span className="text-[var(--text2)]">{item.icon}</span>
                  {lang === "pl" ? item.labelPl : item.labelEn}
                </button>
              ))}
              <div className="border-t border-[var(--border)] my-2" />
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-[var(--bg3)] transition-colors text-left"
              >
                <LogOut className="w-5 h-5" />
                {lang === "pl" ? "Wyloguj" : "Logout"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
