import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyMagicToken } from "@/adapters/bff/auth.client.bff";
import { ClientLogin } from "@/features/login/ClientLogin";
import { useAuthStore } from "@/state/authStore";

// Landing for a client magic link (#/auth/verify?token=...). Redeems the token,
// hydrates the session, and forwards into the portal. On any failure (used /
// expired / forged / missing) it shows the identical relink screen — nothing
// reveals whether the token/contact existed (R7).
export function ClientVerifyRoute() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hydrate = useAuthStore((s) => s.hydrate);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    (async () => {
      const token = params.get("token");
      if (!token) {
        if (live) setFailed(true);
        return;
      }
      const ok = await verifyMagicToken(token);
      if (!live) return;
      if (!ok) {
        setFailed(true);
        return;
      }
      await hydrate();
      navigate("/dashboard", { replace: true });
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <ClientLogin heading="This link is no longer valid — enter your email to get a new one." />
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      Signing you in…
    </div>
  );
}
