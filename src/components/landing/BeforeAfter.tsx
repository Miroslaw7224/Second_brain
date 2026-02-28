"use client";

import { X, Check } from "lucide-react";

export default function BeforeAfter() {
  return (
    <section className="bg-slate-50 px-6 py-20 sm:px-8 lg:px-12 xl:px-16" id="przed-po">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl">
          Przed vs Po
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-red-600 font-semibold">
              <X className="h-5 w-5" />
              Przed
            </div>
            <p className="mt-4 text-slate-700">
              Przekopywanie maili i notatek przez 30 minut — żeby znaleźć jedną ustalenie.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <Check className="h-5 w-5" />
              Po
            </div>
            <p className="mt-4 text-slate-700">
              Jedno pytanie w chacie → konkretna odpowiedź w 3 sekundy, z linkiem do źródła.
            </p>
          </div>
        </div>
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-left">
          <p className="text-sm font-medium text-slate-500">Mini-scenariusz</p>
          <p className="mt-2 text-slate-800">
            <strong>Pytanie:</strong> Co ustaliliśmy z klientem X? →
            <strong className="ml-1"> Odpowiedź:</strong> W marcu ustaliliście termin 15.04, budżet 8000 zł. [Źródło: notatka z 12.03]
          </p>
        </div>
      </div>
    </section>
  );
}
