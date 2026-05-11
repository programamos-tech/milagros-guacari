import { createHash } from "node:crypto";

export type WompiEnv = "sandbox" | "production";

export function getWompiBaseUrl(env: WompiEnv = "sandbox") {
  return env === "production"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

export function getWompiEnv(): WompiEnv {
  return process.env.WOMPI_ENV === "production" ? "production" : "sandbox";
}

/** Sin `WOMPI_PRIVATE_KEY`, en desarrollo (o con `CHECKOUT_SKIP_WOMPI=true`) el checkout no llama a Wompi. */
export function shouldSkipWompiPayment(): boolean {
  if (process.env.WOMPI_PRIVATE_KEY?.trim()) return false;
  return (
    process.env.NODE_ENV === "development" ||
    process.env.CHECKOUT_SKIP_WOMPI === "1" ||
    process.env.CHECKOUT_SKIP_WOMPI === "true"
  );
}

type CreatePaymentLinkInput = {
  name: string;
  description: string;
  amountInCents: number;
  currency?: string;
  redirectUrl: string;
  /** Max 36 chars per Wompi; we use order id (36 with hyphens). */
  sku: string;
  singleUse?: boolean;
};

export type CreatePaymentLinkResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string; status?: number };

/**
 * Creates a single-use payment link. Docs: POST /v1/payment_links
 */
export async function createPaymentLink(
  input: CreatePaymentLinkInput,
): Promise<CreatePaymentLinkResult> {
  const key = process.env.WOMPI_PRIVATE_KEY;
  if (!key) {
    return { ok: false, error: "WOMPI_PRIVATE_KEY is not set" };
  }

  const base = getWompiBaseUrl(getWompiEnv());
  const body = {
    name: input.name,
    description: input.description,
    amount_in_cents: input.amountInCents,
    currency: input.currency ?? "COP",
    single_use: input.singleUse ?? true,
    collect_shipping: false,
    redirect_url: input.redirectUrl,
    sku: input.sku.slice(0, 36),
  };

  const res = await fetch(`${base}/payment_links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err =
      (json?.error as string) ||
      (json?.message as string) ||
      `Wompi error (${res.status})`;
    return { ok: false, error: err, status: res.status };
  }

  const data = json?.data as Record<string, unknown> | undefined;
  const id = String(data?.id ?? "");
  const url = String(
    data?.permalink ?? data?.checkout_url ?? data?.url ?? "",
  );
  if (!id || !url) {
    return {
      ok: false,
      error: "Unexpected Wompi response: missing id or checkout URL",
      status: res.status,
    };
  }

  return { ok: true, id, url };
}

type WompiSignature = {
  checksum?: string;
  properties?: string[];
};

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as object)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Best-effort validation per Wompi event signature.properties + checksum (hex).
 * If WOMPI_INTEGRITY_SECRET is unset, returns true and skips verification.
 */
export function verifyWompiEventIntegrity(event: unknown): boolean {
  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!secret) return true;

  if (!event || typeof event !== "object") return false;
  const sig = (event as { signature?: WompiSignature }).signature;
  if (!sig?.checksum || !sig.properties?.length) return false;

  const data = (event as { data?: unknown }).data;
  const concat = sig.properties
    .map((p) => {
      const v =
        getPath(event, p) ??
        (data && typeof data === "object" ? getPath(data, p) : undefined);
      if (v === undefined || v === null) return "";
      return String(v);
    })
    .join("");

  // If this fails in production, compare with Wompi docs for your checksum algorithm.
  const digest = createHash("sha256")
    .update(`${concat}${secret}`, "utf8")
    .digest("hex")
    .toUpperCase();

  return digest === String(sig.checksum).toUpperCase();
}
