"use client";

import { useAuth } from "@/src/lib/auth/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
    else router.replace("/auth/login");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-black animate-spin" />
    </div>
  );
}
