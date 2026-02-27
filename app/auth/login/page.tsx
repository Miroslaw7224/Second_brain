"use client";

import { useAuth } from "@/src/lib/auth/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoginScreen from "@/src/components/LoginScreen";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading)
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="animate-pulse text-[#9CA3AF]">Ładowanie...</div>
      </div>
    );
  if (user) return null;
  return <LoginScreen />;
}
