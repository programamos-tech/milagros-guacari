import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api";

function sanitizeIlikeQuery(q: string) {
  return q.replace(/[%_\\,]/g, "").slice(0, 80);
}

export async function GET(request: Request) {
  const gate = await requireAdminApiSession();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q")?.trim() ?? "";
  if (raw.length < 1) {
    return NextResponse.json({ products: [] });
  }

  const q = sanitizeIlikeQuery(raw);
  if (q.length < 1) {
    return NextResponse.json({ products: [] });
  }

  const pattern = `%${q}%`;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,reference,price_cents,cost_cents,stock_quantity,stock_local,has_vat,vat_percent",
    )
    .or(`name.ilike.${pattern},reference.ilike.${pattern}`)
    .order("name")
    .limit(24);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}
