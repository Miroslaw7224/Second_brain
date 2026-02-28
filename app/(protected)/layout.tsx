"use client";

import { useAuth } from "@/src/lib/auth/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getFirebaseAuth } from "@/src/lib/firebase-client";
import { signOut } from "firebase/auth";

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

  useEffect(() => {
    if (loading || !user) return;
    const auth = getFirebaseAuth();
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (cancelled || !token) return;
        const res = await fetch("/api/waitlist/check", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.status === 403) {
          await signOut(auth);
          router.replace("/auth/login");
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
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
