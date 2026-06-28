"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  getTransferProofDeadline,
  openTransferProofUploadWindow,
  uploadTransferProof,
  type UploadTransferProofResult,
} from "@/app/actions/transfer-proof";
import type { TransferBankInstructions } from "@/lib/transfer-bank-instructions";
import { formatCop } from "@/lib/money";

const dialogClass =
  "fixed left-1/2 top-1/2 z-[200] w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 shadow-2xl sm:p-6 [&::backdrop]:bg-stone-950/50";

export type TransferOrderLine = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

type Props = {
  orderId: string;
  token: string;
  totalCents: number;
  customerName: string;
  instructions: TransferBankInstructions;
  orderLines: TransferOrderLine[];
};

function secondsRemaining(deadlineIso: string | null): number {
  if (!deadlineIso) return 0;
  const ms = new Date(deadlineIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 1000));
}

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TransferOrderSummary({
  lines,
  totalCents,
  compact = false,
}: {
  lines: TransferOrderLine[];
  totalCents: number;
  compact?: boolean;
}) {
  if (lines.length === 0) return null;

  return (
    <section
      className={
        compact
          ? "rounded-xl border border-stone-200 bg-white p-4"
          : "rounded-xl border border-stone-200 bg-stone-50/60 p-4"
      }
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
        Detalle del pedido
      </h3>
      <ul
        className={`mt-3 divide-y divide-stone-100 ${compact ? "max-h-[min(12rem,40vh)] overflow-y-auto" : ""}`}
      >
        {lines.map((line) => (
          <li
            key={line.id}
            className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug text-stone-900">{line.name}</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {line.quantity} × {formatCop(line.unitPriceCents)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium tabular-nums text-stone-900">
              {formatCop(line.unitPriceCents * line.quantity)}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3 text-sm font-semibold text-stone-900">
        <span>Total</span>
        <span className="tabular-nums">{formatCop(totalCents)}</span>
      </div>
    </section>
  );
}

export function TransferenciaCheckoutPanel({
  orderId,
  token,
  totalCents,
  customerName,
  instructions,
  orderLines,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deadlineIso, setDeadlineIso] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [pending, startTransition] = useTransition();
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadTransferProof,
    null as UploadTransferProofResult | null,
  );
  const [windowError, setWindowError] = useState<string | null>(null);

  const refreshDeadline = useCallback(() => {
    startTransition(async () => {
      const res = await getTransferProofDeadline(orderId, token);
      if ("error" in res) {
        setDeadlineIso(null);
        return;
      }
      setDeadlineIso(res.deadlineIso);
    });
  }, [orderId, token]);

  useEffect(() => {
    void refreshDeadline();
  }, [refreshDeadline]);

  useEffect(() => {
    if (!deadlineIso) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [deadlineIso]);

  useEffect(() => {
    if (uploadState?.ok) {
      const input = document.getElementById("transfer-proof-file") as HTMLInputElement | null;
      if (input) input.value = "";
    }
  }, [uploadState]);

  const remain = secondsRemaining(deadlineIso);
  void tick;

  const openModal = () => {
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  const startWindow = () => {
    setWindowError(null);
    startTransition(async () => {
      const res = await openTransferProofUploadWindow(orderId, token);
      if (!res.ok) {
        setWindowError(res.error);
        return;
      }
      setDeadlineIso(res.deadlineIso);
      openModal();
    });
  };

  const activeWindow = deadlineIso !== null && remain > 0;
  const expiredWindow = deadlineIso !== null && remain <= 0;

  const copyValue = async (value: string) => {
    const v = value.trim();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8 lg:items-start">
        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
            <p className="font-semibold">Pedido registrado</p>
            <p className="mt-1 leading-relaxed">
              Transfiere el valor exacto y sube el comprobante. Tienes{" "}
              <strong>2 minutos</strong> por ventana; si vence, pulsa{" "}
              <strong>Habilitar de nuevo</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white px-4 py-4 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
              Total a transferir
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-stone-900">
              {formatCop(totalCents)}
            </p>
            <p className="mt-1 text-sm text-stone-600">A nombre de: {customerName}</p>
          </div>

          <TransferOrderSummary lines={orderLines} totalCents={totalCents} />
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
              Datos para transferir
            </h2>
            <div className="mt-4 space-y-3 text-sm text-stone-700">
              {instructions.accountHolder ? (
                <p>
                  <span className="text-stone-500">Titular: </span>
                  {instructions.accountHolder}
                </p>
              ) : null}
              {instructions.taxId ? (
                <p>
                  <span className="text-stone-500">NIT: </span>
                  {instructions.taxId}
                </p>
              ) : null}
              <div className="space-y-3">
                {instructions.accounts.map((account) => (
                  <div
                    key={`${account.label}-${account.value}`}
                    className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                        {account.label}
                        {account.detail ? ` · ${account.detail}` : ""}
                      </p>
                      <p className="mt-1 break-all font-mono text-base font-medium text-stone-900">
                        {account.value}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyValue(account.value)}
                      className="shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-800 transition hover:bg-stone-100"
                    >
                      Copiar
                    </button>
                  </div>
                ))}
              </div>
              {instructions.extraNote ? (
                <p className="text-xs leading-relaxed text-stone-600">{instructions.extraNote}</p>
              ) : null}
            </div>
          </section>

          <div className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              {!activeWindow ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={startWindow}
                  className="inline-flex flex-1 items-center justify-center bg-[var(--store-accent)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[var(--store-accent-hover)] disabled:opacity-60 sm:min-w-[220px]"
                >
                  {expiredWindow ? "Habilitar de nuevo (2 min)" : "Subir comprobante"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={openModal}
                  className="inline-flex flex-1 items-center justify-center border border-[var(--store-accent)] bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-accent)] transition hover:bg-[#fff8fb] disabled:opacity-60 sm:min-w-[220px]"
                >
                  Abrir formulario de subida
                </button>
              )}
              {activeWindow ? (
                <p className="text-xs text-stone-600" role="status">
                  Ventana activa:{" "}
                  <strong className="tabular-nums text-[var(--store-brand)]">
                    {formatMmSs(remain)}
                  </strong>
                </p>
              ) : null}
            </div>
            {windowError ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {windowError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="transfer-proof-title"
        className={dialogClass}
        onClose={() => {}}
      >
        <h2 id="transfer-proof-title" className="text-lg font-semibold text-stone-900">
          Comprobante de pago
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          JPG, PNG, WebP o PDF. Máximo 5 MB.
        </p>

        {!activeWindow && !pending && !uploadPending ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-amber-800">
              {expiredWindow
                ? "El tiempo de esta ventana terminó. Cierra este cuadro y pulsa «Habilitar de nuevo» en la página."
                : "Primero abre una ventana de 2 minutos desde la página principal."}
            </p>
            <button
              type="button"
              className="w-full rounded-lg border border-stone-300 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
              onClick={closeModal}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
            <TransferOrderSummary
              lines={orderLines}
              totalCents={totalCents}
              compact
            />
            <div>
              <p className="text-sm font-semibold tabular-nums text-[var(--store-brand)]">
                Tiempo restante: {formatMmSs(remain)}
              </p>
              <form className="mt-4 space-y-4" action={uploadAction}>
                <input type="hidden" name="orderId" value={orderId} />
                <input type="hidden" name="token" value={token} />
                <label className="block text-sm text-stone-700">
                  <span className="mb-1 block font-medium">Archivo</span>
                  <input
                    id="transfer-proof-file"
                    name="file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    required
                    disabled={!activeWindow || pending || uploadPending}
                    className="block w-full text-sm text-stone-800 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide"
                  />
                </label>
                {uploadState ? (
                  <p
                    className={
                      uploadState.ok
                        ? "text-sm font-medium text-emerald-800"
                        : "text-sm text-red-700"
                    }
                    role="status"
                  >
                    {uploadState.ok ? "Comprobante recibido. Gracias." : uploadState.error}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={!activeWindow || pending || uploadPending}
                    className="flex-1 rounded-lg bg-[var(--store-accent)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--store-accent-hover)] disabled:opacity-50"
                  >
                    {uploadPending ? "Enviando…" : "Enviar comprobante"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
                    onClick={closeModal}
                  >
                    Cerrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
