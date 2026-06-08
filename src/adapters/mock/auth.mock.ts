import type { AuthPort, Session } from "@/ports/auth.port";

// Mock auth adapter — open session, no credential check.
// The prototype runs without a backend; sign-in always succeeds.
// Persona aligns with the audit fixture (Tourvest Travel Group).

const delay = (ms = 80) => new Promise<void>((r) => setTimeout(r, ms));

const openSession: Session = {
  userId: "demo-user",
  displayName: "Aisha Patel",
  userName: "Aisha Patel",
  isOpenSession: true,
};

export const authMock: AuthPort = {
  async getSession() {
    await delay();
    return openSession;
  },
  // Credentials accepted to satisfy the port shape; ignored at runtime.
  async signIn(_credentials) {
    await delay();
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
