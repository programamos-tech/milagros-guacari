"use client";

import { useEffect } from "react";
import { clearCheckoutFormDraft } from "@/lib/checkout-form-draft";

/** Limpia el borrador al completar el pedido (páginas post-checkout). */
export function ClearCheckoutFormDraft() {
  useEffect(() => {
    clearCheckoutFormDraft();
  }, []);
  return null;
}
