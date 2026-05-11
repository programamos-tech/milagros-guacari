import { AdminThemeProvider } from "@/components/admin/AdminThemeProvider";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminThemeProvider>{children}</AdminThemeProvider>;
}
