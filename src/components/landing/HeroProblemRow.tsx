"use client";

import { MessageSquare, FileText, Search, Clock, FolderOpen } from "lucide-react";

export default function HeroProblemRow() {
  return (
    <section className="bg-white px-6 pt-6 pb-24 sm:px-8 lg:px-12 xl:px-16 lg:pt-8 lg:pb-24" id="hero-problem">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 grid-rows-auto items-start gap-10 lg:grid-cols-2 lg:gap-12 lg:gap-x-16">
          {/* Lewa kolumna: Pytanie w chacie — karta wyśrodkowana w kolumnie */}
          <div className="flex justify-center pt-[4.5rem] lg:pt-[4.5rem]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 text-left w-full max-w-xl">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                <MessageSquare className="h-4 w-4" />
                <span>Pytanie w chacie</span>
              </div>
              <p className="text-slate-800 font-medium mb-4">
                „Co ustaliliśmy z klientem X w marcu?”
              </p>
              <div className="h-px bg-slate-100 my-4" />
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <FileText className="h-4 w-4" />
                <span>Odpowiedź AI ze źródłem</span>
              </div>
              <p className="text-slate-700 text-sm">
                W marcu ustaliliście termin dostawy na 15.04, budżet 8000 zł i zakres wersji 1.0 według specyfikacji.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Źródło: notatka z 12.03, Ustalenia_Klient_X.pdf
              </p>
            </div>
          </div>
          {/* Prawa kolumna: Znajome? */}
          <div className="flex flex-col max-w-3xl lg:max-w-none text-center">
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
            <p className="mt-10 text-lg font-medium text-slate-600 text-center">
              Ile czasu w tym tygodniu straciłeś na szukanie?
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
