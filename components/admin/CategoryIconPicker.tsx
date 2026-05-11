"use client";

import { useState } from "react";
import {
  CATEGORY_ICON_OPTIONS,
  type CategoryIconKey,
} from "@/lib/category-icons";

export function CategoryIconPicker({ name = "icon_key" }: { name?: string }) {
  const [selected, setSelected] = useState<CategoryIconKey>("tag");

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={selected} />
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        Icono
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {CATEGORY_ICON_OPTIONS.map(({ key, label, Icon }) => {
          const active = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              title={label}
              aria-label={label}
              className={`flex h-10 items-center justify-center rounded-lg border transition ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800"
              }`}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
