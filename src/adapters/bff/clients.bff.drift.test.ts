import { describe, expect, it } from "vitest";
import { assembleEntry } from "@/adapters/bff/clients.bff";
import { getClientEntry } from "@/features/clients/clients.data";

// FIXTURE-REALITY DRIFT AUDIT (docs/FIXTURE_CONTRACT.md §7.1).
// The registry ClientEntry is the contract. Feeding the BFF adapter the same
// data must produce a structurally identical ClientEntry — same keys, same
// nesting. Any rename/drop/add by the adapter fails here. Runs in the default
// (mock) build where the registry contains the demo clients.
describe("BFF clients adapter parity vs fixture contract", () => {
  const reg = getClientEntry("tourvest");

  it("registry contains the demo client (sanity)", () => {
    expect(reg).toBeTruthy();
  });

  const r = reg!;
  const dto = { id: r.id, name: r.info.name, healthTarget: r.info.healthTarget };
  const bff = assembleEntry(dto, r.reports);

  it("ClientEntry top-level keys match", () => {
    expect(Object.keys(bff).sort()).toEqual(Object.keys(r).sort());
  });

  it("info object matches exactly (incl. healthTarget camelCase)", () => {
    expect(bff.info).toEqual(r.info);
  });

  it("reports are passed through verbatim", () => {
    expect(bff.reports).toEqual(r.reports);
  });

  it("reportsDesc + latestReportId derived identically to the registry", () => {
    expect(bff.reportsDesc.map((x) => x.id)).toEqual(r.reportsDesc.map((x) => x.id));
    expect(bff.latestReportId).toBe(r.latestReportId);
  });

  it("AuditReport field set matches the contract (no drift)", () => {
    expect(Object.keys(bff.reports[0]).sort()).toEqual(
      Object.keys(r.reports[0]).sort(),
    );
  });

  it("AuditFinding field set matches the contract (no drift)", () => {
    expect(Object.keys(bff.reports[0].findings[0]).sort()).toEqual(
      Object.keys(r.reports[0].findings[0]).sort(),
    );
  });

  it("seedEngagements is an object (never null) for clients", () => {
    expect(bff.seedEngagements).toEqual({});
  });
});
