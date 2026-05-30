/** Mensajes cuando el insert no se confirma en base de datos. */
export const adminCreateFailedMessages = {
  customer:
    "No se pudo crear el cliente. No quedó registrado en la base de datos; intenta de nuevo.",
  product:
    "No se pudo crear el producto. No quedó registrado en la base de datos; intenta de nuevo.",
  sale:
    "No se pudo registrar la venta. La factura no quedó guardada en la base de datos; intenta de nuevo.",
  expense:
    "No se pudo registrar el egreso. No quedó guardado en la base de datos; intenta de nuevo.",
  supplier:
    "No se pudo crear el proveedor. No quedó registrado en la base de datos; intenta de nuevo.",
  supplierInvoice:
    "No se pudo crear la factura de proveedor. No quedó guardada en la base de datos; intenta de nuevo.",
  category:
    "No se pudo crear la categoría. No quedó registrada en la base de datos; intenta de nuevo.",
  kit:
    "No se pudo crear el kit. No quedó registrado en la base de datos; intenta de nuevo.",
  coupon:
    "No se pudo crear el cupón. No quedó registrado en la base de datos; intenta de nuevo.",
  generic:
    "No se pudo completar el registro en la base de datos. Intenta de nuevo.",
} as const;

export function adminCreateFailedMessage(
  kind: keyof typeof adminCreateFailedMessages,
): string {
  return adminCreateFailedMessages[kind];
}
