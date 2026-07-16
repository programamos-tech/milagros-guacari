"use client";

import { useEffect, useState } from "react";
import {
  readCheckoutFormDraft,
  writeCheckoutFormDraft,
} from "@/lib/checkout-form-draft";

export function CheckoutCouponField({
  className,
}: {
  className: string;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const draft = readCheckoutFormDraft();
    if (draft?.couponCode) setValue(draft.couponCode);
  }, []);

  return (
    <label className="mt-4 block">
      <span className="sr-only">Código promocional</span>
      <input
        name="couponCode"
        type="text"
        placeholder="Ingresa el código"
        className={className}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          writeCheckoutFormDraft({ couponCode: next });
        }}
      />
    </label>
  );
}
