"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg)] px-6 pt-16 pb-24 sm:px-8 lg:px-12 xl:px-16 lg:pb-24" id="hero">
      <div className="mx-auto max-w-7xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl lg:text-6xl">
          Przestań szukać. Zacznij pytać.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-[var(--text2)] sm:text-xl">
          Dla freelancerów z wieloma klientami: jedna baza dokumentów i notatek, rozmowa z AI po Twojej wiedzy — odpowiedzi w sekundach, ze wskazaniem źródła.
        </p>
        <div className="mt-10">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
          >
            Zacznij za darmo
          </Link>
        </div>
      </div>
    </section>
  );
}
