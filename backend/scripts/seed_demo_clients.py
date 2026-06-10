"""Idempotent seed of the demo clients (LOJAF, Meridian, KFC) into the backend.

Reads backend/seed/demo_clients.json (generated from the SPA fixtures by
scripts/dump-demo-seed.mts) and upserts a Client + ClientData row per entry, so
the demo companies appear in the real staff switcher with their full audit story
(reports + engagements). Marked is_demo=True. Re-running updates in place — it
never duplicates a client (matched by name).

Run on the box (needs the runtime env / DB):
    cd /opt/gas-portal/backend
    .venv/bin/python -m scripts.seed_demo_clients          # seed/refresh
    .venv/bin/python -m scripts.seed_demo_clients --list   # just show what's there
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from sqlalchemy import select

from app.db import SessionLocal
from app.models import AuditLog, Client, ClientData

SEED_FILE = Path(__file__).resolve().parents[1] / "seed" / "demo_clients.json"
ACTOR = "seed:demo_clients"

AUDIT_REPORT_KEYS = {
    "id", "shortLabel", "cycleLabel", "status", "completedAt", "healthScore",
    "leakageEstimate", "leakageRecoverable", "risks", "findings",
    "uploadSubmittedAt", "uploads",
}


def _validate(reports: list[dict]) -> None:
    for r in reports:
        missing = AUDIT_REPORT_KEYS - set(r.keys())
        if missing:
            raise SystemExit(f"seed report missing fields {sorted(missing)} in {r.get('id')!r}")
        if set((r.get("risks") or {}).keys()) != {"critical", "high", "medium", "low"}:
            raise SystemExit(f"seed report {r.get('id')!r} has bad risks shape")


def main() -> None:
    if "--list" in sys.argv:
        with SessionLocal() as db:
            for c in db.scalars(select(Client).order_by(Client.name)).all():
                data = db.get(ClientData, c.id)
                n = len((data.payload or {}).get("reports", []) if isinstance(data.payload, dict) else (data.payload or [])) if data else 0
                flag = "demo" if (data and data.is_demo) else "real" if data else "no-data"
                print(f"  {c.name:45} {n} reports  [{flag}]  revoked={c.revoked_at is not None}")
        return

    clients = json.loads(SEED_FILE.read_text())
    with SessionLocal() as db:
        for entry in clients:
            name = entry["name"].strip()
            _validate(entry["reports"])
            payload = {"reports": entry["reports"], "engagements": entry.get("engagements", {})}
            client = db.scalar(select(Client).where(Client.name == name))
            if client is None:
                client = Client(name=name, health_target=entry.get("health_target", 80), created_by=ACTOR)
                db.add(client)
                db.flush()
                action = "created"
            else:
                client.health_target = entry.get("health_target", client.health_target)
                client.revoked_at = None  # un-revoke if it was retired
                action = "updated"
            data = db.get(ClientData, client.id)
            if data is None:
                db.add(ClientData(client_id=client.id, payload=payload, is_demo=True, updated_by=ACTOR))
            else:
                data.payload = payload
                data.is_demo = True
                data.updated_by = ACTOR
            db.add(AuditLog(
                event="client_data_seeded",
                actor=ACTOR,
                target_client_id=client.id,
                detail=f"{action}: {len(entry['reports'])} reports, {len(entry.get('engagements', {}))} engagements",
            ))
            print(f"  {action}: {name} ({len(entry['reports'])} reports, {len(entry.get('engagements', {}))} engagements)")
        db.commit()
    print("Done.")


if __name__ == "__main__":
    main()
