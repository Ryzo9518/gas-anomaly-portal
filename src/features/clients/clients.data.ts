// ============================================================================
// clients.data.ts — the client registry + build-time client scoping.
//
// A "client" is the layer ABOVE reports: each client owns its own set of audit
// reports and seed engagements. This registry is what the internal switcher
// lists and what a scoped per-client build narrows down to.
//
// BUILD-TIME SCOPING (the isolation guarantee)
//   `import.meta.env.VITE_CLIENT` is replaced by a string literal at build
//   time. The per-client `if (...)` guards below therefore fold to constants,
//   so in a `VITE_CLIENT=<id>` production build every OTHER client's branch is
//   dead code — its fixture is tree-shaken OUT of the bundle entirely (not
//   merely hidden). Verify with the isolation grep in the deploy runbook.
//
//   • unset / "all"  → internal build: every client present, switcher shown.
//   • "<id>"         → scoped build: only that client's data is bundled.
//
// Adding a client = add its `reports.fixture.<id>.ts`, a namespace import, and
// one `if (...) registry.push(...)` line below.
// ============================================================================

import type { AuditReport, Engagement } from "@/features/audit/reports.fixture";
import * as tourvest from "@/features/audit/reports.fixture";
import * as newclient from "@/features/audit/reports.fixture.clean";

export interface ClientInfo {
  name: string;
  healthTarget: number;
}

export interface ClientEntry {
  id: string; // URL slug, e.g. "tourvest"
  info: ClientInfo;
  reports: AuditReport[]; // source order
  reportsDesc: AuditReport[]; // newest first
  latestReportId: string;
  seedEngagements: Record<string, Engagement>;
}

export interface ClientSummary {
  id: string;
  name: string;
}

// Shape a fixture module exposes (both demo + clean satisfy this).
interface FixtureModule {
  CLIENT_INFO: ClientInfo;
  REPORTS: AuditReport[];
  REPORTS_DESC: AuditReport[];
  LATEST_REPORT_ID: string;
  SEED_ENGAGEMENTS: Record<string, Engagement>;
}

function toEntry(id: string, m: FixtureModule): ClientEntry {
  return {
    id,
    info: m.CLIENT_INFO,
    reports: m.REPORTS,
    reportsDesc: m.REPORTS_DESC,
    latestReportId: m.LATEST_REPORT_ID,
    seedEngagements: m.SEED_ENGAGEMENTS,
  };
}

const SELECTED: string =
  (import.meta.env.VITE_CLIENT as string | undefined) || "all";

const registry: ClientEntry[] = [];
if (SELECTED === "all" || SELECTED === "tourvest") {
  registry.push(toEntry("tourvest", tourvest));
}
if (SELECTED === "all" || SELECTED === "newclient") {
  registry.push(toEntry("newclient", newclient));
}

export const CLIENTS: ClientEntry[] = registry;

/** True only for the internal all-clients build (switcher enabled). */
export const IS_INTERNAL_BUILD: boolean = SELECTED === "all";

/** First client in the active build — the default selection. */
export const DEFAULT_CLIENT_ID: string = CLIENTS[0]?.id ?? "tourvest";

export function clientSummaries(): ClientSummary[] {
  return CLIENTS.map((c) => ({ id: c.id, name: c.info.name }));
}

export function getClientEntry(id: string): ClientEntry | null {
  return CLIENTS.find((c) => c.id === id) ?? null;
}
