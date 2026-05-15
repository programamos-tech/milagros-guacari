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
  "fixed left-1/2 top-1/2 z-[200] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-2xl max-h-[min(90dvh,100%)] overflow-y-auto [&::backdrop]:bg-stone-950/50";

type Props = {
  orderId: string;
  token: string;
  totalCents: number;
  customerName: string;
  instructions: TransferBankInstructions;
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

export function TransferenciaCheckoutPanel({
  orderId,
  token,
  totalCents,
  customerName,
  instructions,
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

  const copyValue = async () => {
    const v = instructions.accountValue.trim();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
        <p className="font-semibold">Pedido registrado</p>
        <p className="mt-1 leading-relaxed">
          Realiza la transferencia por el valor exacto. Luego sube el comprobante: tienes{" "}
          <strong>2 minutos</strong> por cada ventana que habilites. Si se vence el tiempo, pulsa{" "}
          <strong>Habilitar de nuevo</strong> y vuelve a subir el archivo.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
          Total a transferir
        </p>
        <p className="text-2xl font-semibold tabular-nums text-stone-900">
          {formatCop(totalCents)}
        </p>
        <p className="text-sm text-stone-600">A nombre de: {customerName}</p>
      </div>

      <details className="group rounded-xl border border-stone-200 bg-stone-50/80 p-4 open:bg-white">
        <summary className="cursor-pointer list-none text-sm font-semibold text-stone-900 marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            Ver datos para transferir
            <span className="text-stone-400 transition group-open:rotate-180">▾</span>
          </span>
        </summary>
        <div className="mt-4 space-y-3 text-sm text-stone-700">
          {instructions.bankName ? (
            <p>
              <span className="text-stone-500">Banco: </span>
              {instructions.bankName}
            </p>
          ) : null}
          {instructions.accountHolder ? (
            <p>
              <span className="text-stone-500">Titular: </span>
              {instructions.accountHolder}
            </p>
          ) : null}
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                {instructions.accountLabel}
              </p>
              <p className="mt-1 break-all font-mono text-base font-medium text-stone-900">
                {instructions.accountValue || "— (configura NEXT_PUBLIC_TRANSFER_ACCOUNT_VALUE)"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyValue()}
              className="shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-800 transition hover:bg-stone-100"
            >
              Copiar
            </button>
          </div>
          {instructions.extraNote ? (
            <p className="text-xs leading-relaxed text-stone-600">{instructions.extraNote}</p>
          ) : null}
        </div>
      </details>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {!activeWindow ? (
          <button
            type="button"
            disabled={pending}
            onClick={startWindow}
            className="inline-flex flex-1 items-center justify-center bg-[var(--store-accent)] px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[var(--store-accent-hover)] disabled:opacity-60 sm:min-w-[240px]"
          >
            {expiredWindow ? "Habilitar de nuevo (2 min)" : "Subir comprobante"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={openModal}
            className="inline-flex flex-1 items-center justify-center border border-[var(--store-accent)] bg-white px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-accent)] transition hover:bg-[#fff8fb] disabled:opacity-60 sm:min-w-[240px]"
          >
            Abrir formulario de subida
          </button>
        )}
      </div>

      {activeWindow ? (
        <p className="text-xs text-stone-600" role="status">
          Ventana activa: te quedan <strong className="tabular-nums">{formatMmSs(remain)}</strong> para
          enviar el archivo.
        </p>
      ) : null}

      {windowError ? (
        <p className="text-sm text-red-700" role="alert">
          {windowError}
        </p>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby="transfer-proof-title"
        className={dialogClass}
        onClose={() => {}}
      >
        <h2 id="transfer-proof-title" className="text-lg font-semibold text-stone-900">
          Comprobante de pago
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          JPG, PNG, WebP o PDF. Máximo 5 MB.
        </p>

        {!activeWindow && !pending && !uploadPending ? (
          <div className="mt-6 space-y-4">
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
          <>
            <p className="mt-4 text-sm font-semibold tabular-nums text-[var(--store-brand)]">
              Tiempo restante: {formatMmSs(remain)}
            </p>
            <form className="mt-6 space-y-4" action={uploadAction}>
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
          </>
        )}
      </dialog>
    </div>
  );
}
