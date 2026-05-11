/**
 * Expande celdas mal separadas (p. ej. Excel con todo en una línea) en etiquetas
 * individuales para selectores en PDP y carrito.
 */

const CONNECTOR_FIRST = /^(de|del|la|las|el|los|y|e|&)$/i;

function mergeFragrancePieces(pieces: string[]): string[] {
  const out: string[] = [];
  for (const p of pieces) {
    const t = p.trim();
    if (!t) continue;
    if (out.length === 0) {
      out.push(t);
      continue;
    }
    const prev = out[out.length - 1];
    const prevWords = prev.split(/\s+/).filter(Boolean);
    const nextFirst = t.split(/\s+/)[0] ?? "";

    if (CONNECTOR_FIRST.test(nextFirst)) {
      out[out.length - 1] = `${prev} ${t}`;
      continue;
    }
    if (/(\bde|del|la|las|el|los|y|e|&)$/i.test(prev.trim())) {
      out[out.length - 1] = `${prev} ${t}`;
      continue;
    }
    if (prevWords.length === 1 && /^[A-ZÀ-Ÿ]/.test(nextFirst)) {
      out[out.length - 1] = `${prev} ${t}`;
      continue;
    }
    out.push(t);
  }
  return out;
}

/** Parte un blob tipo "Vanilla Cashmere Creme de Pistachio Fresh & Cozy …". */
function splitConcatenatedTitleCase(blob: string): string[] {
  const pieces = blob
    .split(/(?<=[a-záéíóúñ])\s+(?=[A-ZÀ-Ÿ])/)
    .map((x) => x.trim())
    .filter(Boolean);
  return mergeFragrancePieces(pieces);
}

function splitFragranceCell(cell: string): string[] {
  const s = String(cell ?? "").trim();
  if (!s) return [];

  if (/[\n;,|]/.test(s)) {
    return s
      .split(/[\n;,|]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  const doubleSpaced = s
    .split(/\s{2,}/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (doubleSpaced.length > 1) return doubleSpaced;

  const blob = doubleSpaced[0] ?? s;
  if (blob.length < 40) return [blob];

  return splitConcatenatedTitleCase(blob);
}

export function expandFragranceLabels(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    for (const piece of splitFragranceCell(item)) {
      const t = piece.trim().slice(0, 160);
      if (!t) continue;
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}
