import { NextResponse } from "next/server";
import {
  aleyaExportFilename,
  buildAleyaExportCsv,
  fetchAleyaExportPayload,
} from "@/lib/admin-reports-aleya-export";
import {
  isValidYearMonth,
  monthYmdBounds,
  prettyYearMonthLabel,
} from "@/lib/admin-report-range";
import { requireAdminApiSession } from "@/lib/admin-api";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";

export async function GET(request: Request) {
  const gate = await requireAdminApiSession();
  if (!gate.ok) return gate.response;

  const perm = await loadAdminPermissions();
  if (!perm?.permissions.inicio_reportes) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const monthRaw = searchParams.get("month")?.trim() ?? "";

  if (!isValidYearMonth(monthRaw)) {
    return NextResponse.json(
      { error: "Parámetro month inválido (YYYY-MM)." },
      { status: 400 },
    );
  }

  const bounds = monthYmdBounds(monthRaw);
  if (!bounds) {
    return NextResponse.json({ error: "Mes inválido." }, { status: 400 });
  }

  const { payload, error } = await fetchAleyaExportPayload(
    gate.supabase,
    bounds.from,
    bounds.to,
    monthRaw,
  );

  if (error || !payload) {
    return NextResponse.json(
      { error: error ?? "No se pudo generar el export." },
      { status: 500 },
    );
  }

  if (payload.rows.length === 0) {
    return NextResponse.json(
      {
        error: `No hay ventas pagadas en ${prettyYearMonthLabel(monthRaw)}.`,
      },
      { status: 404 },
    );
  }

  const csv = buildAleyaExportCsv(payload);
  const filename = aleyaExportFilename(monthRaw);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
