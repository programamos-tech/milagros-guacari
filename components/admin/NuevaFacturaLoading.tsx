/** Skeleton mientras carga el formulario de nueva factura (POS). */
export function NuevaFacturaLoading() {
  return (
    <div
      className="space-y-6 pb-8"
      role="status"
      aria-live="polite"
      aria-label="Cargando formulario de factura"
    >
      <span className="sr-only">Cargando formulario de factura…</span>
      <div className="space-y-2">
        <div className="h-9 w-56 max-w-[70%] animate-pulse rounded-lg bg-zinc-200/80 dark:bg-zinc-800/90 motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-md bg-zinc-200/55 dark:bg-zinc-800/70 motion-reduce:animate-none" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-xl border border-zinc-200/50 bg-zinc-100/50 dark:border-zinc-700/50 dark:bg-zinc-900/40 motion-reduce:animate-none" />
          <div className="h-64 animate-pulse rounded-2xl border border-rose-200/35 bg-white/50 dark:border-zinc-700/60 dark:bg-zinc-900/50 motion-reduce:animate-none sm:h-80" />
        </div>
        <div className="h-72 animate-pulse rounded-2xl border border-zinc-200/50 bg-zinc-100/40 dark:border-zinc-700/50 dark:bg-zinc-900/40 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
