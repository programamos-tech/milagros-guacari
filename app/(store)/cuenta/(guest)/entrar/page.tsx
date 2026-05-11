import { Suspense } from "react";
import { CuentaGuestLoginLauncher } from "@/components/store/CuentaGuestLoginLauncher";

export const metadata = {
  title: "Iniciar sesión · Mi cuenta",
};

export default function CuentaEntrarPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" aria-hidden />}>
      <CuentaGuestLoginLauncher />
    </Suspense>
  );
}
