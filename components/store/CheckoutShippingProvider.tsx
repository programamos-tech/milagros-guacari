"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readCheckoutFormDraft,
  writeCheckoutFormDraft,
} from "@/lib/checkout-form-draft";
import type { StoreShippingMunicipalityPublic } from "@/lib/store-shipping";
import {
  resolveCheckoutShippingCents,
  SHIPPING_CITY_OTHER,
} from "@/lib/store-shipping";
import { freeShippingProgress } from "@/lib/store-free-shipping";

type CheckoutShippingContextValue = {
  municipalities: StoreShippingMunicipalityPublic[];
  cityValue: string;
  setCityValue: (v: string) => void;
  selectedMunicipality: StoreShippingMunicipalityPublic | null;
  isOtherCity: boolean;
  shippingCents: number;
  freeShippingQualified: boolean;
  subtotalCents: number;
  totalWithShippingCents: number;
};

const CheckoutShippingContext = createContext<CheckoutShippingContextValue | null>(
  null,
);

export function useCheckoutShipping() {
  const ctx = useContext(CheckoutShippingContext);
  if (!ctx) {
    throw new Error("useCheckoutShipping debe usarse dentro de CheckoutShippingProvider");
  }
  return ctx;
}

export function CheckoutShippingProvider({
  municipalities,
  subtotalCents,
  initialCity = "",
  initialMunicipalityId = "",
  children,
}: {
  municipalities: StoreShippingMunicipalityPublic[];
  subtotalCents: number;
  initialCity?: string;
  initialMunicipalityId?: string;
  children: ReactNode;
}) {
  const initialMatch = useMemo(() => {
    const byId = initialMunicipalityId.trim();
    if (byId && municipalities.some((m) => m.id === byId)) {
      return byId;
    }
    const needle = initialCity.trim().toLowerCase();
    if (!needle) return "";
    const hit = municipalities.find((m) => m.name.trim().toLowerCase() === needle);
    return hit?.id ?? "";
  }, [initialCity, initialMunicipalityId, municipalities]);

  const [cityValue, setCityValueState] = useState(initialMatch);

  useEffect(() => {
    const draft = readCheckoutFormDraft();
    const id = draft?.municipalityId?.trim() ?? "";
    if (!id) return;
    if (
      id === SHIPPING_CITY_OTHER ||
      municipalities.some((m) => m.id === id)
    ) {
      setCityValueState(id);
    }
  }, [municipalities]);

  const setCityValue = useCallback((v: string) => {
    setCityValueState(v);
    writeCheckoutFormDraft({ municipalityId: v });
  }, []);

  const selectedMunicipality = useMemo(() => {
    if (!cityValue || cityValue === SHIPPING_CITY_OTHER) return null;
    return municipalities.find((m) => m.id === cityValue) ?? null;
  }, [cityValue, municipalities]);

  const isOtherCity = cityValue === SHIPPING_CITY_OTHER;
  const freeShippingQualified = freeShippingProgress(subtotalCents).qualified;
  const shippingCents =
    selectedMunicipality == null
      ? 0
      : resolveCheckoutShippingCents({
          rateCents: selectedMunicipality.rate_cents,
          subtotalCents,
          freeShippingQualified,
        });

  const value = useMemo(
    () => ({
      municipalities,
      cityValue,
      setCityValue,
      selectedMunicipality,
      isOtherCity,
      shippingCents,
      freeShippingQualified,
      subtotalCents,
      totalWithShippingCents: subtotalCents + shippingCents,
    }),
    [
      municipalities,
      cityValue,
      setCityValue,
      selectedMunicipality,
      isOtherCity,
      shippingCents,
      freeShippingQualified,
      subtotalCents,
    ],
  );

  return (
    <CheckoutShippingContext.Provider value={value}>
      {children}
    </CheckoutShippingContext.Provider>
  );
}
