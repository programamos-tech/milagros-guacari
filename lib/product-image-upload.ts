/** Límite alineado con el mensaje de UI y con `serverActions.bodySizeLimit` en next.config. */
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export function assertProductImageSize(file: File | null | undefined): string | null {
  if (!file || file.size <= 0) return null;
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return `La imagen supera ${MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)} MB. Elige un archivo más liviano (JPG, PNG o WebP).`;
  }
  return null;
}

/** Evita enviar el Server Action si el archivo es grande (doble chequeo respecto a onChange). */
export function blockSubmitIfImageTooLarge(form: HTMLFormElement): boolean {
  const candidates: HTMLInputElement[] = [];
  const main = form.elements.namedItem("image");
  if (main instanceof HTMLInputElement && main.type === "file") {
    candidates.push(main);
  }
  form.querySelectorAll<HTMLInputElement>('input[name="fragrance_option_image"]').forEach(
    (el) => candidates.push(el),
  );
  for (const el of candidates) {
    const file = el.files?.[0];
    const msg = assertProductImageSize(file ?? undefined);
    if (msg) {
      alert(msg);
      return true;
    }
  }
  return false;
}
