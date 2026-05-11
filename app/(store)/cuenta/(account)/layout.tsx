import Image from "next/image";
import { Suspense } from "react";
import { syncStoreCustomerFromSession } from "@/app/actions/store-customer";
import { StoreAccountBirthdayBanner } from "@/components/store/StoreAccountBirthdayBanner";
import { StoreAccountHeroNav } from "@/components/store/StoreAccountHeroNav";
import { StoreSignOutButton } from "@/components/store/StoreSignOutButton";
import { STORE_ACCOUNT_HERO_IMAGE } from "@/lib/store-account-hero";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const shellClass =
  "w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10";
const innerClass = "mx-auto w-full max-w-7xl";

function accountHeroFirstName(displayName: string): string {
  const t =
    displayName.trim().split(/\s+/).filter(Boolean)[0] ?? displayName.trim();
  return t.toLocaleUpperCase("es-CO");
}

function CuentaAccountHero({
  heroName,
  birthDate,
}: {
  heroName: string;
  /** `undefined` = staff (sin banner). `null` o string = comprador; si hay fecha, el banner no se monta. */
  birthDate?: string | null;
}) {
  return (
    <>
      {birthDate !== undefined ? (
        <Suspense fallback={null}>
          <StoreAccountBirthdayBanner birthDate={birthDate} />
        </Suspense>
      ) : null}
      <section className="relative isolate min-h-[15.5rem] w-full sm:min-h-[19rem]">
        <Image
          src={STORE_ACCOUNT_HERO_IMAGE}
          alt=""
          fill
          className="object-cover object-[center_30%]"
          sizes="100vw"
          priority
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-stone-900/75 via-stone-900/40 to-stone-900/25"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-[15.5rem] flex-col items-center px-4 pb-10 pt-14 text-center sm:min-h-[19rem] sm:pb-12 sm:pt-16">
          <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-5">
            <StoreSignOutButton variant="hero" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90">
            Bienvenido de nuevo
          </p>
          <h1 className="mt-3 max-w-[90vw] truncate text-2xl font-semibold uppercase tracking-[0.14em] text-white sm:text-3xl md:text-4xl">
            {heroName}
          </h1>
          <StoreAccountHeroNav className="mt-8 sm:mt-10" />
        </div>
      </section>
    </>
  );
}

export default async function CuentaAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await syncStoreCustomerFromSession();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staffProfile } = user
    ? await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const meta = user?.user_metadata as { full_name?: string } | undefined;

  if (staffProfile) {
    const displayName =
      meta?.full_name?.trim() ||
      user?.email?.split("@")[0] ||
      "Administrador";
    const heroName = accountHeroFirstName(displayName);

    return (
      <div className="min-w-0 overflow-x-hidden bg-white">
        <CuentaAccountHero heroName={heroName} />
        <div className={shellClass}>
          <div className={innerClass}>{children}</div>
        </div>
      </div>
    );
  }

  const { data: customerBrief } = user
    ? await supabase
        .from("customers")
        .select("name, birth_date")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };

  const displayName =
    customerBrief?.name?.trim() ||
    meta?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Tu cuenta";

  const heroName = accountHeroFirstName(displayName);

  return (
    <div className="min-w-0 overflow-x-hidden bg-white">
      <CuentaAccountHero
        heroName={heroName}
        birthDate={
          customerBrief?.birth_date != null &&
          String(customerBrief.birth_date).trim() !== ""
            ? String(customerBrief.birth_date).slice(0, 10)
            : null
        }
      />
      <div className={shellClass}>
        <div className={innerClass}>{children}</div>
      </div>
    </div>
  );
}
