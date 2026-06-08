import type { AuthPort, Session } from "@/ports/auth.port";

// Mock auth adapter — the Phase 1 CLIENT passcode gate.
//
// Client-facing scoped builds run on this adapter (not bff). A passcode is set
// per build via VITE_CLIENT_PASSCODE (replaced by a literal at build time):
//   • set    → getSession() returns null (NO auto-login); signIn() requires the
//              passcode, entered in the /login password field.
//   • unset  → open session immediately (unguarded internal/dev runs).
//
// Honest posture: the passcode lives in the bundle — a gate, not a vault. The
// real guarantee is per-client build isolation (clients.data.ts). Staff use
// Microsoft SSO via the bff adapter; magic-link clients arrive in Phase 2.

const delay = (ms = 80) => new Promise<void>((r) => setTimeout(r, ms));

const PASSCODE = import.meta.env.VITE_CLIENT_PASSCODE as string | undefined;

const openSession: Session = {
  userId: "demo-user",
  displayName: "Aisha Patel",
  userName: "Aisha Patel",
  isOpenSession: true,
};

export const authMock: AuthPort = {
  async getSession() {
    await delay();
    // With a passcode configured, never auto-restore — force the /login gate.
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
  startMicrosoftLogin() {
    // Mock/dev: no real identity provider. Open-session mode is reached via
    // signIn() (the email/password form), so this is a no-op.
    console.warn("startMicrosoftLogin() is a no-op under the mock adapter");
  },
};
