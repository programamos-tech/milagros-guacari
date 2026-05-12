"use client";

import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  productInputClass,
  productLabelClass,
} from "@/components/admin/product-form-primitives";
import {
  assertProductImageSize,
  MAX_PRODUCT_IMAGE_BYTES,
} from "@/lib/product-image-upload";
import { shouldUnoptimizeStorageImageUrl } from "@/lib/storage-public-url";

export type FragranceRowInitial = {
  label: string;
  existingImagePath?: string | null;
  previewUrl?: string | null;
};

type RowState = {
  label: string;
  existingImagePath: string | null;
  serverPreviewUrl: string | null;
  objectPreviewUrl: string | null;
};

type Props = {
  initialRows: FragranceRowInitial[];
};

function toRowState(rows: FragranceRowInitial[]): RowState[] {
  if (rows.length === 0) {
    return [
      {
        label: "",
        existingImagePath: null,
        serverPreviewUrl: null,
        objectPreviewUrl: null,
      },
    ];
  }
  return rows.map((r) => ({
    label: r.label,
    existingImagePath: r.existingImagePath?.trim() || null,
    serverPreviewUrl: r.previewUrl?.trim() || null,
    objectPreviewUrl: null,
  }));
}

export function ProductFragranceRows({ initialRows }: Props) {
  const [rows, setRows] = useState<RowState[]>(() => toRowState(initialRows));
  const blobUrlsRef = useRef<Set<string>>(new Set());

  const revokeBlob = (url: string | null) => {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
      blobUrlsRef.current.delete(url);
    }
  };

  useEffect(() => {
    const set = blobUrlsRef.current;
    return () => {
      for (const u of set) URL.revokeObjectURL(u);
      set.clear();
    };
  }, []);

  const add = () =>
    setRows((prev) => [
      ...prev,
      {
        label: "",
        existingImagePath: null,
        serverPreviewUrl: null,
        objectPreviewUrl: null,
      },
    ]);

  const remove = (i: number) =>
    setRows((prev) => {
      const next =
        prev.length <= 1
          ? [
              {
                label: "",
                existingImagePath: null,
                serverPreviewUrl: null,
                objectPreviewUrl: null,
              },
            ]
          : prev.filter((_, j) => j !== i);
      const dropped = prev[i];
      if (dropped?.objectPreviewUrl) revokeBlob(dropped.objectPreviewUrl);
      return next;
    });

  const setLabel = (i: number, v: string) =>
    setRows((prev) =>
      prev.map((row, j) => (j === i ? { ...row, label: v } : row)),
    );

  const onPickImage = (i: number, file: File | undefined) => {
    const msg = assertProductImageSize(file ?? undefined);
    if (msg) {
      alert(msg);
      return;
    }
    setRows((prev) =>
      prev.map((row, j) => {
        if (j !== i) return row;
        revokeBlob(row.objectPreviewUrl);
        if (!file || file.size <= 0) {
          return { ...row, objectPreviewUrl: null };
        }
        const url = URL.createObjectURL(file);
        blobUrlsRef.current.add(url);
        return { ...row, objectPreviewUrl: url };
      }),
    );
  };

  const clearStoredImage = (i: number) => {
    setRows((prev) =>
      prev.map((row, j) => {
        if (j !== i) return row;
        revokeBlob(row.objectPreviewUrl);
        return {
          ...row,
          existingImagePath: null,
          serverPreviewUrl: null,
          objectPreviewUrl: null,
        };
      }),
    );
  };

  return (
    <div>
      <span className={productLabelClass}>Fragancias / tonos (opcional)</span>
      <div className="mt-2 space-y-4">
        {rows.map((row, i) => {
          const displayedPreview = row.objectPreviewUrl ?? row.serverPreviewUrl;
          return (
            <div
              key={i}
              className="rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-3 dark:border-zinc-700 dark:bg-zinc-950/50 sm:p-4"
            >
              <div className="flex gap-2">
                <input
                  name="fragrance_option"
                  value={row.label}
                  onChange={(e) => setLabel(i, e.target.value)}
                  placeholder="Nombre de la fragancia o tono"
                  autoComplete="off"
                  className={`${productInputClass} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-rose-200/70 bg-white px-3 py-2 text-rose-950/75 transition hover:border-rose-300/80 hover:bg-rose-50/50 hover:text-rose-950 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                  aria-label="Quitar fragancia o tono"
                >
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </button>
              </div>

              <input
                type="hidden"
                name="fragrance_image_existing"
                value={row.existingImagePath ?? ""}
                aria-hidden
              />

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Imagen para esta opción (opcional)
                  </label>
                  <input
                    key={`${row.existingImagePath ?? ""}-${row.serverPreviewUrl ?? ""}-${row.objectPreviewUrl ?? ""}`}
                    name="fragrance_option_image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="block w-full max-w-md text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border file:border-zinc-200 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-50 dark:text-zinc-300 dark:file:border-zinc-600 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      onPickImage(i, f);
                    }}
                  />
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    JPG, PNG o WebP. Máx. {MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)} MB.
                  </p>
                </div>
                {displayedPreview ? (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <Image
                      src={displayedPreview}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized={
                        displayedPreview.startsWith("blob:") ||
                        shouldUnoptimizeStorageImageUrl(displayedPreview)
                      }
                    />
                  </div>
                ) : null}
              </div>

              {row.serverPreviewUrl || row.existingImagePath ? (
                <button
                  type="button"
                  onClick={() => clearStoredImage(i)}
                  className="mt-2 text-xs font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-200"
                >
                  Quitar imagen guardada
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
      >
        <Plus className="size-4" strokeWidth={1.5} aria-hidden />
        Añadir fragancia o tono
      </button>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Cada nombre debe coincidir con lo que verá el cliente al elegir en la tienda. Si hay
        varias opciones, podés subir una foto distinta por cada una.
      </p>
    </div>
  );
}
