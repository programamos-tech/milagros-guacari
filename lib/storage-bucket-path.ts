/** Descompone `bucket/key/rest` usado en `image_path` de Storage. */
export function parseStoragePublicPath(fullPath: string): {
  bucket: string;
  objectPath: string;
} | null {
  const p = fullPath.trim();
  const i = p.indexOf("/");
  if (i <= 0) return null;
  const bucket = p.slice(0, i);
  const objectPath = p.slice(i + 1);
  if (!bucket || !objectPath) return null;
  return { bucket, objectPath };
}
