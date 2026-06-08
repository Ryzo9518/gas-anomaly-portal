// Feature flags — phase gating lives here.
// Views never hardcode phase knowledge; they ask the flag module.

export type Phase = "active" | "stub" | "locked";

// V1 audit portal feature flags.
//   active = route exists and renders real content
//   stub   = surface exists but is a placeholder (greyed in sidebar)
//   locked = role-gated, not entitled to this user
export const flags = {
  login: "active",
  dashboard: "active",
  upload: "active",
  report: "active",
  findings: "active",
  engagement: "active",
  // Stubs — planned for Phase 1/2 backend work.
  askJera: "stub",
  admin: "stub",
  notifications: "stub",
} satisfies Record<string, Phase>;

export type FeatureKey = keyof typeof flags;

export function isActive(key: FeatureKey): boolean { return flags[key] === "active"; }
export function isStub(key: FeatureKey): boolean { return flags[key] === "stub"; }
export function isLocked(key: FeatureKey): boolean { return flags[key] === "locked"; }
