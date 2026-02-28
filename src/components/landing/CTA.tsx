"use client";

import React from "react";
import Link from "next/link";
import WaitlistForm from "./WaitlistForm";

export default function CTA() {
  return (
    <section className="bg-[var(--bg2)] px-6 pt-6 pb-24 sm:px-8 lg:px-12 xl:px-16 lg:pt-8 lg:pb-24 border-y border-[var(--border)]" id="cta">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-[var(--text)] sm:text-4xl">
          Odpowiedzi w sekundach, nie w minutach
        </h2>
        <p className="mt-4 text-lg text-[var(--text2)]">
          Jedno miejsce na wiedzę. Chat z AI po Twoich danych. Źródło przy każdej odpowiedzi.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-8 py-4 text-lg font-semibold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg2)]"
          >
            Zacznij za darmo
          </Link>
        </div>
        <p className="mt-6 text-sm text-[var(--text3)]">
          Bez karty. Anuluj kiedy chcesz.
        </p>
        <p className="mt-8 text-sm text-[var(--text2)]">
          Chcesz wiedzieć, gdy pojawią się nowe funkcje? Dołącz do listy oczekujących.
        </p>
        <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
