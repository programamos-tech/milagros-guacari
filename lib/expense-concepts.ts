export type ExpensePaymentMethod = "transferencia" | "efectivo" | "tarjeta" | "otro";

export type ExpenseConceptOption = {
  concept: string;
  category: string;
  paymentMethod: ExpensePaymentMethod;
};

/** Etiqueta del concepto que abre selector de trabajador de turno. */
export const EXPENSE_CONCEPT_PERSONAL_TURNOS = "Personal Turnos";

/** Concepto libre cuando no aplica la lista fija. */
export const EXPENSE_CONCEPT_OTHER = "Otro";

/**
 * Catálogo oficial de conceptos de egreso (hoja CONCEPTOS DE GASTOS).
 * Orden fijo para el selector en admin.
 */
export const EXPENSE_CONCEPT_OPTIONS: ExpenseConceptOption[] = [
  { concept: "Sueldo/Nómina", category: "nomina", paymentMethod: "transferencia" },
  { concept: "Administración", category: "administracion", paymentMethod: "transferencia" },
  { concept: "Arriendo", category: "fijo", paymentMethod: "transferencia" },
  { concept: "Servicio público", category: "servicios", paymentMethod: "transferencia" },
  { concept: "Línea corporativa", category: "servicios", paymentMethod: "transferencia" },
  {
    concept: EXPENSE_CONCEPT_PERSONAL_TURNOS,
    category: "nomina",
    paymentMethod: "efectivo",
  },
  { concept: "Seguridad social", category: "nomina", paymentMethod: "transferencia" },
  { concept: "Domicilios propios", category: "logistica", paymentMethod: "efectivo" },
  { concept: "Flete", category: "logistica", paymentMethod: "transferencia" },
  {
    concept: "Material/insumos y papelería",
    category: "insumos",
    paymentMethod: "transferencia",
  },
  { concept: "Datafono y 4xMIL", category: "financiero", paymentMethod: "transferencia" },
  { concept: "Honorarios contabilidad", category: "honorarios", paymentMethod: "transferencia" },
  {
    concept: "Viáticos/gastos representación",
    category: "representacion",
    paymentMethod: "transferencia",
  },
  { concept: "Publicidad", category: "marketing", paymentMethod: "tarjeta" },
  { concept: "Soporte web Contapyme", category: "tecnologia", paymentMethod: "transferencia" },
  { concept: "Arreglos locativos", category: "mantenimiento", paymentMethod: "transferencia" },
  { concept: "Intereses x préstamos", category: "financiero", paymentMethod: "transferencia" },
  { concept: "Pago a préstamo", category: "financiero", paymentMethod: "transferencia" },
  { concept: "Prestaciones sociales", category: "nomina", paymentMethod: "transferencia" },
  { concept: "Renovación Sigo nómina", category: "nomina", paymentMethod: "transferencia" },
  { concept: "Cámara de comercio", category: "impuestos", paymentMethod: "transferencia" },
  {
    concept: "Pago por transacción Milagros",
    category: "financiero",
    paymentMethod: "transferencia",
  },
  { concept: "Bolsas Milagros", category: "insumos", paymentMethod: "efectivo" },
  {
    concept: "Seguro local y mercancía protegida",
    category: "seguros",
    paymentMethod: "transferencia",
  },
  { concept: EXPENSE_CONCEPT_OTHER, category: "operativo", paymentMethod: "transferencia" },
];
