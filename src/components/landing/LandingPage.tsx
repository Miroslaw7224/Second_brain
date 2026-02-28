"use client";

import React from "react";
import Link from "next/link";
import Hero from "./Hero";
import HeroProblemRow from "./HeroProblemRow";
import BeforeAfterHowItWorksRow from "./BeforeAfterHowItWorksRow";
import Features from "./Features";
import ForWho from "./ForWho";
import Pricing from "./Pricing";
import CTA from "./CTA";
import FAQ from "./FAQ";
import Footer from "./Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12 xl:px-16">
          <span className="text-lg font-semibold text-slate-900">
            Second Brain
          </span>
          <Link
            href="/auth/login"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Zaloguj się
          </Link>
        </div>
      </header>
      <main>
        <Hero />
        <HeroProblemRow />
        <BeforeAfterHowItWorksRow />
        <Features />
        <ForWho />
        <Pricing />
        <CTA />
        <FAQ />
        <Footer />
      </main>
    </div>
  );
}
