"use client";

import React from "react";
import { UserCheck } from "lucide-react";

const points = [
  "Obsługujesz wielu klientów jednocześnie",
  "Szukasz ustaleń w mailach i notatkach",
  "Chcesz jednego miejsca na całą wiedzę o projektach",
  "Nie chcesz gubić kontekstu między zleceniami",
];

export default function ForWho() {
  return (
    <section className="bg-white px-6 pt-6 pb-24 sm:px-8 lg:px-12 xl:px-16 lg:pt-8 lg:pb-24" id="dla-kogo">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Dla kogo
        </h2>
        <p className="mt-4 text-lg text-slate-600">
          Freelancerzy z wieloma klientami. Osoby, które chcą przestać gubić kontekst między projektami.
        </p>
        <p className="mt-8 font-semibold text-slate-800">
          Dla Ciebie, jeśli…
        </p>
        <ul className="mt-6 space-y-3 text-left">
          {points.map((point, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <UserCheck className="h-5 w-5 shrink-0 text-slate-500" />
              <span className="text-slate-700">{point}</span>
            </li>
          ))}
        </ul>
        </div>
      </div>
    </section>
  );
}
