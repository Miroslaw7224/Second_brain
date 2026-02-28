"use client";

import { BookOpen, Calendar } from "lucide-react";

export default function Features() {
  return (
    <section className="bg-white px-6 pt-0 pb-24 sm:px-8 lg:px-12 xl:px-16 lg:pt-2 lg:pb-24" id="funkcje">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl">
          Dwa moduły
        </h2>
        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Wiedza</h3>
            </div>
            <ul className="mt-6 space-y-3 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                Jedna baza dokumentów i notatek
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                Chat z AI oparty wyłącznie o Twoje materiały (RAG)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                Źródła przy każdej odpowiedzi
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                Notatki i zasoby w jednym miejscu
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Planowanie</h3>
            </div>
            <ul className="mt-6 space-y-3 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                Kalendarz, aktywności, zadania, tagi
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                Plan AI — pomoc w planowaniu dnia i tygodnia w oparciu o Twoje dane
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
