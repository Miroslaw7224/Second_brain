"use client";

import { MessageSquare, FileText, Search, Clock, FolderOpen } from "lucide-react";

export default function HeroProblemRow() {
  return (
    <section className="bg-[var(--bg)] px-6 pt-6 pb-24 sm:px-8 lg:px-12 xl:px-16 lg:pt-8 lg:pb-24" id="hero-problem">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 grid-rows-auto items-start gap-10 lg:grid-cols-2 lg:gap-12 lg:gap-x-16">
          <div className="flex justify-center pt-[4.5rem] lg:pt-[4.5rem]">
            <div className="rounded-2xl border border-[var(--border2)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] text-left w-full max-w-xl">
              <div className="flex items-center gap-2 text-[var(--text2)] text-sm mb-4">
                <MessageSquare className="h-4 w-4" />
                <span>Pytanie w chacie</span>
              </div>
              <p className="text-[var(--text)] font-medium mb-4">
                „Co ustaliliśmy z klientem X w marcu?”
              </p>
              <div className="h-px bg-[var(--border)] my-4" />
              <div className="flex items-center gap-2 text-[var(--text2)] text-sm mb-2">
                <FileText className="h-4 w-4" />
                <span>Odpowiedź AI ze źródłem</span>
              </div>
              <p className="text-[var(--text2)] text-sm">
                W marcu ustaliliście termin dostawy na 15.04, budżet 8000 zł i zakres wersji 1.0 według specyfikacji.
              </p>
              <p className="mt-2 text-xs text-[var(--text3)]">
                Źródło: notatka z 12.03, Ustalenia_Klient_X.pdf
              </p>
            </div>
          </div>
          <div className="flex flex-col max-w-3xl lg:max-w-none text-center">
            <h2 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">
              Znajome?
            </h2>
            <ul className="mt-10 space-y-6 text-left">
              <li className="flex items-start gap-4 rounded-xl bg-[var(--bg2)] p-4">
                <Search className="mt-0.5 h-6 w-6 shrink-0 text-[var(--text3)]" />
                <span className="text-[var(--text2)]">
                  „Gdzie ja to zapisałem… chyba w jakimś mailu z marca…”
                </span>
              </li>
              <li className="flex items-start gap-4 rounded-xl bg-[var(--bg2)] p-4">
                <Clock className="mt-0.5 h-6 w-6 shrink-0 text-[var(--text3)]" />
                <span className="text-[var(--text2)]">
                  Tracisz 30+ minut dziennie na szukanie ustaleń i wycen.
                </span>
              </li>
              <li className="flex items-start gap-4 rounded-xl bg-[var(--bg2)] p-4">
                <FolderOpen className="mt-0.5 h-6 w-6 shrink-0 text-[var(--text3)]" />
                <span className="text-[var(--text2)]">
                  Brak jednego miejsca na całą wiedzę o klientach i projektach.
                </span>
              </li>
            </ul>
            <p className="mt-10 text-lg font-medium text-[var(--text2)] text-center">
              Ile czasu w tym tygodniu straciłeś na szukanie?
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
