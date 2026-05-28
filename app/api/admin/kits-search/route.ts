import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api";
import { fetchKitsWithItems } from "@/lib/load-product-kits";
import {
  kitIsAvailable,
  maxKitsAvailableFromItems,
  resolveKitSalePriceCents,
} from "@/lib/product-kits";

export async function GET(request: Request) {
  const gate = await requireAdminApiSession();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q")?.trim() ?? "";
  const { supabase } = gate;

  const kits = await fetchKitsWithItems(supabase, { publishedOnly: false });

  const filtered =
    raw.length < 1
      ? kits
      : kits.filter((k) => {
          const n = raw.toLowerCase();
          if (k.name.toLowerCase().includes(n)) return true;
          return (k.items ?? []).some((it) =>
            (it.products?.name ?? "").toLowerCase().includes(n),
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
