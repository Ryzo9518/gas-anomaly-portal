// src/features/clients/clients.data.ts
// The client registry. Each entry bundles exactly what ReportContext needs for
// one client. Tourvest = reports.fixture.ts; New Client = reports.fixture.clean.ts.
// Adding a client this week = add a fixture module + one branch below.
//
// BUILD-TIME SCOPING: Vite replaces import.meta.env.VITE_CLIENT with a string
// literal at build time, so the branches not taken are statically dead and the
// unused fixture's data is tree-shaken out of a per-client production build.
// This is the same mechanism the old fixture.active.ts relied on. It is the
// security boundary that keeps one client's data out of another's bundle —
// and it is VERIFIED, not trusted, by scripts/verify-client-isolation.sh.
import type { AuditReport, Engagement } from "@/features/audit/reports.fixture";
import * as tourvestData from "@/features/audit/reports.fixture";
import * as newClientData from "@/features/audit/reports.fixture.clean";

export interface ClientInfo {
  name: string;
  healthTarget: number;
}

export interface ClientEntry {
  id: string; // URL slug
  info: ClientInfo;
  reports: AuditReport[]; // as authored (oldest → newest)
  reportsDesc: AuditReport[]; // newest first
  latestReportId: string;
  seedEngagements: Record<string, Engagement>;
}

export interface ClientSummary {
  id: string;
  name: string;
}

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

export const DEFAULT_CLIENT_ID = "tourvest";

const SCOPE = (import.meta.env.VITE_CLIENT as string | undefined) ?? "all";

export const CLIENTS: ClientEntry[] =
  SCOPE === "tourvest"
    ? [toEntry("tourvest", tourvestData)]
    : SCOPE === "newclient"
      ? [toEntry("newclient", newClientData)]
      : [toEntry("tourvest", tourvestData), toEntry("newclient", newClientData)];

export const CLIENT_SUMMARIES: ClientSummary[] = CLIENTS.map((c) => ({
  id: c.id,
  name: c.info.name,
}));

export function getClientEntry(id: string): ClientEntry | null {
  return CLIENTS.find((c) => c.id === id) ?? null;
}
