import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_ACTIVITY_ACTIONS = [
  "customer_created",
  "customer_updated",
  "product_created",
  "product_updated",
  "stock_adjusted",
  "stock_transferred",
  "sale_created",
  "sale_cancelled",
] as const;

export type AdminActivityAction = (typeof ADMIN_ACTIVITY_ACTIONS)[number];

export type AdminActivityEntityType = "customer" | "product" | "order";

/** Fila listada en el panel de actividades. */
export type AdminActivityLogRow = {
  id: string;
  created_at: string;
  actor_id: string;
  action_type: AdminActivityAction;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
};

/**
 * Registra una actividad en panel. No lanza: fallos solo se loguean en consola
 * para no romper el flujo principal.
 */
export async function logAdminActivity(
  supabase: SupabaseClient,
  params: {
    actorId: string;
    actionType: AdminActivityAction;
    entityType: AdminActivityEntityType | null;
    entityId: string | null;
    summary: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from("admin_activity_log").insert({
      actor_id: params.actorId,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId,
      summary: params.summary.slice(0, 2000),
      metadata: params.metadata ?? {},
    });
    if (error) {
      console.error("logAdminActivity", error.message, error);
    }
  } catch (e) {
    console.error("logAdminActivity", e);
  }
}

export function actionTypeLabel(action: AdminActivityAction): string {
  switch (action) {
    case "customer_created":
      return "Nuevo cliente";
    case "customer_updated":
      return "Edición de cliente";
    case "product_created":
      return "Nuevo producto";
    case "product_updated":
      return "Edición de producto";
    case "stock_adjusted":
      return "Actualización de stock";
    case "stock_transferred":
      return "Transferencia de stock";
    case "sale_created":
      return "Nueva venta";
    case "sale_cancelled":
      return "Anulación de venta";
    default:
      return action;
  }
}
