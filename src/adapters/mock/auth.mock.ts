import type { AuthPort, Session } from "@/ports/auth.port";

// Mock auth adapter — the Phase 1 passcode gate.
//
// A passcode is configured per build via `VITE_CLIENT_PASSCODE` (replaced by a
// literal at build time). When set, sign-in succeeds only if the password field
// matches the passcode — the existing /login screen is the entry point and the
// password field carries the passcode. When NOT set (unguarded dev/internal
// runs), sign-in opens a session immediately.
//
// SECURITY (honest): the passcode lives in the front-end bundle, so it is a
// gate, not a vault. The real protection is per-client build isolation
// (clients.data.ts). Real auth (M365 SSO / magic-link) arrives in Phase 2
// behind this same AuthPort seam — see docs/specs/2026-06-08-phase-2-auth-design.md.

const delay = (ms = 80) => new Promise<void>((r) => setTimeout(r, ms));

const PASSCODE: string | undefined = import.meta.env.VITE_CLIENT_PASSCODE as
  | string
  | undefined;

const openSession: Session = {
  userId: "demo-user",
  displayName: "Aisha Patel",
  userName: "Aisha Patel",
  isOpenSession: true,
};

export const authMock: AuthPort = {
  async getSession() {
    await delay();
    // When a passcode is configured, never auto-restore a session — the user
    // must pass the gate via /login. Otherwise (unguarded build) open session.
    return PASSCODE ? null : openSession;
  },
  async signIn(credentials) {
    await delay();
    if (PASSCODE && credentials.password !== PASSCODE) {
      throw new Error("Incorrect passcode.");
    }
    return openSession;
  },
  async signOut() {
    await delay();
  },
};
