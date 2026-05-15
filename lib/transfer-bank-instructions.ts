/**
 * Datos públicos para transferencia en checkout (variables NEXT_PUBLIC_*).
 * Si no defines `NEXT_PUBLIC_TRANSFER_ACCOUNT_VALUE`, se usan valores de ejemplo
 * para poder probar el flujo; sustitúyelos antes de cobrar a clientes reales.
 */

export type TransferBankInstructions = {
  bankName: string;
  accountHolder: string;
  accountLabel: string;
  accountValue: string;
  extraNote: string;
};

/** Solo para pruebas locales / hasta que configures env. */
const DEMO_TRANSFER: TransferBankInstructions = {
  bankName: "Nequi / Daviplata (ejemplo)",
  accountHolder: "Tu tienda (configura NEXT_PUBLIC_TRANSFER_ACCOUNT_HOLDER)",
  accountLabel: "Llave",
  accountValue: "3012345678",
  extraNote:
    "Estás viendo datos de demostración. Define NEXT_PUBLIC_TRANSFER_ACCOUNT_VALUE (y el resto de NEXT_PUBLIC_TRANSFER_*) con la llave real de la tienda.",
};

function trimEnv(key: string): string {
  return (process.env[key] ?? "").trim();
}

export function getTransferBankInstructions(): TransferBankInstructions {
  const accountValue = trimEnv("NEXT_PUBLIC_TRANSFER_ACCOUNT_VALUE");
  const usingDemo = accountValue.length === 0;

  return {
    bankName: trimEnv("NEXT_PUBLIC_TRANSFER_BANK_NAME") || DEMO_TRANSFER.bankName,
    accountHolder:
      trimEnv("NEXT_PUBLIC_TRANSFER_ACCOUNT_HOLDER") || DEMO_TRANSFER.accountHolder,
    accountLabel:
      trimEnv("NEXT_PUBLIC_TRANSFER_ACCOUNT_LABEL") || DEMO_TRANSFER.accountLabel,
    accountValue: accountValue || DEMO_TRANSFER.accountValue,
    extraNote: usingDemo
      ? DEMO_TRANSFER.extraNote
      : trimEnv("NEXT_PUBLIC_TRANSFER_EXTRA_NOTE"),
  };
}
