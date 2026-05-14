import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api";

type PosShipOption =
  | { kind: "pickup"; id: "pickup"; label: string; detail: string }
  | { kind: "address"; id: string; label: string; detail: string };

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApiSession();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const customerId = id?.trim();
  if (!customerId) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  const { supabase } = gate;

  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .select(
      "id,name,email,phone,document_id,shipping_address,customer_kind,wholesale_discount_percent",
    )
    .eq("id", customerId)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!customer) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const { data: rows } = await supabase
    .from("customer_addresses")
    .select("id,label,address_line,reference,sort_order")
    .eq("customer_id", customerId)
    .order("sort_order", { ascending: true });

  const shipOptions: PosShipOption[] = [
    {
      kind: "pickup",
      id: "pickup",
      label: "Retiro en tienda",
      detail: "El cliente recoge en sucursal.",
    },
  ];

  for (const r of rows ?? []) {
    const line = [r.address_line, r.reference].filter(Boolean).join(" · ");
    shipOptions.push({
      kind: "address",
      id: r.id as string,
      label: String(r.label ?? "Dirección"),
      detail: line || "Sin detalle",
    });
  }

  const ship = customer.shipping_address?.trim();
  if ((rows?.length ?? 0) === 0 && ship) {
    shipOptions.push({
      kind: "address",
      id: "primary-shipping",
      label: "Principal",
      detail: ship,
    });
  }

  return NextResponse.json({ customer, shipOptions });
}
