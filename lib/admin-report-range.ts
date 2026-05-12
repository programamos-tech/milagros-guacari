const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Zona horaria de la tienda para agrupar ventas y reportes por día calendario local. */
export const REPORT_STORE_TIME_ZONE = "America/Bogota";

export function isValidYmd(s: string): boolean {
  if (!YMD.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

/** Día calendario `YYYY-MM-DD` en la tienda (p. ej. Colombia) a partir de un instante ISO. */
export function reportCalendarDayKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Mes calendario `YYYY-MM` en la tienda (para series mensuales). */
export function reportYearMonthFromIso(iso: string): string {
  const ymd = reportCalendarDayKeyFromIso(iso);
  return ymd.length >= 7 ? ymd.slice(0, 7) : "";
}

/** Hoy como `YYYY-MM-DD` en la zona de la tienda (para filtros por defecto y “Hoy”). */
export function todayYmdInReportStore(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Interpreta `from` / `to` en la URL (fechas de calendario de la tienda, sin hora).
 * Sin params válidos usa `todayYmd` (debe ser el “hoy” en la misma zona, p. ej. `todayYmdInReportStore()`).
 */
export function parseReportRangeFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
  todayYmd: string,
): { from: string; to: string } {
  const fromRaw = typeof sp.from === "string" ? sp.from.trim() : "";
  const toRaw = typeof sp.to === "string" ? sp.to.trim() : "";

  if (isValidYmd(fromRaw) && isValidYmd(toRaw)) {
    let from = fromRaw;
    let to = toRaw;
    if (from > to) [from, to] = [to, from];
    return { from, to };
  }
  if (isValidYmd(fromRaw) && !toRaw) {
    return { from: fromRaw, to: fromRaw };
  }
  if (isValidYmd(toRaw) && !fromRaw) {
    return { from: toRaw, to: toRaw };
  }
  return { from: todayYmd, to: todayYmd };
}

/**
 * Instante usado solo para formatear etiquetas (mediodía civil en tienda).
 * Fijo UTC+17h sobre Y-M-D = mediodía en Colombia (UTC−5, sin DST).
 * Si cambiás `REPORT_STORE_TIME_ZONE` fuera de −05, generalizar con librería TZ.
 */
function noonOnStoreCalendarYmdAsUtcMs(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d, 17, 0, 0);
}

function addOneCalendarDayYmd(ymd: string): string {
  const [ys, ms, ds] = ymd.split("-");
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  if (!y || !mo || !d) return ymd;
  const next = new Date(noonOnStoreCalendarYmdAsUtcMs(y, mo, d) + 86_400_000);
  return reportCalendarDayKeyFromIso(next.toISOString());
}

/**
 * Lista cada `YYYY-MM-DD` entre `from` y `to` (inclusive), como días calendario en `REPORT_STORE_TIME_ZONE`.
 * Debe coincidir con `reportCalendarDayKeyFromIso` para pedidos/gastos.
 */
export function dayKeysInclusiveReport(from: string, to: string): string[] {
  const out: string[] = [];
  if (!isValidYmd(from) || !isValidYmd(to)) return out;
  let cur = from <= to ? from : to;
  const end = from <= to ? to : from;
  while (cur <= end) {
    out.push(cur);
    cur = addOneCalendarDayYmd(cur);
  }
  return out;
}

/** @deprecated Usar `dayKeysInclusiveReport`; se mantiene alias para no romper imports viejos. */
export const dayKeysInclusiveUtc = dayKeysInclusiveReport;

export function dayInRange(dayKey: string, from: string, to: string): boolean {
  return dayKey >= from && dayKey <= to;
}

/**
 * Intervalo semiabierto `[gte, lt)` en ISO UTC para filtrar `timestamptz` alineado a días
 * calendario en `REPORT_STORE_TIME_ZONE` (Colombia: medianoche local = 05:00 UTC).
 * Cubre todo el último día hasta 23:59:59.999 local.
 */
export function createdAtBoundsForReportYmdRange(
  fromYmd: string,
  toYmd: string,
): { gte: string; lt: string } | null {
  if (!isValidYmd(fromYmd) || !isValidYmd(toYmd)) return null;
  const [yf, mf, df] = fromYmd.split("-").map(Number);
  const [yt, mt, dt] = toYmd.split("-").map(Number);
  if (!yf || !mf || !df || !yt || !mt || !dt) return null;
  const lo = fromYmd <= toYmd ? { y: yf, m: mf, d: df } : { y: yt, m: mt, d: dt };
  const hi = fromYmd <= toYmd ? { y: yt, m: mt, d: dt } : { y: yf, m: mf, d: df };
  const gteMs = Date.UTC(lo.y, lo.m - 1, lo.d, 5, 0, 0, 0);
  const ltMs = Date.UTC(hi.y, hi.m - 1, hi.d + 1, 5, 0, 0, 0);
  return {
    gte: new Date(gteMs).toISOString(),
    lt: new Date(ltMs).toISOString(),
  };
}

/** Etiqueta corta en español para un `YYYY-MM-DD` de calendario tienda (eje X del gráfico). */
export function prettyReportDayShortLabel(ymd: string): string {
  if (!isValidYmd(ymd)) return ymd;
  const [y, mo, d] = ymd.split("-").map(Number);
  if (!y || !mo || !d) return ymd;
  const inst = new Date(noonOnStoreCalendarYmdAsUtcMs(y, mo, d));
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: REPORT_STORE_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(inst);
}

export function prettyReportPeriodLabel(
  from: string,
  to: string,
  todayYmd: string,
): string {
  const fmtLong = (ymd: string) => {
    const [y, mo, d] = ymd.split("-").map(Number);
    if (!y || !mo || !d) return ymd;
    const inst = new Date(noonOnStoreCalendarYmdAsUtcMs(y, mo, d));
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: REPORT_STORE_TIME_ZONE,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(inst);
  };
  const fmtShort = (ymd: string, withYear: boolean) => {
    const [y, mo, d] = ymd.split("-").map(Number);
    if (!y || !mo || !d) return ymd;
    const inst = new Date(noonOnStoreCalendarYmdAsUtcMs(y, mo, d));
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: REPORT_STORE_TIME_ZONE,
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    }).format(inst);
  };

  if (from === to) {
    if (from === todayYmd) return "Hoy";
    return fmtLong(from);
  }
  const a = fmtShort(from, false);
  const b = fmtShort(to, true);
  return `${a} – ${b}`;
}
