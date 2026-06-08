// ============================================================================
// FIXTURE SELECTOR — switches between demo and client fixture at runtime.
//
// VITE_FIXTURE=demo  (or unset) → reports.fixture.ts
//   3-year history · Tourvest demo · R670K cumulative · full YoY card
//   Run with: PORT=5199 npm run dev:demo
//
// VITE_FIXTURE=clean             → reports.fixture.clean.ts
//   First-time client · no history · upload intake mode · zeros on cumulative
//   Run with: PORT=5199 npm run dev:client
//
// Both fixtures ship with identical export shapes so ReportContext never
// needs to know which one is active. Vite replaces import.meta.env.VITE_FIXTURE
// at build time — unused fixture data is dead-code eliminated in production
// builds (each mode produces a separate optimised bundle).
// ============================================================================

import * as demo  from "@/features/audit/reports.fixture";
import * as clean from "@/features/audit/reports.fixture.clean";

const f = import.meta.env.VITE_FIXTURE === "clean" ? clean : demo;

export const CLIENT_INFO       = f.CLIENT_INFO;
export const REPORTS           = f.REPORTS;
export const REPORTS_DESC      = f.REPORTS_DESC;
export const LATEST_REPORT_ID  = f.LATEST_REPORT_ID;
export const SEED_ENGAGEMENTS  = f.SEED_ENGAGEMENTS;
export const priorReportOf     = f.priorReportOf;
export const computeCumulative = f.computeCumulative;
export const totalRisks        = f.totalRisks;
export const severeRisks       = f.severeRisks;
