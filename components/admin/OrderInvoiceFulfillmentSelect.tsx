"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateAdminOrderFulfillment } from "@/app/actions/admin/order-fulfillment";
import {
  ADMIN_FULFILLMENT_OPTIONS,
  isOrderFulfillmentStatus,
  orderFulfillmentBadgeClass,
  type OrderFulfillmentStatus,
} from "@/lib/order-fulfillment";

function selectClassForFulfillment(status: OrderFulfillmentStatus): string {
  const base =
    "w-full min-w-[170px] rounded-lg border px-3 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-900";
  return `${base} ${orderFulfillmentBadgeClass(status)}`;
}

export function OrderInvoiceFulfillmentSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const resolved: OrderFulfillmentStatus =
    currentStatus && isOrderFulfillmentStatus(currentStatus)
      ? currentStatus
      : "preparing";
  const [value, setValue] = useState(resolved);

  useEffect(() => {
    setValue(resolved);
  }, [resolved]);

  return (
    <select
      aria-label="Estado del envío"
      disabled={pending}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (!isOrderFulfillmentStatus(v)) return;
        setValue(v);
        startTransition(async () => {
          const res = await updateAdminOrderFulfillment(orderId, v);
          if (!res.ok) {
            setValue(resolved);
            return;
          }
          router.refresh();
        });
      }}
      className={`${selectClassForFulfillment(value)} disabled:opacity-60`}
    >
      {ADMIN_FULFILLMENT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
