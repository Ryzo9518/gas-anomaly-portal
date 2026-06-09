// Auth port — the seam between view code and the auth provider.
// Phase 1 runs the mock adapter (open session, no credential check).
// Phase 2 introduces a bff/ adapter wired to the FastAPI magic-link flow.

export interface Session {
  userId: string;
  displayName: string;
  userName: string;
  isOpenSession?: boolean;
  // True for staff on the admin allow-list (R1). Drives admin-only UI gating;
  // the backend independently enforces admin access on every admin route.
  isAdmin?: boolean;
}

// Object-shaped credentials so future fields (MFA token, captcha) extend
// this type without forcing a port reshape.
export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthPort {
  getSession(): Promise<Session | null>;
  signIn(credentials: SignInCredentials): Promise<Session>;
  signOut(): Promise<void>;
  // Staff door — full-page redirect to the backend OIDC start endpoint
  // ("Sign in with Microsoft"). No-op under the mock adapter.
  startMicrosoftLogin(): void;
}
