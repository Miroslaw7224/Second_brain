"use client";

import React from "react";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="bg-slate-900 px-6 pt-6 pb-24 sm:px-8 lg:px-12 xl:px-16 lg:pt-8 lg:pb-24" id="cta">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Odpowiedzi w sekundach, nie w minutach
        </h2>
        <p className="mt-4 text-lg text-slate-300">
          Jedno miejsce na wiedzę. Chat z AI po Twoich danych. Źródło przy każdej odpowiedzi.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-lg font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Zacznij za darmo
          </Link>
        </div>
        <p className="mt-6 text-sm text-slate-400">
          Bez karty. Anuluj kiedy chcesz.
        </p>
        </div>
      </div>
    </section>
  );
}
