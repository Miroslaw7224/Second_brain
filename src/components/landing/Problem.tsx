"use client";

import React from "react";
import { Search, Clock, FolderOpen } from "lucide-react";

export default function Problem() {
  return (
    <section className="bg-white px-6 py-20 sm:px-8 lg:px-12 xl:px-16" id="problem">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Znajome?
        </h2>
        <ul className="mt-10 space-y-6 text-left">
          <li className="flex items-start gap-4 rounded-xl bg-slate-50 p-4">
            <Search className="mt-0.5 h-6 w-6 shrink-0 text-slate-400" />
            <span className="text-slate-700">
              „Gdzie ja to zapisałem… chyba w jakimś mailu z marca…”
            </span>
          </li>
          <li className="flex items-start gap-4 rounded-xl bg-slate-50 p-4">
            <Clock className="mt-0.5 h-6 w-6 shrink-0 text-slate-400" />
            <span className="text-slate-700">
              Tracisz 30+ minut dziennie na szukanie ustaleń i wycen.
            </span>
          </li>
          <li className="flex items-start gap-4 rounded-xl bg-slate-50 p-4">
            <FolderOpen className="mt-0.5 h-6 w-6 shrink-0 text-slate-400" />
            <span className="text-slate-700">
              Brak jednego miejsca na całą wiedzę o klientach i projektach.
            </span>
          </li>
        </ul>
        <p className="mt-10 text-lg font-medium text-slate-600">
          Ile czasu w tym tygodniu straciłeś na szukanie?
        </p>
        </div>
      </div>
    </section>
  );
}
