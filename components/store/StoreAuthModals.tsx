"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { StoreLoginModal } from "@/components/store/StoreLoginModal";
import { StoreRegisterModal } from "@/components/store/StoreRegisterModal";

type StoreAuthModalContextValue = {
  openRegister: () => void;
  closeRegister: () => void;
  openLogin: () => void;
  closeLogin: () => void;
};

const StoreAuthModalContext = createContext<StoreAuthModalContextValue | null>(
  null,
);

export function useStoreAuthModals() {
  const ctx = useContext(StoreAuthModalContext);
  if (!ctx) {
    throw new Error("useStoreAuthModals debe usarse dentro de StoreAuthModalProvider");
  }
  return ctx;
}

export function StoreAuthModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const closeRegister = useCallback(() => setRegisterOpen(false), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const openRegister = useCallback(() => {
    setLoginOpen(false);
    setRegisterOpen(true);
  }, []);

  const openLogin = useCallback(() => {
    setRegisterOpen(false);
    setLoginOpen(true);
  }, []);

  const onRegistered = useCallback(() => {
    setRegisterOpen(false);
    router.push("/cuenta");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({
      openRegister,
      closeRegister,
      openLogin,
      closeLogin,
    }),
    [openRegister, closeRegister, openLogin, closeLogin],
  );

  return (
    <StoreAuthModalContext.Provider value={value}>
      {children}
      <StoreRegisterModal
        open={registerOpen}
        onClose={closeRegister}
        onRegistered={onRegistered}
        onOpenLogin={openLogin}
      />
      <StoreLoginModal
        open={loginOpen}
        onClose={closeLogin}
        onOpenRegister={openRegister}
      />
    </StoreAuthModalContext.Provider>
  );
}
