# Hetzner Deployment Runbook — `anomaly.gasecosys.co.za`

This runbook is **binding** (see `AGENTS.md`). It describes the **actual** live
deployment as it runs today. The portal is **three** artifacts (a FastAPI
backend, a node-served staff SPA, and a Caddy-served client portal) on a Hetzner
box **shared with the intacct-toolkit** — never touch the intacct services.

> **History:** an earlier version of this file described an nginx / `/var/www` /
> "no backend" setup that never matched reality, which led to hand-typed,
> inconsistent deploys (a missing `server.js` caused an outage; a stale `/portal`
> caused a client-login crash). This rewrite (2026-06-10) documents what is
> actually on the box and replaces ad-hoc deploys with `scripts/deploy-hetzner.sh`.

---

## 0. The box

- **Host:** `root@159.69.216.113` (hostname `jera-toolkit`). **Shared with
  intacct-toolkit** — `intacct-backend`, `intacct-frontend`,
  `intacct-toolkit-runner` and port **:8000** are NOT ours. Do not restart or
  touch them.
- **Reverse proxy:** **Caddy** (auto-HTTPS), config `/etc/caddy/conf.d/anomaly.caddy`
  (imported by `/etc/caddy/Caddyfile`).

## 1. The three artifacts

| Artifact | Path on box | Served by | Port | Build |
|----------|-------------|-----------|------|-------|
| **Backend** (FastAPI) | `/opt/gas-portal/backend` | `gas-portal-api.service` (uvicorn) | 127.0.0.1:**8001** | — (Python) |
| **Staff SPA** | `/opt/gas-anomaly-portal/dist` | `gas-anomaly.service` (`node server.js`) | 127.0.0.1:**8090** | `VITE_ADAPTER=bff npm run build` |
| **Client portal** | `/opt/gas-portal/portal` | **Caddy static** (`handle_path /portal/*`) | — | `VITE_AUTH=client VITE_DATA_ADAPTER=bff npm run build` |

Caddy routes: `/api/*` → :8001 · `/portal/*` → `/opt/gas-portal/portal` (static)
· everything else → :8090 (staff) · legacy passcode sites at `/c/<slug>/` →
`/opt/gas-portal/clients/<id>` (being retired).

- **Backend env:** `/etc/gas-portal/api.env` (root, `0600`) — `DATABASE_URL`
  (Postgres `gas_portal`), `SESSION_SECRET`, `ALLOWED_STAFF_EMAILS`,
  `ADMIN_EMAILS`, `ENTRA_*`, `GRAPH_*`, `ISOLATION_VERIFIED`. The service runs
  `alembic upgrade head` via `ExecStartPre` on every start.

> **⚠ The `server.js` gotcha (caused an outage).** The staff SPA is served by a
> small node static server, `dist/server.js`. **`vite build` does NOT produce
> this file** — it lives in the repo at `deploy/static-server.js` and must be
> copied into `dist/` on every staff deploy. If it goes missing, `gas-anomaly.service`
> dies with `MODULE_NOT_FOUND` on the next restart/reboot. The deploy script
> handles this; never `rsync --delete` into the staff dist without it.

---

## 2. Deploy (the only supported path)

Deploy with the script — it builds all three artifacts from a **clean, current
`main`**, restores `server.js`, backs up each target, logs the SHA, and verifies
the live bundle hash equals what it just built.

```bash
git checkout main && git pull
scripts/deploy-hetzner.sh            # all three artifacts
# or a single one:
scripts/deploy-hetzner.sh backend    # | staff | portal
```

The script **refuses** to run on a dirty tree, off `main`, or when `main` is
behind `origin/main`. It requires SSH to the box, `node`/`npm`, and `rsync`.

**Build modes (chosen by env at build time, see `src/adapters/index.ts`):**
- Staff: `VITE_ADAPTER=bff` — Microsoft SSO; switcher + admin "Clients" = one
  backend roster.
- Client portal: `VITE_AUTH=client VITE_DATA_ADAPTER=bff` — magic-link login,
  per-client data, served at `/portal`.
- Offline demo: no env — mock auth + build-time registry, no backend.

Both `bff` builds tree-shake the fixtures out of the bundle (verified by
`npm run verify:isolation` for scoped builds).

---

## 3. Quality gates (before any deploy)

1. `npm run typecheck` — 0 errors.
2. `npm run build` — succeeds. (The deploy script builds per-mode.)
3. Manual smoke after deploy — the script curls `/`, `/portal/`, `/api/health`
   (expect 200) and verifies `live bundle hash == built hash`.

Backend tests: `cd backend && pytest`. No GitHub Actions / cloud CI — gates run
locally / as the pre-commit hook.

---

## 4. Deploy log

`scripts/deploy-hetzner.sh` appends one line per deploy to
`/opt/gas-anomaly-portal/DEPLOY_LOG.txt`:

```
<UTC ts> | sha=<git sha> | mode=<all|backend|staff|portal> (...) | by=<who>
```

This keeps the live site traceable to a commit. Always deploy via the script so
the log stays complete.

---

## 5. Rollback

The script backs up each target to `<dir>.bak-<sha>` before overwriting. To roll
back, restore the previous backup and restart the relevant service:

```bash
# staff (restore dir + its server.js, then restart)
ssh root@159.69.216.113 'cd /opt/gas-anomaly-portal && rm -rf dist && cp -r dist.bak-<sha> dist && systemctl restart gas-anomaly.service'
# portal (Caddy static — no restart needed)
ssh root@159.69.216.113 'cd /opt/gas-portal && rm -rf portal && cp -r portal.bak-<sha> portal'
# backend
ssh root@159.69.216.113 'cd /opt/gas-portal && rm -rf backend/app && cp -r backend.bak-<sha>/app backend/app && systemctl restart gas-portal-api.service'
```

Keep the most recent 1–2 backups per artifact; prune older ones (disk is ample
but they accumulate).

---

## 6. Health checks

```bash
curl -I https://anomaly.gasecosys.co.za/            # 200 — staff SPA
curl -I https://anomaly.gasecosys.co.za/portal/     # 200 — client portal
curl -s https://anomaly.gasecosys.co.za/api/health  # {"ok":true}
ssh root@159.69.216.113 'systemctl is-active gas-portal-api gas-anomaly caddy'
```

Verify the intacct co-tenant is unaffected: `ss -ltn | grep :8000` still listens.

---

## 7. Data note

A client exists in the backend the moment an admin creates it, but it has **no
audit data** until a report payload is loaded
(`POST /api/admin/clients/{id}/data`). A client logging in before its data is
loaded sees a "no audit data yet" workspace (handled gracefully). There is not
yet a UI for loading data — it is an admin/API step.
