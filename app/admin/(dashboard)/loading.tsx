/**
 * Se muestra de inmediato al cambiar de módulo (mientras el Server Component
 * de la página termina). Mejora la sensación de velocidad sin bloquear el shell.
 */
export default function AdminDashboardRouteLoading() {
  return (
    <div
      className="space-y-8 pb-8"
      role="status"
      aria-live="polite"
      aria-label="Cargando sección"
    >
      <span className="sr-only">Cargando…</span>
      <div className="space-y-3">
        <div className="h-9 w-48 max-w-[60%] animate-pulse rounded-lg bg-zinc-200/80 dark:bg-zinc-800/90 motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded-md bg-zinc-200/55 dark:bg-zinc-800/70 motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-zinc-200/40 dark:bg-zinc-800/50 motion-reduce:animate-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-zinc-200/50 bg-zinc-100/40 dark:border-zinc-700/50 dark:bg-zinc-900/40 motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-rose-200/35 bg-white/50 dark:border-zinc-700/60 dark:bg-zinc-900/50 motion-reduce:animate-none sm:h-80" />
    </div>
  );
}
