"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-6 pt-16 pb-24 sm:px-8 lg:px-12 xl:px-16 lg:pb-24" id="hero">
      <div className="mx-auto max-w-7xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Przestań szukać. Zacznij pytać.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600 sm:text-xl">
          Dla freelancerów z wieloma klientami: jedna baza dokumentów i notatek, rozmowa z AI po Twojej wiedzy — odpowiedzi w sekundach, ze wskazaniem źródła.
        </p>
        <div className="mt-10">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Zacznij za darmo
          </Link>
        </div>
      </div>
    </section>
  );
}
