import { create } from "zustand";
import { auth } from "@/adapters";
import type { Session, SignInCredentials } from "@/ports/auth.port";

// Auth session store — single source of truth for the active user.
//
// Phase 1 (mock adapter)
//   The mock authMock returns an open session immediately. No JWT is
//   issued; `jwt`, `expiresAt`, and `client_id` stay null. The UI runs
//   in open-session mode for prototype demos.
//
// Phase 2 (bff adapter — FastAPI magic-link flow)
//   /api/auth/magic-link issues a JWT. authBff.signIn() returns a
//   Session, and setSession() persists jwt + expiresAt + client_id
//   from the JWT envelope. No view-layer code changes between phases.
//
// LOCKED INVARIANTS
//   • The Session shape in src/ports/auth.port.ts is authoritative for
//     `actor`. Extend SignInCredentials there for future auth fields
//     (MFA, OTP, captcha) rather than adding positional arguments.
//   • This store is intentionally NOT persisted to localStorage in
//     Phase 1. Token persistence + refresh cycle lands with the bff
//     adapter.

export interface AuthActor {
  userId: string;
  displayName: string;
  userName: string;
}

// Patch shape used by setSession(). Each field is optional so the bff
// adapter can write only what the auth response returned (e.g. a refresh
// that only re-issues `jwt`/`expiresAt`) without clobbering the rest.
// `null` is preserved as an explicit value (clears the field);
// `undefined` means "leave as-is".
export interface SessionPatch {
  jwt?: string | null;
  expiresAt?: number | null;
  client_id?: number | null;
  actor?: AuthActor | null;
  isOpenSession?: boolean;
}

interface AuthState {
  jwt: string | null;
  expiresAt: number | null;     // epoch ms; null when no JWT issued
  client_id: number | null;     // resolved from JWT claims, server-side
  actor: AuthActor | null;
  isOpenSession: boolean;        // mirrors Session.isOpenSession

  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  clearSession: () => void;
  // Called by the bff adapter once /api/auth/magic-link returns a JWT
  // envelope. Under the mock adapter it is never called.
  setSession: (next: SessionPatch) => void;
}

function actorFromSession(s: Session): AuthActor {
  return {
    userId: s.userId,
    displayName: s.displayName,
    userName: s.userName,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  jwt: null,
  expiresAt: null,
  client_id: null,
  actor: null,
  isOpenSession: false,

  async signIn(credentials: SignInCredentials) {
    const session = await auth.signIn(credentials);
    set({
      actor: actorFromSession(session),
      isOpenSession: !!session.isOpenSession,
    });
  },

  async signOut() {
    try {
      await auth.signOut();
    } finally {
      // Always clear local session even if the remote call fails — the
      // user's intent is to log out.
      set({
        jwt: null,
        expiresAt: null,
        client_id: null,
        actor: null,
        isOpenSession: false,
      });
    }
  },

  clearSession() {
    set({
      jwt: null,
      expiresAt: null,
      client_id: null,
      actor: null,
      isOpenSession: false,
    });
  },

  setSession(next) {
    // Shallow merge that treats `undefined` as "no change". Explicit
    // `null` is preserved on purpose — the bff sometimes needs to
    // clear a single field (e.g. expiry) without dropping the actor.
    const patch: Partial<AuthState> = {};
    if (next.jwt !== undefined) patch.jwt = next.jwt;
    if (next.expiresAt !== undefined) patch.expiresAt = next.expiresAt;
    if (next.client_id !== undefined) patch.client_id = next.client_id;
    if (next.actor !== undefined) patch.actor = next.actor;
    if (next.isOpenSession !== undefined) patch.isOpenSession = next.isOpenSession;
    set(patch);
  },
}));
