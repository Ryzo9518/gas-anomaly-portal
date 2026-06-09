import * as React from "react";
import { Mail } from "lucide-react";
import { requestRelink } from "@/adapters/bff/auth.client.bff";

// Client-portal login: passwordless. The client enters their email and receives
// a fresh single-use link. Used both as the /login route in the client build and
// as the fallback when a magic link is used/expired/invalid. Matches the portal
// dark-violet surface; full visual polish to be reviewed against the design
// system (see docs/specs design review notes).
export function ClientLogin({ heading }: { heading?: string }) {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) return;
    setBusy(true);
    try {
      await requestRelink(trimmed);
    } finally {
      setBusy(false);
      setSent(true); // identical outcome regardless of match (no enumeration)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5">
      <div className="w-full max-w-sm rounded-2xl border border-violet-700/20 bg-[rgba(20,18,43,0.85)] p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-700 text-[13px] font-extrabold text-white">
            GAS
          </span>
          <span className="text-[15px] font-semibold text-white">
            GAS Anomaly Portal
          </span>
        </div>

        {sent ? (
          <div className="text-slate-300">
            <h1 className="mb-2 text-[18px] font-semibold text-white">
              Check your inbox
            </h1>
            <p className="text-[14px] leading-relaxed text-slate-400">
              If your email is registered, a secure sign-in link is on its way.
              The link is single-use and expires shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h1 className="mb-2 text-[18px] font-semibold text-white">
              Sign in to your audit portal
            </h1>
            <p className="mb-5 text-[13.5px] leading-relaxed text-slate-400">
              {heading ?? "Enter your email and we'll send you a secure sign-in link."}
            </p>
            <label
              htmlFor="client-email"
              className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              Email
            </label>
            <div className="relative mt-1.5">
              <Mail
                aria-hidden
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              />
              <input
                id="client-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-11 w-full rounded-lg bg-slate-950/55 pl-10 pr-3 text-[14px] text-white ring-1 ring-slate-700/70 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Email me a link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
