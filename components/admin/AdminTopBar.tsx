import Link from "next/link";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { AdminThemeToggle } from "@/components/admin/AdminThemeToggle";
import { AdminUserMenu } from "@/components/admin/AdminUserMenu";
import { CustomerAvatar } from "@/components/admin/CustomerAvatar";
import {
  adminOwnerAvatarSeed,
  adminOwnerDisplayName,
  adminOwnerEmail,
} from "@/lib/admin-owner";

function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" className="size-5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.2-1.7c.6.6.8 1.5.5 2.3-.4 1-1.2 1.4-1.7 2.1-.2.3-.3.6-.3 1.1V14" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconPulse() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M4 12h3l2-6 4 12 2-6h5" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" className="size-5" aria-hidden>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M9 17h6M7 13H5m14-4h-4" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-6" aria-hidden>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

type AdminTopBarProps = {
  onMenuClick?: () => void;
  menuOpen?: boolean;
};

export function AdminTopBar({ onMenuClick, menuOpen }: AdminTopBarProps = {}) {
  return (
    <header className="sticky top-0 z-50 w-full min-w-0 overflow-visible border-b border-rose-200/50 bg-white/88 backdrop-blur-md print:hidden dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="flex h-14 min-w-0 items-center gap-2 overflow-visible px-3 sm:h-16 sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-rose-950 transition hover:bg-rose-100/60 active:bg-rose-100 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:active:bg-zinc-700/80 lg:hidden"
          aria-label="Abrir menú"
          aria-expanded={menuOpen ?? false}
          aria-controls="admin-sidebar-nav"
        >
          <IconMenu />
        </button>

        {/* Navbar backoffice: buscador global (sin spacer extra: el sidebar ya ocupa su columna) */}
        <div className="flex min-w-0 flex-1 basis-0 items-center overflow-visible">
          <div className="w-full min-w-0 overflow-visible pl-0.5">
            <AdminGlobalSearch />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="lg:hidden">
            <AdminThemeToggle />
          </div>
          <Link
            href="/admin/ventas/nueva"
            className="flex size-9 items-center justify-center rounded-full border border-rose-950 bg-rose-950 text-lg font-light leading-none text-white shadow-[0_8px_24px_-12px_rgba(136,19,55,0.35)] transition hover:bg-rose-900 hover:shadow-[0_10px_28px_-12px_rgba(136,19,55,0.4)] sm:size-10"
            title="Nueva factura"
          >
            +
          </Link>
          <div className="ml-0.5 hidden items-center gap-0.5 border-l border-rose-200/55 pl-2 dark:border-zinc-700 lg:flex">
            <AdminThemeToggle />
            <button
              type="button"
              className="rounded-lg p-2 text-rose-900/45 transition hover:bg-rose-100/55 hover:text-rose-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Ayuda"
            >
              <IconHelp />
            </button>
            <Link
              href="/admin/actividades"
              className="rounded-lg p-2 text-rose-900/45 transition hover:bg-rose-100/55 hover:text-rose-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Registro de actividades"
            >
              <IconPulse />
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-lg p-2 text-rose-900/45 transition hover:bg-rose-100/55 hover:text-rose-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Ajustes"
            >
              <IconSliders />
            </Link>
            <button
              type="button"
              className="rounded-lg p-2 text-rose-900/45 transition hover:bg-rose-100/55 hover:text-rose-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Notificaciones"
            >
              <IconBell />
            </button>
          </div>

          <AdminUserMenu
            displayName={adminOwnerDisplayName}
            email={adminOwnerEmail}
            avatar={
              <CustomerAvatar
                seed={adminOwnerAvatarSeed}
                size={40}
                label={`Avatar de ${adminOwnerDisplayName}`}
              />
            }
          />
        </div>
      </div>
    </header>
  );
}
