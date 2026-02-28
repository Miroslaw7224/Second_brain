"use client";

import { useAuth } from "@/src/lib/auth/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/auth/login");
  }, [user, loading, router]);

  if (loading)
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[var(--text)] animate-spin" />
      </div>
    );
  if (!user) return null;
  return <>{children}</>;
}
