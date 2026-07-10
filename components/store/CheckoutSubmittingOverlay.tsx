"use client";

import { useFormStatus } from "react-dom";
import {
  STORE_CHECKOUT_SUBMIT_MESSAGES,
  StoreMotivationalOverlay,
} from "@/components/store/StoreMotivationalOverlay";

/**
 * Overlay a pantalla completa mientras corre `startCheckout`.
 * Debe vivir dentro del `<form>` (usa `useFormStatus`).
 */
export function CheckoutSubmittingOverlay() {
  const { pending } = useFormStatus();
  return (
    <StoreMotivationalOverlay
      active={pending}
      messages={STORE_CHECKOUT_SUBMIT_MESSAGES}
    />
  );
}
