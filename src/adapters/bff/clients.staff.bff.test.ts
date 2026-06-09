import { afterEach, describe, expect, it, vi } from "vitest";
import { clientsStaffBff } from "./clients.staff.bff";
import { EMPTY_REPORT, type AuditReport } from "@/features/audit/reports.fixture";

const ADMIN_CLIENTS = [
  { id: "u1", name: "Alpha", health_target: 80, revoked: false },
  { id: "u2", name: "Beta", health_target: 75, revoked: true },
];

const REPORTS: AuditReport[] = [
  { ...EMPTY_REPORT, id: "2025", shortLabel: "2025", completedAt: "2025-04-01" },
  { ...EMPTY_REPORT, id: "2026", shortLabel: "2026", completedAt: "2026-04-01" },
];

function mockFetch(map: Record<string, unknown>) {
  return vi.fn(async (url: string) =>
    url in map
      ? ({ ok: true, status: 200, json: async () => map[url] } as Response)
      : ({ ok: false, status: 404 } as Response),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("clientsStaffBff (staff data adapter)", () => {
  it("listClients maps non-revoked clients to summaries (revoked hidden)", async () => {
    vi.stubGlobal("fetch", mockFetch({ "/api/admin/clients": ADMIN_CLIENTS }));
    expect(await clientsStaffBff.listClients()).toEqual([
      { id: "u1", name: "Alpha" },
    ]);
  });

  it("getClient assembles a ClientEntry (info + reports, newest-first)", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/admin/clients": ADMIN_CLIENTS,
        "/api/admin/clients/u1/reports": REPORTS,
      }),
    );
    const entry = await clientsStaffBff.getClient("u1");
    expect(entry).toBeTruthy();
    expect(entry!.info).toEqual({ name: "Alpha", healthTarget: 80 });
    expect(entry!.reportsDesc.map((r) => r.id)).toEqual(["2026", "2025"]);
    expect(entry!.latestReportId).toBe("2026");
  });

  it("getClient yields an empty-workspace entry when no data is loaded", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        "/api/admin/clients": ADMIN_CLIENTS,
        "/api/admin/clients/u1/reports": [],
      }),
    );
    const entry = await clientsStaffBff.getClient("u1");
    expect(entry!.reports).toEqual([]);
    expect(entry!.latestReportId).toBe("");
  });

  it("getClient returns null for a revoked or unknown client", async () => {
    vi.stubGlobal("fetch", mockFetch({ "/api/admin/clients": ADMIN_CLIENTS }));
    expect(await clientsStaffBff.getClient("u2")).toBeNull(); // revoked
    expect(await clientsStaffBff.getClient("nope")).toBeNull(); // unknown
  });
});
