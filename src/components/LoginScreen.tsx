"use client";

import React, { useState } from "react";
import { Brain } from "lucide-react";
import { getFirebaseAuth } from "../lib/firebase-client";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";
import { useRouter } from "next/navigation";

const tEn = {
  login: "Login",
  register: "Register",
  email: "Email",
  password: "Password",
  signInGoogle: "Sign in with Google",
  continueGuest: "Continue as Guest",
  noAccount: "Don't have an account?",
  hasAccount: "Already have an account?",
  name: "Name",
};
const tPl = {
  login: "Zaloguj się",
  register: "Zarejestruj się",
  email: "Email",
  password: "Hasło",
  signInGoogle: "Zaloguj przez Google",
  continueGuest: "Kontynuuj jako Gość",
  noAccount: "Nie masz konta?",
  hasAccount: "Masz już konto?",
  name: "Imię",
};

const tMap = { en: tEn, pl: tPl } as const;

export default function LoginScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "pl">("pl");
  const t = tMap[lang];
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");

  const goDashboard = () => router.replace("/dashboard");

  const handleGoogleLogin = async () => {
    setAuthError("");
    try {
      const auth = getFirebaseAuth();
      await signInWithPopup(auth, new GoogleAuthProvider());
      goDashboard();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const auth = getFirebaseAuth();
    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name?.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      }
      goDashboard();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    }
  };

  const handleGuestLogin = async () => {
    setAuthError("");
    try {
      await signInAnonymously(getFirebaseAuth());
      goDashboard();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Guest sign-in failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-black/5 border border-[#E5E7EB] overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Brain className="text-white w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg tracking-tight">Second Brain</h1>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">
                Freelancer Edition
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "pl" : "en")}
              className="px-2 py-1 bg-[#F3F4F6] rounded text-[10px] font-bold hover:bg-[#E5E7EB] transition-colors"
            >
              {lang === "en" ? "PL" : "EN"}
            </button>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            {authMode === "login" ? t.login : t.register}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="block text-xs font-bold text-[#4B5563] uppercase mb-1">
                  {t.name}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-black transition-all"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-[#4B5563] uppercase mb-1">
                {t.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4B5563] uppercase mb-1">
                {t.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
            {authError && (
              <p className="text-xs text-red-500 font-medium">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-black text-white rounded-xl font-bold hover:scale-[1.02] transition-all"
            >
              {authMode === "login" ? t.login : t.register}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E7EB]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[#9CA3AF] font-bold">Or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 p-3 bg-white border border-[#E5E7EB] rounded-xl text-sm font-semibold text-[#4B5563] hover:bg-[#F9FAFB] transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t.signInGoogle}
          </button>

          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full mt-3 py-3 bg-[#F3F4F6] text-[#4B5563] rounded-xl text-sm font-bold hover:bg-[#E5E7EB] transition-all"
          >
            {t.continueGuest}
          </button>

          <p className="text-center mt-8 text-sm text-[#6B7280]">
            {authMode === "login" ? t.noAccount : t.hasAccount}{" "}
            <button
              type="button"
              onClick={() =>
                setAuthMode(authMode === "login" ? "register" : "login")
              }
              className="font-bold text-black hover:underline"
            >
              {authMode === "login" ? t.register : t.login}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
