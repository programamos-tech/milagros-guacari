"use client";

import { useState } from "react";
import { updateStoreCustomerBirthDateAction } from "@/app/actions/store-customer-birthday";
import { StoreDateInput } from "@/components/store/StoreDateInput";

const btnSaveClass =
  "inline-flex shrink-0 items-center justify-center border border-[var(--store-accent)] bg-[var(--store-accent)] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--store-accent-hover)]";

export function StoreBirthDateForm({
  initialValue = "",
  maxDate,
  nextPath,
  submitLabel = "Guardar fecha",
  inputId = "cuenta-birth-date",
  className = "mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
}: {
  initialValue?: string;
  maxDate: string;
  nextPath: string;
  submitLabel?: string;
  inputId?: string;
  className?: string;
}) {
  const [birthDate, setBirthDate] = useState(initialValue);

  return (
    <form action={updateStoreCustomerBirthDateAction} className={className}>
      <input type="hidden" name="next" value={nextPath} readOnly />
      <div className="min-w-0">
        <label htmlFor={inputId} className="sr-only">
          Fecha de cumpleaños
        </label>
        <StoreDateInput
          id={inputId}
          name="birth_date"
          value={birthDate}
          onChange={setBirthDate}
          required
          min="1900-01-01"
          max={maxDate}
          className="mt-2 w-full max-w-[12rem]"
        />
      </div>
      <button type="submit" className={btnSaveClass}>
        {submitLabel}
      </button>
    </form>
  );
}
