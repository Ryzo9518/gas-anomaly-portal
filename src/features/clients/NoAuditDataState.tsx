import { useNavigate } from "react-router-dom";
import { Building2, FolderOpen } from "lucide-react";
import { EmptyState } from "@/ui/EmptyState";
import { useAuthStore } from "@/state/authStore";
import { useClient } from "@/features/clients/ClientContext";

// Shown in the workspace when the selected client has no audit reports — either
// because there are no clients at all, or the selected client's data has not
// been loaded yet. Keeps the audit screens from rendering a half-empty/crashing
// dashboard, and points an admin at the Clients screen. Non-admins see a calm
// "not published yet" message with no management CTA.
export function NoAuditDataState() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.actor?.isAdmin);
  const { hasClients, selectedClient } = useClient();

  if (!hasClients) {
    return (
      <div className="mt-10">
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="No clients yet"
          body={
            isAdmin
              ? "Create your first client on the Clients screen to start an audit workspace."
              : "No client workspaces are available yet."
          }
          ctaLabel={isAdmin ? "Go to Clients" : undefined}
          onCta={isAdmin ? () => navigate("/admin/clients") : undefined}
        />
      </div>
    );
  }

  return (
    <div className="mt-10">
      <EmptyState
        icon={<FolderOpen className="h-5 w-5" />}
        title={`No audit data for ${selectedClient.info.name} yet`}
        body={
          isAdmin
            ? "This client has no audit reports loaded. Load their audit data to populate the dashboard, report, findings and engagement views."
            : "This client's audit data hasn't been published yet. Please check back soon."
        }
        ctaLabel={isAdmin ? "Manage clients" : undefined}
        onCta={isAdmin ? () => navigate("/admin/clients") : undefined}
      />
    </div>
  );
}
