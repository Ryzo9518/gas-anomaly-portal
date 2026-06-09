import * as React from "react";
import { toast } from "sonner";
import { Building2, Plus, RotateCw, Ban, X } from "lucide-react";
import { adminApi, type AdminClient } from "@/adapters/bff/admin.bff";

// Admin "Invite & manage clients". Functional + on-theme; FLAGGED for a visual
// pass against the locked design system (design review AI-slop note). All actions
// hit the admin-only API (server-enforced).

const STATUS_BADGE: Record<string, string> = {
  invited: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/20",
  active: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  revoked: "bg-rose-500/15 text-rose-300 ring-rose-400/20",
};
const DELIVERY_BADGE: Record<string, string> = {
  pending: "text-amber-300",
  sent: "text-emerald-300",
  failed: "text-rose-300",
};

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
        STATUS_BADGE[value] ?? "bg-slate-700/30 text-slate-300 ring-slate-600/30"
      }`}
    >
      {value}
    </span>
  );
}

export function AdminClients() {
  const [clients, setClients] = React.useState<AdminClient[] | null>(null);
  const [error, setError] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [emails, setEmails] = React.useState<string[]>([]);
  const [emailInput, setEmailInput] = React.useState("");
  const [confirmRevoke, setConfirmRevoke] = React.useState(false);

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

  if (error)
    return <p className="p-8 text-slate-400">Couldn't load clients. Refresh to retry.</p>;
  if (!clients)
    return <p className="p-8 text-slate-400">Loading…</p>;

  return (
    <div className="flex gap-6 p-6">
      {/* Left: client picker + create */}
      <aside className="w-64 shrink-0 space-y-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          Clients
        </h2>
        {clients.length === 0 && (
          <p className="text-[13px] text-slate-500">No clients yet — create one below.</p>
        )}
        <ul className="space-y-1">
          {clients.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] ${
                  c.id === selectedId
                    ? "bg-violet-500/20 text-white"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0 text-violet-300" />
                <span className="truncate">{c.name}</span>
                {c.revoked && <span className="ml-auto text-[10px] text-rose-300">revoked</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 pt-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createClient()}
            placeholder="New client name"
            className="h-9 flex-1 rounded-lg bg-slate-950/55 px-2.5 text-[13px] text-white ring-1 ring-slate-700/70 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
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
              <h1 className="text-[18px] font-semibold text-white">{selected.name}</h1>
              {!selected.revoked && (
                <button
                  onClick={() => setConfirmRevoke(true)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-rose-300 ring-1 ring-rose-400/20 hover:bg-rose-500/10"
                >
                  <Ban className="h-3.5 w-3.5" /> Revoke whole client
                </button>
              )}
            </div>

            {/* Invite form */}
            <div className="mb-5 rounded-xl bg-slate-900/40 p-4 ring-1 ring-white/5">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {emails.map((e) => (
                  <span
                    key={e}
                    className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[12px] text-indigo-200"
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
                  className="h-9 flex-1 rounded-lg bg-slate-950/55 px-2.5 text-[13px] text-white ring-1 ring-slate-700/70 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
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
                <tbody className="text-slate-300">
                  {selected.contacts.map((ct) => (
                    <tr key={ct.id} className="border-t border-white/5">
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
                        {ct.status !== "revoked" && (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => resend(ct.id)}
                              className="flex items-center gap-1 rounded px-1.5 py-1 text-[12px] text-slate-300 hover:bg-white/5"
                            >
                              <RotateCw className="h-3 w-3" /> Resend
                            </button>
                            <button
                              onClick={() => revokeContact(ct.id)}
                              className="rounded px-1.5 py-1 text-[12px] text-rose-300 hover:bg-rose-500/10"
                            >
                              Revoke
                            </button>
                          </div>
                        )}
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 ring-1 ring-white/10">
            <h3 className="text-[16px] font-semibold text-white">Revoke {selected.name}?</h3>
            <p className="mt-2 text-[13px] text-slate-400">
              This immediately blocks every contact for this client. They will need
              a fresh invite to regain access.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmRevoke(false)}
                className="rounded-lg px-3 py-1.5 text-[13px] text-slate-300 hover:bg-white/5"
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
    </div>
  );
}
