"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-12 sm:px-8 lg:px-12 xl:px-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <p className="text-sm text-slate-600">
          Second Brain · Freelancer Edition
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <Link href="#" className="text-slate-600 hover:text-slate-900">
            Regulamin
          </Link>
          <Link href="#" className="text-slate-600 hover:text-slate-900">
            Polityka prywatności
          </Link>
          <Link href="#" className="text-slate-600 hover:text-slate-900">
            Kontakt
          </Link>
        </nav>
      </div>
    </footer>
  );
}
