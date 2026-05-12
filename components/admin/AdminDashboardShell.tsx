"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export function AdminDashboardShell({
  children,
  allowedNavHrefs,
}: {
  children: React.ReactNode;
  /** Hrefs del menú lateral permitidos para esta sesión (incluye `/admin/cuenta` y `/`). */
  allowedNavHrefs: string[];
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const closeNav = () => setMobileNavOpen(false);

  return (
    <div className="isolate flex min-h-screen items-stretch antialiased">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[40] bg-black/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Cerrar menú"
          onClick={closeNav}
        />
      ) : null}

      <AdminSidebar
        allowedNavHrefs={allowedNavHrefs}
        mobileOpen={mobileNavOpen}
        onNavigate={closeNav}
      />

      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col overflow-x-visible overflow-y-visible bg-gradient-to-b from-rose-50/40 via-stone-50/95 to-stone-100/90 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 lg:ml-64 print:ml-0 print:bg-white">
        <AdminTopBar
          menuOpen={mobileNavOpen}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6 print:bg-white print:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
