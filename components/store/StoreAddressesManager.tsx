"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  label: string;
  address_line: string;
  reference: string;
  sort_order: number;
};

const labelClass = "mb-2 block text-sm font-medium text-stone-800";
const inputClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-[var(--store-accent)]/20";
const inputClassSettings =
  "w-full border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[var(--store-accent)] focus:outline-none focus:ring-0";
const btnPrimary =
  "rounded-full bg-[var(--store-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--store-accent-hover)] disabled:opacity-60";
const btnGhost =
  "rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50";
const btnOutlineBoutique =
  "inline-flex shrink-0 items-center justify-center border border-[var(--store-accent)] bg-white px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--store-accent)] transition hover:bg-[var(--store-accent)] hover:text-white disabled:opacity-50";

type Props = {
  variant?: "default" | "settings";
};

export function StoreAddressesManager({ variant = "default" }: Props) {
  const isSettings = variant === "settings";
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    label: "Casa",
    address_line: "",
    reference: "",
  });

  const load = useCallback(async () => {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data: me, error: meErr } = await supabase
      .from("customers")
      .select("id")
      .maybeSingle();

    if (meErr) {
      setError("No se pudo cargar tu perfil de cliente.");
      setLoading(false);
      return;
    }
    if (!me?.id) {
      setError(
        "Tu cuenta aún no está vinculada al catálogo. Vuelve a iniciar sesión o contáctanos.",
      );
      setLoading(false);
      return;
    }

    setCustomerId(me.id as string);

    const { data: addresses, error: aErr } = await supabase
      .from("customer_addresses")
      .select("id, label, address_line, reference, sort_order")
      .eq("customer_id", me.id)
      .order("sort_order", { ascending: true });

    if (aErr) {
      setError("No se pudieron cargar las direcciones.");
      setLoading(false);
      return;
    }

    setRows((addresses ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !form.address_line.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const nextOrder =
      rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    const { error: insErr } = await supabase.from("customer_addresses").insert({
      customer_id: customerId,
      label: form.label.trim() || "Casa",
      address_line: form.address_line.trim(),
      reference: form.reference.trim(),
      sort_order: nextOrder,
    });
    setSaving(false);
    if (insErr) {
      setError("No se pudo guardar la dirección.");
      return;
    }
    setForm({ label: "Casa", address_line: "", reference: "" });
    if (isSettings) {
      setShowAddForm(false);
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta dirección?")) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { error: delErr } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", id);
    if (delErr) {
      setError("No se pudo eliminar.");
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <p className="text-sm text-stone-500" role="status">
        Cargando direcciones…
      </p>
    );
  }

  if (isSettings) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
            Direcciones de envío
          </h2>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className={btnOutlineBoutique}
          >
            {showAddForm ? "Cerrar" : "Agregar"}
          </button>
        </div>

        {error ? (
          <p className="border border-red-200 bg-red-50/90 px-3 py-2.5 text-sm text-red-900">
            {error}
          </p>
        ) : null}

        {rows.length > 0 ? (
          <ul className="divide-y divide-stone-200">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 py-5 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    {r.label}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">
                    {r.address_line}
                  </p>
                  {r.reference ? (
                    <p className="mt-1 text-sm text-stone-500">
                      Ref: {r.reference}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="shrink-0 text-left text-sm text-stone-700 underline decoration-stone-400 underline-offset-4 hover:text-stone-900"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        ) : !showAddForm ? (
          <p className="text-sm leading-relaxed text-stone-600">
            No tienes direcciones guardadas.
          </p>
        ) : null}

        {showAddForm ? (
          <form
            onSubmit={handleAdd}
            className="border border-stone-200 bg-white p-5 sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-1">
                <span className={labelClass}>Etiqueta</span>
                <input
                  value={form.label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, label: e.target.value }))
                  }
                  placeholder="Casa, trabajo…"
                  className={inputClassSettings}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Dirección</span>
                <input
                  value={form.address_line}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address_line: e.target.value }))
                  }
                  required
                  placeholder="Calle, número, barrio…"
                  className={inputClassSettings}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Referencia (opcional)</span>
                <input
                  value={form.reference}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reference: e.target.value }))
                  }
                  placeholder="Torre, apartamento…"
                  className={inputClassSettings}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || !customerId}
                className={btnOutlineBoutique}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-stone-900"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-stone-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p className="font-semibold text-stone-900">{r.label}</p>
                <p className="mt-1 text-sm text-stone-700">{r.address_line}</p>
                {r.reference ? (
                  <p className="mt-1 text-sm text-stone-500">
                    Ref: {r.reference}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className={btnGhost}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-600">
          Todavía no guardaste ninguna dirección.
        </p>
      )}

      <form
        onSubmit={handleAdd}
        className="rounded-xl border border-stone-200/90 bg-[var(--store-chrome-bg)] p-5 sm:p-6"
      >
        <h2 className="text-lg font-semibold text-[var(--store-brand)]">
          Agregar dirección
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-1">
            <span className={labelClass}>Etiqueta</span>
            <input
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder="Casa, trabajo…"
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Dirección</span>
            <input
              value={form.address_line}
              onChange={(e) =>
                setForm((f) => ({ ...f, address_line: e.target.value }))
              }
              required
              placeholder="Calle, número, barrio…"
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Referencia (opcional)</span>
            <input
              value={form.reference}
              onChange={(e) =>
                setForm((f) => ({ ...f, reference: e.target.value }))
              }
              placeholder="Torre, apartamento, punto de encuentro…"
              className={inputClass}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving || !customerId}
          className={`${btnPrimary} mt-6`}
        >
          {saving ? "Guardando…" : "Guardar dirección"}
        </button>
      </form>
    </div>
  );
}
