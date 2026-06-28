/**
 * Datos públicos para transferencia en checkout.
 * Valores por defecto de Aleya Shop; override con NEXT_PUBLIC_TRANSFER_* si hace falta.
 */

export type TransferPaymentAccount = {
  /** Ej. Bancolombia, Nequi, Daviplata */
  label: string;
  /** Ej. Cuenta corriente, Celular */
  detail?: string;
  value: string;
};

export type TransferBankInstructions = {
  /** Titular enmascarado (3 primeras palabras + ***). */
  accountHolder: string;
  /** NIT / identificación fiscal para referencia de pago. */
  taxId: string;
  accounts: TransferPaymentAccount[];
  extraNote: string;
};

const DEFAULT_HOLDER_FULL = "ALEYA SHOP SAS";
const DEFAULT_TAX_ID = "901.522.077";
const DEFAULT_MOBILE_WALLET = "3246868749";
const DEFAULT_BANCOLOMBIA_ACCOUNT = "111-000012-85";

/** Muestra solo las 3 primeras palabras del titular y oculta el resto. */
export function maskAccountHolderName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const visible = words.slice(0, 3).join(" ");
  return `${visible} ***`;
}

function trimEnv(key: string): string {
  return (process.env[key] ?? "").trim();
}

function defaultAccounts(): TransferPaymentAccount[] {
  return [
    {
      label: "Bancolombia",
      detail: "Cuenta corriente",
      value: DEFAULT_BANCOLOMBIA_ACCOUNT,
    },
    {
      label: "Nequi",
      detail: "Celular",
      value: DEFAULT_MOBILE_WALLET,
    },
    {
      label: "Daviplata",
      detail: "Celular",
      value: DEFAULT_MOBILE_WALLET,
    },
  ];
}

export function getTransferBankInstructions(): TransferBankInstructions {
  const holderFull =
    trimEnv("NEXT_PUBLIC_TRANSFER_ACCOUNT_HOLDER") || DEFAULT_HOLDER_FULL;
  const taxId = trimEnv("NEXT_PUBLIC_TRANSFER_TAX_ID") || DEFAULT_TAX_ID;

  const bancolombia =
    trimEnv("NEXT_PUBLIC_TRANSFER_BANCOLOMBIA_ACCOUNT") || DEFAULT_BANCOLOMBIA_ACCOUNT;
  const mobileWallet =
    trimEnv("NEXT_PUBLIC_TRANSFER_MOBILE_WALLET") || DEFAULT_MOBILE_WALLET;

  const accounts: TransferPaymentAccount[] = [
    {
      label: "Bancolombia",
      detail: trimEnv("NEXT_PUBLIC_TRANSFER_BANCOLOMBIA_DETAIL") || "Cuenta corriente",
      value: bancolombia,
    },
    {
      label: "Nequi",
      detail: trimEnv("NEXT_PUBLIC_TRANSFER_NEQUI_DETAIL") || "Celular",
      value: mobileWallet,
    },
    {
      label: "Daviplata",
      detail: trimEnv("NEXT_PUBLIC_TRANSFER_DAVIPLATA_DETAIL") || "Celular",
      value: mobileWallet,
    },
  ];

  const hasCustomEnv =
    trimEnv("NEXT_PUBLIC_TRANSFER_ACCOUNT_HOLDER").length > 0 ||
    trimEnv("NEXT_PUBLIC_TRANSFER_BANCOLOMBIA_ACCOUNT").length > 0 ||
    trimEnv("NEXT_PUBLIC_TRANSFER_MOBILE_WALLET").length > 0;

  const extraNote =
    trimEnv("NEXT_PUBLIC_TRANSFER_EXTRA_NOTE") ||
    (hasCustomEnv
      ? ""
      : "Transfiere el valor exacto del pedido. En la referencia puedes indicar tu nombre o número de pedido.");

  return {
    accountHolder: maskAccountHolderName(holderFull),
    taxId,
    accounts: accounts.some((a) => a.value.length > 0) ? accounts : defaultAccounts(),
    extraNote,
  };
}
