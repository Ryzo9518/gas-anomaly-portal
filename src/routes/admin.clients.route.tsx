import { AdminClients } from "@/features/admin/AdminClients";

// Admin-only route (gated by RequireAdmin in the Router). Renders within the
// app shell (sidebar/topbar).
export function AdminClientsRoute() {
  return (
    <div className="h-full overflow-y-auto">
      <AdminClients />
    </div>
  );
}
