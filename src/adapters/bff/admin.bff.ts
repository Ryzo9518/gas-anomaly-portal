// Admin API client for the "Invite & manage clients" screen. Talks to the
// admin-only /api/admin/* routes (the backend enforces admin via current_admin;
// the UI gate is convenience). All calls send the staff session cookie.

export interface AdminContact {
  id: string;
  email: string;
  status: string; // invited | active | revoked
  delivery_status: string; // pending | sent | failed
  last_login_at: string | null;
}

export interface AdminClient {
  id: string;
  name: string;
  health_target: number;
  revoked: boolean;
  contacts: AdminContact[];
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return (res.status === 204 ? null : await res.json()) as T;
}

export const adminApi = {
  listClients: () => call<AdminClient[]>("/api/admin/clients"),
  createClient: (name: string) =>
    call<{ id: string; name: string }>("/api/admin/clients", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  invite: (clientId: string, emails: string[]) =>
    call<{ results: { email: string; status: string }[] }>(
      `/api/admin/clients/${clientId}/contacts`,
      { method: "POST", body: JSON.stringify({ emails }) },
    ),
  resend: (contactId: string) =>
    call<{ status: string }>(`/api/admin/contacts/${contactId}/resend`, {
      method: "POST",
    }),
  revokeContact: (contactId: string) =>
    call<{ ok: boolean }>(`/api/admin/contacts/${contactId}/revoke`, {
      method: "POST",
    }),
  revokeClient: (clientId: string) =>
    call<{ ok: boolean }>(`/api/admin/clients/${clientId}/revoke`, {
      method: "POST",
    }),
  // HARD delete — removes the company and ALL its data (audit payload, contacts,
  // sessions). Irreversible; distinct from revoke. Confirm-gated in the UI.
  deleteClient: (clientId: string) =>
    call<{ ok: boolean; deleted: string }>(`/api/admin/clients/${clientId}`, {
      method: "DELETE",
    }),
};
