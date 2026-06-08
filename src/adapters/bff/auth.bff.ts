import type { AuthPort, Session } from "@/ports/auth.port";

// Talks to the FastAPI backend through Caddy's /api/* proxy. The session is a
// HttpOnly cookie set by the backend, so every call uses credentials:"include"
// and the SPA never sees the token.

async function getSession(): Promise<Session | null> {
  const res = await fetch("/api/auth/session", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data) return null;
  return {
    userId: data.userId,
    displayName: data.displayName,
    userName: data.userName,
  };
}

export const authBff: AuthPort = {
  getSession,
  async signIn() {
    // Staff use Microsoft SSO; there is no password door in bff mode.
    throw new Error("Use Sign in with Microsoft");
  },
  async signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  },
  startMicrosoftLogin() {
    window.location.href = "/api/auth/microsoft/start";
  },
};
