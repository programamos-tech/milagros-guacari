import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api";
import { fetchKitsByIdsWithItems } from "@/lib/load-product-kits";
import {
  kitIsAvailable,
  maxKitsAvailableFromItems,
  resolveKitSalePriceCents,
} from "@/lib/product-kits";

function sanitizeIlikeQuery(q: string): string {
  return q.replace(/[%_\\,]/g, "").trim().slice(0, 80);
}

async function searchKitIds(supabase: SupabaseClient, raw: string): Promise<string[]> {
  const term = sanitizeIlikeQuery(raw);
  if (term.length < 1) return [];

  const pattern = `%${term}%`;
  const ids = new Set<string>();

  const [{ data: byName }, { data: byProduct }] = await Promise.all([
    supabase.from("product_kits").select("id").ilike("name", pattern).limit(40),
    supabase
      .from("product_kit_items")
      .select("kit_id, products!inner(name)")
      .ilike("products.name", pattern)
      .limit(60),
  ]);

  for (const row of byName ?? []) {
    ids.add(String(row.id));
  }
  for (const row of byProduct ?? []) {
    ids.add(String((row as { kit_id: string }).kit_id));
  }

  return [...ids].slice(0, 40);
}

export async function GET(request: Request) {
  const gate = await requireAdminApiSession();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q")?.trim() ?? "";
  const { supabase } = gate;

  const kitIds = await searchKitIds(supabase, raw);
  if (kitIds.length === 0) {
    return NextResponse.json({ kits: [] });
  }

  const kits = await fetchKitsByIdsWithItems(supabase, kitIds);

  const term = sanitizeIlikeQuery(raw).toLowerCase();
  const filtered =
    term.length < 1
      ? kits
      : kits.filter((k) => {
          if (k.name.toLowerCase().includes(term)) return true;
          return (k.items ?? []).some((it) =>
            (it.products?.name ?? "").toLowerCase().includes(term),
          );
        });

  const hits = filtered.slice(0, 20).map((kit) => {
    const items = kit.items ?? [];
    const maxStock = maxKitsAvailableFromItems(items, "pos");
    const available = kitIsAvailable(kit, "pos");
    const price_cents = resolveKitSalePriceCents(kit, items, "pos");
    return {
      id: kit.id,
      name: kit.name,
      image_path: kit.image_path,
      price_cents,
      max_stock: maxStock,
      available,
      is_published: kit.is_published,
      item_count: items.length,
    };
  });

  return NextResponse.json({ kits: hits });
}
