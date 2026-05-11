const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(s: string): boolean {
  if (!YMD.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

/** Interpreta `from` / `to` en la URL; sin params válidos usa el día calendario UTC de `todayYmd`. */
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

/** Días UTC entre `from` y `to` (inclusive), alineado con `dayKey(iso)` del resto del informe. */
export function dayKeysInclusiveUtc(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T12:00:00.000Z`).getTime();
  const end = new Date(`${to}T12:00:00.000Z`).getTime();
  for (let t = start; t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function dayInRange(dayKey: string, from: string, to: string): boolean {
  return dayKey >= from && dayKey <= to;
}

export function prettyReportPeriodLabel(
  from: string,
  to: string,
  todayYmd: string,
): string {
  if (from === to) {
    if (from === todayYmd) return "Hoy";
    return new Date(`${from}T12:00:00Z`).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const a = new Date(`${from}T12:00:00Z`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
  const b = new Date(`${to}T12:00:00Z`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${a} – ${b}`;
}
