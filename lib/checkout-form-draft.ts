/** Borrador del checkout en el navegador (sobrevive refresh y cambios de bolsa). */
export const CHECKOUT_FORM_DRAFT_KEY = "store-checkout-form-draft-v1";

export type CheckoutFormDraft = {
  firstName: string;
  lastName: string;
  address: string;
  neighborhood: string;
  reference: string;
  mobile: string;
  email: string;
  municipalityId: string;
  couponCode: string;
  addressSelection: string;
};

const EMPTY: CheckoutFormDraft = {
  firstName: "",
  lastName: "",
  address: "",
  neighborhood: "",
  reference: "",
  mobile: "",
  email: "",
  municipalityId: "",
  couponCode: "",
  addressSelection: "",
};

export function readCheckoutFormDraft(): CheckoutFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_FORM_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutFormDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      firstName: String(parsed.firstName ?? ""),
      lastName: String(parsed.lastName ?? ""),
      address: String(parsed.address ?? ""),
      neighborhood: String(parsed.neighborhood ?? ""),
      reference: String(parsed.reference ?? ""),
      mobile: String(parsed.mobile ?? ""),
      email: String(parsed.email ?? ""),
      municipalityId: String(parsed.municipalityId ?? ""),
      couponCode: String(parsed.couponCode ?? ""),
      addressSelection: String(parsed.addressSelection ?? ""),
    };
  } catch {
    return null;
  }
}

export function writeCheckoutFormDraft(
  patch: Partial<CheckoutFormDraft>,
): void {
  if (typeof window === "undefined") return;
  try {
    const prev = readCheckoutFormDraft() ?? EMPTY;
    const next: CheckoutFormDraft = {
      ...prev,
      ...patch,
    };
    window.sessionStorage.setItem(CHECKOUT_FORM_DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

export function clearCheckoutFormDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHECKOUT_FORM_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
