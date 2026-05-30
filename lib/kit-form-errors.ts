import { adminCreateFailedMessage } from "@/lib/admin-create-failed-messages";

export function kitFormErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "validation":
      return "Revisá el nombre del kit (mínimo 2 caracteres).";
    case "items":
      return "Agregá al menos un producto al kit antes de guardar.";
    case "migration":
      return "Faltan tablas de kits en la base de datos. En Supabase aplica las migraciones 20260621120000_product_kits.sql y 20260621130000_restore_kit_component_stock.sql (o ejecutá supabase db push en el proyecto).";
    case "image":
      return "No se recibió la imagen. Elegila de nuevo y guardá el kit.";
    case "image_upload":
      return "No se pudo subir la imagen a Storage. Revisá que el bucket product-images exista y que tu usuario tenga permiso de admin.";
    case "db":
      return adminCreateFailedMessage("kit");
    case "not_found":
      return "No se encontró el kit.";
    case "delete":
      return "No se pudo eliminar el kit (puede estar usado en ventas).";
    default:
      return "Ocurrió un error al guardar el kit.";
  }
}
