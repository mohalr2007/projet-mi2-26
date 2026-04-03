'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

export default function CommunityPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function redirectToCommunity() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .single();

      if (!isMounted) {
        return;
      }

      if (profile?.account_type === "doctor") {
        router.replace("/dashboardoctlarabi?tab=community");
        return;
      }

      router.replace("/dashboardpatientlarabi?tab=community");
    }

    void redirectToCommunity();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <p className="text-slate-600 dark:text-slate-300 font-medium">Chargement de la communauté...</p>
    </div>
  );
}
