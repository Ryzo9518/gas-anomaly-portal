import type { AuthPort, Session } from "@/ports/auth.port";

// Client-portal auth adapter (magic-link, passwordless). Used in the
// client-portal build (VITE_AUTH=client). The session is an HttpOnly cookie set
// by the backend on verify; getSession reads it. Clients never use Microsoft or
// a password — they arrive via an emailed link.

async function getSession(): Promise<Session | null> {
  const res = await fetch("/api/auth/client/session", {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data) return null;
  return {
    userId: data.clientId,
    displayName: data.email,
    userName: data.email,
    isAdmin: false,
  };
}

/** Redeem a magic-link token (POST). Returns true on success. Called by the
 *  /auth/verify route, which reads the token from the URL fragment. */
export async function verifyMagicToken(token: string): Promise<boolean> {
  const res = await fetch("/api/auth/client/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.ok;
}

/** Self-service: request a fresh link by email. Always resolves (the backend
 *  returns an identical response whether or not the email is registered). */
export async function requestRelink(email: string): Promise<void> {
  await fetch("/api/auth/client/relink", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export const authClientBff: AuthPort = {
  getSession,
  async signIn() {
    throw new Error("Clients sign in via their emailed link.");
  },
  async signOut() {
    await fetch("/api/auth/client/logout", {
      method: "POST",
      credentials: "include",
    });
  },
  startMicrosoftLogin() {
    /* no-op for clients */
  },
};
