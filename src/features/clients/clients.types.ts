// Pure type module for the client layer. Kept SEPARATE from clients.data.ts
// (which holds the runtime fixture registry) so that view code importing these
// types never drags the fixtures into a client-portal bundle (R13). clients.data
// becomes reachable only through the tree-shakeable mock adapter.
import type { AuditReport, Engagement } from "@/features/audit/reports.fixture";

export interface ClientInfo {
  name: string;
  healthTarget: number;
}

export interface ClientEntry {
  id: string; // URL slug / client id
  info: ClientInfo;
  reports: AuditReport[]; // as authored (oldest -> newest)
  reportsDesc: AuditReport[]; // newest first
  latestReportId: string;
  seedEngagements: Record<string, Engagement>;
}

export interface ClientSummary {
  id: string;
  name: string;
}
