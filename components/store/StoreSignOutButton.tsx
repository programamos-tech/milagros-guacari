"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function StoreSignOutButton({
  variant = "default",
}: {
  variant?: "default" | "hero";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setLoading(false);
    router.replace("/");
    router.refresh();
  }

  const heroClass =
    "rounded-none border border-white/85 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-none backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-60 sm:text-[11px]";
  const defaultClass =
    "rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-[var(--store-accent)] shadow-sm transition hover:border-stone-400 hover:bg-stone-50 disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={variant === "hero" ? heroClass : defaultClass}
    >
      {loading ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}
