import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/state/authStore";

// Public landing after the backend redirects back from Microsoft. It restores
// the session from the cookie (via getSession) and forwards into the app.
export function AuthCallbackRoute() {
  const navigate = useNavigate();
  const hydrate = useAuthStore((s) => s.hydrate);

  React.useEffect(() => {
    (async () => {
      await hydrate();
      navigate("/dashboard", { replace: true });
    })();
  }, [hydrate, navigate]);

  return (
    <div className="flex h-screen items-center justify-center text-slate-500">
      Signing you in…
    </div>
  );
}
