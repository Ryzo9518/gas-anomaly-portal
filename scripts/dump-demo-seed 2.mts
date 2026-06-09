// Dumps the demo client fixtures (LOJAF, Meridian, KFC) to a JSON seed file the
// backend can load into ClientData. Run: npx tsx scripts/dump-demo-seed.mts
// Output: backend/seed/demo_clients.json — committed so the backend seed is
// reproducible and matches exactly what the demo build renders.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as lojaf from "../src/features/audit/reports.fixture.lojaf";
import * as assetmgmt from "../src/features/audit/reports.fixture.assetmgmt";
import * as kfc from "../src/features/audit/reports.fixture.kfc";

const here = dirname(fileURLToPath(import.meta.url));

const clients = [lojaf, assetmgmt, kfc].map((m) => ({
  name: m.CLIENT_INFO.name,
  health_target: m.CLIENT_INFO.healthTarget,
  is_demo: true,
  reports: m.REPORTS,
  engagements: m.SEED_ENGAGEMENTS,
}));

const out = resolve(here, "../backend/seed/demo_clients.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(clients, null, 2) + "\n");
console.log(
  `Wrote ${clients.length} clients -> ${out}\n` +
    clients
      .map((c) => `  - ${c.name}: ${c.reports.length} reports, ${Object.keys(c.engagements).length} engagements`)
      .join("\n"),
);
