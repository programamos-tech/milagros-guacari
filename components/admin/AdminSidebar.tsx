"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Suspense, type SVGProps } from "react";
import {
  adminSidebarLogoPath,
  bereaSignaturePath,
  storeBrand,
} from "@/lib/brand";

function Icon(props: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  const { children, className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-[18px] shrink-0 ${className}`}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

const STOREFRONT_HREF = "/";

function IconExternalStore({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Icon>
  );
}

const navSections: {
  title: string;
  items: { href: string; label: string; icon: React.ReactNode }[];
}[] = [
  {
    title: "Comercial",
    items: [
      {
        href: "/admin",
        label: "Reportes",
        icon: (
          <Icon>
            <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" />
          </Icon>
        ),
      },
      {
        href: "/admin/ventas",
        label: "Ventas",
        icon: (
          <Icon>
            <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z" />
            <path d="M9 8h6M9 12h6M9 16h4" />
          </Icon>
        ),
      },
      {
        href: "/admin/egresos",
        label: "Egresos",
        icon: (
          <Icon>
            <path d="M4 6h16v12H4z" />
            <path d="M8 10h8" />
            <path d="M8 14h5" />
          </Icon>
        ),
      },
      {
        href: "/admin/proveedores",
        label: "Proveedores",
        icon: (
          <Icon>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M12 18h-1M16 18h-1M8 18H7" />
          </Icon>
        ),
      },
      {
        href: "/admin/products",
        label: "Productos",
        icon: (
          <Icon>
            <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" />
            <path d="M3.3 7 12 12l8.7-5" />
          </Icon>
        ),
      },
      {
        href: "/admin/customers",
        label: "Clientes",
        icon: (
          <Icon>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </Icon>
        ),
      },
    ],
  },
  {
    title: "Configuración",
    items: [
      {
        href: "/admin/cuenta",
        label: "Mi cuenta",
        icon: (
          <Icon>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1" />
          </Icon>
        ),
      },
      {
        href: "/admin/usuarios",
        label: "Equipo",
        icon: (
          <Icon>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </Icon>
        ),
      },
      {
        href: "/admin/actividades",
        label: "Actividades",
        icon: (
          <Icon>
            <path d="M4 11h16" />
            <path d="M4 7h10" />
            <path d="M4 15h8" />
            <path d="M18 15h2" />
            <path d="M18 11h2" />
            <circle cx="18" cy="7" r="2" />
          </Icon>
        ),
      },
      {
        href: "/admin/banners",
        label: "Banners",
        icon: (
          <Icon>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 15h18" />
            <path d="m9 10 2 2 4-4" />
          </Icon>
        ),
      },
      {
        href: "/admin/coupons",
        label: "Cupones",
        icon: (
          <Icon>
            <path d="M20 12V8H4v4" />
            <path d="M12 8v11" />
            <path d="M8 19h8" />
            <path d="M8 5h8v3H8z" />
          </Icon>
        ),
      },
      {
        href: "/admin/settings",
        label: "Ajustes",
        icon: (
          <Icon>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </Icon>
        ),
      },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/") return false;
  const pathOnly = href.split("?")[0] ?? href;
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

const PRODUCTS_HREF = "/admin/products";
const VENTAS_HREF = "/admin/ventas";
/** Pedidos / facturas abren bajo esta ruta; debe seguir resaltando Ventas en el sidebar. */
const ORDERS_HREF = "/admin/orders";
const CUSTOMERS_HREF = "/admin/customers";
const COUPONS_HREF = "/admin/coupons";
const USUARIOS_HREF = "/admin/usuarios";
const PROVEEDORES_HREF = "/admin/proveedores";
const CUENTA_HREF = "/admin/cuenta";

function navItemActive(
  pathname: string,
  href: string,
): boolean {
  if (href === CUENTA_HREF) {
    return pathname === CUENTA_HREF || pathname.startsWith(`${CUENTA_HREF}/`);
  }
  if (href === USUARIOS_HREF) {
    return pathname === USUARIOS_HREF || pathname.startsWith(`${USUARIOS_HREF}/`);
  }
  if (href === VENTAS_HREF) {
    return (
      pathname === VENTAS_HREF ||
      pathname.startsWith(`${VENTAS_HREF}/`) ||
      pathname === ORDERS_HREF ||
      pathname.startsWith(`${ORDERS_HREF}/`)
    );
  }
  if (href === PRODUCTS_HREF) {
    return pathname === PRODUCTS_HREF || pathname.startsWith(`${PRODUCTS_HREF}/`);
  }
  if (href === CUSTOMERS_HREF) {
    return pathname === CUSTOMERS_HREF || pathname.startsWith(`${CUSTOMERS_HREF}/`);
  }
  if (href === COUPONS_HREF) {
    return pathname === COUPONS_HREF || pathname.startsWith(`${COUPONS_HREF}/`);
  }
  if (href === PROVEEDORES_HREF) {
    return pathname === PROVEEDORES_HREF || pathname.startsWith(`${PROVEEDORES_HREF}/`);
  }
  return isActive(pathname, href);
}

const sidebarInk = "text-rose-950/80 dark:text-rose-950/75";
const sidebarInkMuted = "text-rose-950/65 dark:text-rose-950/60";

function SidebarLogo() {
  return (
    <Link
      href="/admin"
      prefetch
      className="inline-block rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-rose-400/80 focus-visible:ring-offset-0"
    >
      <Image
        src={adminSidebarLogoPath}
        alt={storeBrand}
        width={320}
        height={320}
        className="h-auto w-full max-w-[72px] object-contain object-center sm:max-w-[76px]"
        priority
      />
    </Link>
  );
}

function AdminSidebarInner({
  allowedNavHrefs,
  mobileOpen,
  onNavigate,
}: {
  allowedNavHrefs: string[];
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const allowed = new Set(allowedNavHrefs);

  const navSectionsFiltered = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowed.has(item.href)),
    }))
    .filter((section) => section.items.length > 0);

  const linkClass = (href: string, active: boolean) =>
    [
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-200",
      active
        ? "bg-rose-950 text-white shadow-[0_8px_22px_-12px_rgba(136,19,55,0.35)] dark:bg-rose-950 dark:text-rose-50 dark:shadow-[0_8px_22px_-12px_rgba(0,0,0,0.2)]"
        : "text-rose-950/80 hover:bg-rose-950/10 hover:text-rose-950 dark:text-rose-950/75 dark:hover:bg-rose-950/15 dark:hover:text-rose-950",
    ].join(" ");

  const drawerTranslate =
    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0";

  /** Drawer cerrado en móvil: sin foco ni clics; en lg siempre interactuable. */
  const drawerHiddenMobile =
    !mobileOpen
      ? "max-lg:invisible max-lg:pointer-events-none lg:!visible lg:!pointer-events-auto"
      : "";

  return (
    <aside
      className={`flex shrink-0 flex-col border-rose-300/35 bg-[var(--admin-sidebar-bg)] shadow-[2px_0_32px_-16px_rgba(190,24,93,0.12)] transition-transform duration-300 ease-out motion-reduce:transition-none print:hidden dark:border-rose-400/25 dark:shadow-[2px_0_32px_-16px_rgba(131,24,67,0.18)] fixed inset-y-0 left-0 z-[50] w-[min(88vw,288px)] max-w-[288px] border-r lg:w-64 lg:max-w-none lg:border-b-0 lg:shadow-[1px_0_0_rgba(244,114,182,0.35)] dark:lg:shadow-[1px_0_0_rgba(190,24,93,0.25)] ${drawerTranslate} ${drawerHiddenMobile}`}
    >
      <div className="flex flex-col items-center border-b border-rose-300/40 px-4 py-6 text-center dark:border-rose-400/30">
        <SidebarLogo />
        <p
          className={`mt-3 text-[9px] font-semibold uppercase tracking-[0.22em] ${sidebarInk}`}
        >
          Backoffice
        </p>
      </div>
      <nav
        id="admin-sidebar-nav"
        className="admin-sidebar-nav-scroll flex-1 space-y-7 overflow-y-auto overscroll-contain px-3 py-5"
      >
        {navSectionsFiltered.map((section) => (
          <div key={section.title}>
            <p
              className={`px-3 text-[10px] font-semibold uppercase tracking-[0.22em] ${sidebarInkMuted}`}
            >
              {section.title}
            </p>
            <ul className="mt-2.5 space-y-0.5">
              {section.items.map((item) => {
                const active = navItemActive(pathname, item.href);
                return (
                  <li key={`${section.title}-${item.label}`}>
                    <Link
                      href={item.href}
                      prefetch
                      className={linkClass(item.href, active)}
                      onClick={() => onNavigate()}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-rose-300/40 px-3 pb-4 pt-3 dark:border-rose-400/30">
        {allowed.has(STOREFRONT_HREF) ? (
          <Link
            href={STOREFRONT_HREF}
            prefetch
            onClick={() => onNavigate()}
            className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-lg border border-rose-950/20 bg-white/70 px-3 py-2.5 text-sm font-semibold text-rose-950 shadow-sm transition hover:border-rose-950/35 hover:bg-white dark:border-rose-400/25 dark:bg-zinc-900/50 dark:text-rose-50 dark:hover:border-rose-400/40 dark:hover:bg-zinc-900/80"
          >
            <IconExternalStore />
            Ir a la tienda
          </Link>
        ) : null}
        <div className="flex flex-col items-center gap-1 px-1 text-center">
          <span
            className={`text-[8px] font-medium uppercase tracking-[0.2em] ${sidebarInk}`}
          >
            Experiencia por
          </span>
          <Image
            src={bereaSignaturePath}
            alt="Berea — diseño y desarrollo"
            width={320}
            height={82}
            className="h-10 w-auto max-w-[min(100%,8.75rem)] object-contain object-center mix-blend-multiply invert sm:h-11 sm:max-w-[10rem]"
          />
        </div>
      </div>
    </aside>
  );
}

function AdminSidebarFallback() {
  return (
    <aside className="fixed inset-y-0 left-0 z-[45] hidden w-64 flex-col border-r border-rose-300/35 bg-[var(--admin-sidebar-bg)] print:hidden dark:border-rose-400/25 lg:flex lg:flex-col">
      <div className="flex flex-col items-center border-b border-rose-300/40 px-4 py-6 text-center dark:border-rose-400/30">
        <SidebarLogo />
        <p
          className={`mt-3 text-[9px] font-semibold uppercase tracking-[0.22em] ${sidebarInk}`}
        >
          Backoffice
        </p>
      </div>
      <div className="flex-1 px-3 py-5" aria-busy aria-label="Cargando menú" />
      <div className="shrink-0 border-t border-rose-300/40 px-3 pb-4 pt-3 dark:border-rose-400/30">
        <div className="flex flex-col items-center gap-1">
          <div className="h-2.5 w-16 rounded bg-rose-200/70 dark:bg-rose-300/40" aria-hidden />
          <div className="h-10 w-[8.75rem] max-w-full rounded bg-rose-200/60 dark:bg-rose-300/35 sm:h-11" aria-hidden />
        </div>
      </div>
    </aside>
  );
}

export function AdminSidebar({
  allowedNavHrefs,
  mobileOpen,
  onNavigate,
}: {
  allowedNavHrefs: string[];
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  return (
    <Suspense fallback={<AdminSidebarFallback />}>
      <AdminSidebarInner
        allowedNavHrefs={allowedNavHrefs}
        mobileOpen={mobileOpen}
        onNavigate={onNavigate}
      />
    </Suspense>
  );
}
