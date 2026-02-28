"use client";

import Link from "next/link";
import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <section className="bg-[var(--bg)] px-6 pt-4 pb-24 sm:px-8 lg:px-12 xl:px-16 lg:pt-6 lg:pb-24" id="cennik">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold text-[var(--text)] sm:text-4xl">
          Cennik
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-[var(--border2)] bg-[var(--surface)] p-8">
            <h3 className="text-xl font-semibold text-[var(--text)]">Free Trial</h3>
            <p className="mt-2 text-3xl font-bold text-[var(--text)]">7 dni</p>
            <p className="mt-2 text-[var(--text2)]">Pełny dostęp, bez karty.</p>
            <ul className="mt-6 space-y-2 text-[var(--text2)]">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-[var(--green)]" />
                Pełny dostęp do obu modułów
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-[var(--green)]" />
                Anuluj kiedy chcesz
              </li>
            </ul>
            <Link
              href="/auth/login"
              className="mt-8 block w-full rounded-xl bg-[var(--accent)] py-3 text-center font-semibold text-white transition hover:brightness-110"
            >
              Zacznij za darmo
            </Link>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <h3 className="text-xl font-semibold text-[var(--text)]">Solo</h3>
            <p className="mt-2 text-3xl font-bold text-[var(--text)]">~19 $/msc</p>
            <p className="mt-2 text-[var(--text2)]">Limit dokumentów (np. 50), nielimitowany chat.</p>
            <ul className="mt-6 space-y-2 text-[var(--text2)]">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-[var(--green)]" />
                Do 50 dokumentów
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-[var(--green)]" />
                Nielimitowany chat z AI
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
