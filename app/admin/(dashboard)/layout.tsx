import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";
import { adminNavAllowedHrefList } from "@/lib/admin-nav-allowed";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { redirect } from "next/navigation";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perm = await loadAdminPermissions();
  if (!perm) redirect("/admin/login");

  const allowedNavHrefs = adminNavAllowedHrefList(perm.permissions);

  return (
    <AdminDashboardShell allowedNavHrefs={allowedNavHrefs}>
      {children}
    </AdminDashboardShell>
  );
}
