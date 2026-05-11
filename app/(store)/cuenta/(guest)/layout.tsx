export default function CuentaGuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-[60vh] max-w-md px-4 py-10 sm:py-14">
      {children}
    </div>
  );
}
