"use client";

import React, { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error ?? "Coś poszło nie tak.");
        return;
      }
      setStatus("success");
      setMessage(data?.message ?? "Dziękujemy! Zostałeś dodany do listy.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Błąd połączenia. Spróbuj ponownie.");
    }
  }

  return (
    <div className="mt-6 max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Twój adres e-mail"
          disabled={status === "loading" || status === "success"}
          className="flex-1 min-w-0 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-60"
          aria-label="Adres e-mail do listy oczekujących"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "success" || !email.trim()}
          className="rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg2)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Zapisywanie…" : status === "success" ? "Zapisano" : "Dołącz do listy"}
        </button>
      </form>
      {message && (
        <p
          role="alert"
          className={`text-sm mt-2 ${status === "error" ? "text-red-500" : "text-[var(--text2)]"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
