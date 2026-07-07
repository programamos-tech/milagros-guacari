export function storeOrderStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pendiente de pago";
    case "paid":
      return "Pagado";
    case "failed":
      return "Pago fallido";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

export function storeOrderStatusHint(status: string): string {
  switch (status) {
    case "pending":
      return "Estamos esperando tu transferencia. Cuando la confirmemos, actualizaremos el estado aquí.";
    case "paid":
      return "Tu pago fue confirmado. Te contactaremos si hace falta algo para el envío.";
    case "failed":
      return "El pago no se completó. Escríbenos si necesitas ayuda.";
    case "cancelled":
      return "Este pedido fue cancelado.";
    default:
      return "Consulta este enlace para ver actualizaciones.";
  }
}
