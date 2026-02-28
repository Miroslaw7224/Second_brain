"use client";

import Link from "next/link";
import { ThemeToggle } from "@/src/components/theme/ThemeToggle";
import Footer from "@/src/components/landing/Footer";
import { ArrowLeft } from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--surface)_80%,transparent)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12 xl:px-16">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[var(--text2)] hover:text-[var(--text)] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Strona główna
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/auth/login"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              Zaloguj się
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-8 lg:px-12">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Polityka plików cookies
        </h1>
        <p className="text-sm text-[var(--text3)] mb-10">
          Ostatnia aktualizacja: luty 2025
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-[var(--text2)] text-sm leading-relaxed [&_strong]:text-[var(--text)] [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-2">
          <section>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">
              1. Czym są pliki cookies
            </h2>
            <p>
              Pliki cookies to małe pliki tekstowe zapisywane na Twoim urządzeniu
              podczas odwiedzania strony. Służą m.in. do zapamiętania preferencji,
              utrzymania sesji logowania oraz analizy ruchu (jeśli korzystamy z
              narzędzi analitycznych).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">
              2. Jakich cookies używamy
            </h2>
            <ul className="list-disc ml-4 space-y-2">
              <li>
                <strong>Niezbędne</strong> — umożliwiają działanie strony
                (np. sesja, uwierzytelnianie). Bez nich nie da się w pełni
                korzystać z usługi.
              </li>
              <li>
                <strong>Preferencje</strong> — zapisują ustawienia (np. wybór
                motywu jasny/ciemny), aby nie trzeba było ich wybierać przy
                każdej wizycie.
              </li>
              <li>
                <strong>Analityczne</strong> — jeśli są wdrożone, służą do
                zrozumienia, jak użytkownicy korzystają ze strony (np. Google
                Analytics). Mogą być powiązane z polityką prywatności dostawcy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">
              3. Zgoda i zarządzanie cookies
            </h2>
            <p>
              Zgodnie z obowiązującymi przepisami (w tym Prawem telekomunikacyjnym
              i RODO) pliki inne niż niezbędne wymagają Twojej zgody. Możesz
              wyrazić lub wycofać zgodę w ustawieniach cookies (jeśli dostępne na
              stronie) lub w ustawieniach przeglądarki. Wyłączenie lub usunięcie
              cookies może ograniczyć funkcjonalność serwisu.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">
              4. Czas przechowywania
            </h2>
            <p>
              Cookies sesyjne są usuwane po zamknięciu przeglądarki. Cookies
              stałe pozostają do momentu ich wygaśnięcia (ustawionego w pliku)
              lub do momentu ich ręcznego usunięcia w przeglądarce.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">
              5. Więcej informacji
            </h2>
            <p>
              Szczegóły dotyczące przetwarzania danych osobowych znajdziesz w{" "}
              <Link href="/politika-prywatnosci">Polityce prywatności</Link>.
              W razie pytań napisz na{" "}
              <a href="mailto:miro.job7224@gmail.com">miro.job7224@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
