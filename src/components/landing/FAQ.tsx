"use client";

import React from "react";

export default function FAQ() {
  const items = [
    {
      q: "Czy moje dane są bezpieczne?",
      a: "Tak. Przechowujemy dane w Firebase z zabezpieczeniami dostępu. Indeksowanie i odpowiedzi AI działają na Twoich materiałach — nie udostępniamy ich innym.",
    },
    {
      q: "Czy potrzebuję karty do trial?",
      a: "Nie. Free Trial przez 7 dni jest bez podawania karty. Możesz anulować w dowolnym momencie.",
    },
    {
      q: "Jak działa RAG?",
      a: "RAG (Retrieval-Augmented Generation) to w skrócie: AI najpierw szuka w Twoich dokumentach fragmentów pasujących do pytania, a potem na ich podstawie układa odpowiedź. Dzięki temu odpowiada tylko na podstawie Twojej bazy, a nie ogólnej wiedzy z internetu.",
    },
    {
      q: "Czy mogę anulować w każdej chwili?",
      a: "Tak. Możesz zrezygnować z subskrypcji w dowolnym momencie. Po anulowaniu masz dostęp do końca opłaconego okresu; potem Twoje dane są przechowywane zgodnie z polityką prywatności.",
    },
  ];

  return (
    <section className="bg-[var(--bg)] px-6 pt-6 pb-24 sm:px-8 lg:px-12 xl:px-16 lg:pt-8 lg:pb-24" id="faq">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold text-[var(--text)] sm:text-4xl">
          FAQ
        </h2>
        <ul className="mt-12 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
          {items.map((item, i) => (
            <li key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6">
              <h3 className="font-semibold text-[var(--text)]">{item.q}</h3>
              <p className="mt-2 text-[var(--text2)]">{item.a}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
