"use client";

import { NewInvoiceForm, NewInvoiceHeader } from "@/components/admin/NewInvoiceForm";

export function NuevaFacturaClient({
  initialError,
  initialCustomerId,
}: {
  initialError?: string;
  initialCustomerId?: string;
}) {
  return (
    <>
      <NewInvoiceHeader />
      <NewInvoiceForm
        initialError={initialError}
        initialCustomerId={initialCustomerId}
      />
    </>
  );
}
