export function StoreHeaderSkeleton() {
  return (
    <header aria-hidden="true">
      <div className="h-9 animate-pulse bg-stone-100" />
      <div className="border-b border-white/20 bg-[var(--store-header-bg)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-[4.5rem]">
          <div className="h-8 w-28 animate-pulse rounded bg-white/20" />
          <div className="hidden flex-1 justify-center gap-6 px-8 md:flex">
            <div className="h-4 w-16 animate-pulse rounded bg-white/20" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/20" />
            <div className="h-4 w-14 animate-pulse rounded bg-white/20" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </header>
  );
}
