import * as React from "react";
import { toast } from "sonner";
import { Plus, RotateCw, Ban, X, Check, Trash2 } from "lucide-react";
import { adminApi, type AdminClient } from "@/adapters/bff/admin.bff";
import { cn } from "@/lib/utils";

// Admin "Invite & manage clients". All actions hit the admin-only API
// (server-enforced). The client picker shows a status dot + summary per client
// so staff can tell them apart at a glance (the previous name-only list gave no
// differentiator — see docs/specs/2026-06-09-staff-client-list-reconciliation.md).

const STATUS_BADGE: Record<string, string> = {
  invited: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  revoked: "bg-rose-50 text-rose-700 ring-rose-200",
};
const DELIVERY_BADGE: Record<string, string> = {
  pending: "text-amber-600",
  sent: "text-emerald-600",
  failed: "text-rose-600",
};

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
        STATUS_BADGE[value] ?? "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {value}
    </span>
  );
}

// At-a-glance status for the client picker: a colour dot + one-line summary so
// two clients are never indistinguishable by name alone.
function clientStatus(c: AdminClient): { dot: string; text: string } {
  if (c.revoked) return { dot: "bg-rose-400", text: "Revoked" };
  const active = c.contacts.filter((x) => x.status === "active").length;
  const invited = c.contacts.filter((x) => x.status === "invited").length;
  if (active > 0)
    return {
      dot: "bg-emerald-400",
      text: `${active} active${invited ? `, ${invited} pending` : ""}`,
    };
  if (invited > 0)
    return {
      dot: "bg-amber-400",
      text: `${invited} pending invite${invited > 1 ? "s" : ""}`,
    };
  return { dot: "bg-slate-500", text: "No contacts yet" };
}

export function AdminClients() {
  const [clients, setClients] = React.useState<AdminClient[] | null>(null);
  const [error, setError] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [emails, setEmails] = React.useState<string[]>([]);
  const [emailInput, setEmailInput] = React.useState("");
  const [confirmRevoke, setConfirmRevoke] = React.useState(false);
  const [confirmContactId, setConfirmContactId] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");

  const refresh = React.useCallback(async () => {
    try {
      const list = await adminApi.listClients();
      setClients(list);
      setSelectedId((cur) => cur ?? list[0]?.id ?? null);
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = clients?.find((c) => c.id === selectedId) ?? null;

  async function createClient() {
    const name = newName.trim();
    if (!name) return;
    if (clients?.some((c) => c.name.trim().toLowerCase() === name.toLowerCase())) {
      toast.error(`A client named "${name}" already exists`);
      return;
    }
    try {
      const c = await adminApi.createClient(name);
      setNewName("");
      await refresh();
      setSelectedId(c.id);
      toast.success(`Client "${name}" created`);
    } catch {
      toast.error("Could not create client");
    }
  }

  function addEmail(raw: string) {
    const e = raw.trim().toLowerCase().replace(/,$/, "");
    if (e && /^\S+@\S+\.\S+$/.test(e) && !emails.includes(e)) {
      setEmails((p) => [...p, e]);
    }
    setEmailInput("");
  }

  async function sendInvites() {
    if (!selected || emails.length === 0) return;
    try {
      const { results } = await adminApi.invite(selected.id, emails);
      const failed = results.filter((r) => r.status !== "sent");
      setEmails([]);
      await refresh();
      if (failed.length === 0) toast.success(`Invited ${results.length} contact(s)`);
      else toast.warning(`${failed.length} of ${results.length} failed to send`);
    } catch {
      toast.error("Invite failed");
    }
  }

  async function resend(id: string) {
    try {
      await adminApi.resend(id);
      await refresh();
      toast.success("Link re-sent");
    } catch {
      toast.error("Resend failed");
    }
  }

  async function revokeContact(id: string) {
    setConfirmContactId(null);
    try {
      await adminApi.revokeContact(id);
      await refresh();
      toast.success("Contact revoked");
    } catch {
      toast.error("Revoke failed");
    }
  }

  async function revokeClient() {
    if (!selected) return;
    try {
      await adminApi.revokeClient(selected.id);
      setConfirmRevoke(false);
      await refresh();
      toast.success(`${selected.name} revoked`);
    } catch {
      toast.error("Revoke failed");
    }
  }

  async function deleteClient() {
    if (!selected) return;
    const name = selected.name;
    try {
      await adminApi.deleteClient(selected.id);
      setConfirmDelete(false);
      setDeleteConfirmText("");
      setSelectedId(null);
      await refresh();
      toast.success(`${name} and all its data deleted`);
    } catch {
      toast.error("Delete failed");
    }
  }

  if (error)
    return <p className="p-8 text-slate-500">Couldn't load clients. Refresh to retry.</p>;
  if (!clients)
    return <p className="p-8 text-slate-500">Loading…</p>;

  return (
    <div className="flex gap-6 p-6">
      {/* Left: client picker + create */}
      <aside className="w-64 shrink-0 space-y-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          Clients
        </h2>
        {clients.length === 0 && (
          <p className="text-[13px] text-slate-500">No clients yet — create one below.</p>
        )}
        <ul className="space-y-1">
          {clients.map((c) => {
            const selected = c.id === selectedId;
            const status = clientStatus(c);
            return (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedId(c.id)}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ring-1 transition-colors",
                    selected
                      ? "bg-violet-50 text-violet-900 ring-violet-200"
                      : "text-slate-700 ring-transparent hover:bg-slate-100/70",
                  )}
                >
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", status.dot)}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">
                      {c.name}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-[11px]",
                        selected ? "text-violet-500" : "text-slate-400",
                      )}
                    >
                      {status.text}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2 pt-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createClient()}
            placeholder="New client name"
            className="h-9 flex-1 rounded-lg bg-white px-2.5 text-[13px] text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={createClient}
            className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600 text-white hover:bg-violet-500"
            aria-label="Create client"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Right: selected client */}
      <section className="min-w-0 flex-1">
        {!selected ? (
          <p className="text-slate-500">Select or create a client.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-[18px] font-semibold text-slate-900">{selected.name}</h1>
              <div className="flex items-center gap-2">
                {!selected.revoked && (
                  <button
                    onClick={() => setConfirmRevoke(true)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                  >
                    <Ban className="h-3.5 w-3.5" /> Revoke whole client
                  </button>
                )}
                <button
                  onClick={() => {
                    setDeleteConfirmText("");
                    setConfirmDelete(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete company + data
                </button>
              </div>
            </div>

            {/* Invite form */}
            <div className="mb-5 rounded-xl bg-white p-4 ring-1 ring-slate-200 shadow-sm">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {emails.map((e) => (
                  <span
                    key={e}
                    className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[12px] text-indigo-700 ring-1 ring-indigo-100"
                  >
                    {e}
                    <button onClick={() => setEmails((p) => p.filter((x) => x !== e))} aria-label={`Remove ${e}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addEmail(emailInput);
                    }
                  }}
                  onBlur={() => emailInput && addEmail(emailInput)}
                  placeholder="contact@client.com (Enter to add)"
                  className="h-9 flex-1 rounded-lg bg-white px-2.5 text-[13px] text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={sendInvites}
                  disabled={emails.length === 0}
                  className="rounded-lg bg-violet-600 px-3 text-[13px] font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  Send invite{emails.length > 1 ? "s" : ""}
                </button>
              </div>
            </div>

            {/* Contacts table */}
            {selected.contacts.length === 0 ? (
              <p className="text-[13px] text-slate-500">
                No contacts yet — invite someone above.
              </p>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Delivery</th>
                    <th className="pb-2">Last login</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {selected.contacts.map((ct) => (
                    <tr key={ct.id} className="border-t border-slate-100">
                      <td className="py-2">{ct.email}</td>
                      <td className="py-2"><Badge value={ct.status} /></td>
                      <td className={`py-2 ${DELIVERY_BADGE[ct.delivery_status] ?? ""}`}>
                        {ct.delivery_status}
                      </td>
                      <td className="py-2 text-slate-400">
                        {ct.last_login_at
                          ? new Date(ct.last_login_at).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="py-2 text-right">
                        {ct.status !== "revoked" &&
                          (confirmContactId === ct.id ? (
                            <div className="flex justify-end gap-1.5">
                              <span className="self-center text-[11px] text-slate-500">
                                Revoke access?
                              </span>
                              <button
                                onClick={() => revokeContact(ct.id)}
                                className="flex items-center gap-1 rounded bg-rose-600 px-2 py-1 text-[12px] font-medium text-white hover:bg-rose-500"
                              >
                                <Check className="h-3 w-3" /> Confirm
                              </button>
                              <button
                                onClick={() => setConfirmContactId(null)}
                                className="rounded px-1.5 py-1 text-[12px] text-slate-600 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => resend(ct.id)}
                                className="flex items-center gap-1 rounded px-1.5 py-1 text-[12px] text-slate-600 hover:bg-slate-100"
                              >
                                <RotateCw className="h-3 w-3" /> Resend
                              </button>
                              <button
                                onClick={() => setConfirmContactId(ct.id)}
                                className="rounded px-1.5 py-1 text-[12px] text-rose-600 hover:bg-rose-50"
                              >
                                Revoke
                              </button>
                            </div>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>

      {/* Whole-client revoke confirm */}
      {confirmRevoke && selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <h3 className="text-[16px] font-semibold text-slate-900">Revoke {selected.name}?</h3>
            <p className="mt-2 text-[13px] text-slate-500">
              This immediately blocks every contact for this client. They will need
              a fresh invite to regain access.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmRevoke(false)}
                className="rounded-lg px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={revokeClient}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-rose-500"
              >
                Revoke client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hard-delete confirm — irreversible, so require typing the exact name */}
      {confirmDelete && selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <h3 className="text-[16px] font-semibold text-slate-900">
              Delete {selected.name}?
            </h3>
            <p className="mt-2 text-[13px] text-slate-500">
              This permanently deletes the company and <strong>all of its data</strong> —
              audit reports, contacts and sessions. This cannot be undone. Type{" "}
              <span className="font-mono text-slate-700">{selected.name}</span> to confirm.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={selected.name}
              className="mt-3 h-9 w-full rounded-lg bg-white px-2.5 text-[13px] text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteConfirmText("");
                }}
                className="rounded-lg px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={deleteClient}
                disabled={deleteConfirmText.trim() !== selected.name}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-rose-500 disabled:opacity-50"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
