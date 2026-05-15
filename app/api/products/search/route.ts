import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/** Evita metacaracteres en ILIKE. */
function sanitizeIlikeQuery(q: string) {
  return q.replace(/[%_\\]/g, "").slice(0, 80);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q")?.trim() ?? "";
  if (raw.length < 2) {
    return NextResponse.json({ products: [] });
  }

  const q = sanitizeIlikeQuery(raw);
  if (q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Missing Supabase env" },
      { status: 500 },
    );
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("products")
    .select("id,name,price_cents,has_vat,image_path")
    .eq("is_published", true)
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(12);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}
