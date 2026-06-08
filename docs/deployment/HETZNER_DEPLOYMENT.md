# Hetzner Deployment Runbook — `anomaly.gasecosys.co.za`

This runbook is **binding** (see `AGENTS.md` §6). The live build on Hetzner must
follow it exactly. It deploys the GAS Anomaly Portal as a static, client-side
single-page app served by nginx over HTTPS.

> **Status:** This runbook defines the required standard. Server-box-specific
> values (host, paths, existing nginx layout) are marked **CONFIRM** — fill them
> in once the target Hetzner box and DNS for `anomaly.gasecosys.co.za` are
> confirmed. Do not improvise them on a production box.

---

## 0. Why static + SPA fallback

- The app is a Vite build with `base: "./"` (relative asset paths) — it serves
  correctly from any host or path.
- It is **client-side routed** (React Router 6 via **HashRouter**). Routes live
  after a `#` (e.g. `index.html#/dashboard?report=2026`), so the server only ever
  receives `/` and deep links do **not** 404 on their own. The
  `try_files ... /index.html` rule below is retained as a safe best-practice net
  (and to serve hashed asset paths); it is not load-bearing for client-side
  routes while HashRouter is in use. If the app is ever switched to BrowserRouter,
  the fallback becomes load-bearing — keep it.
- Phase 1 makes **no backend calls** — there is nothing to proxy yet. When the
  Phase 2 FastAPI backend lands, add an `/api/` proxy block (see §7); the
  static-serving rules below do not change.

---

## 1. Non-negotiables (from the law)

1. Deploy **only from committed source on `main`**. No hand-edited files on the server.
2. **All three quality gates pass before promoting a deploy** (typecheck, build, manual).
3. Serve `dist/` as a static SPA with `try_files $uri $uri/ /index.html;`.
4. **No GitHub Actions / cloud CI.** Deployment is the manual/scripted process below.
5. **HTTPS only.** HTTP redirects to HTTPS.
6. **Fixture mode is an explicit build-time choice** (§3) — recorded, never ambiguous.
7. **Record the deployed commit SHA** so the live site is traceable to a revision.

---

## 2. Prerequisites (one-time, on the Hetzner box)

- **CONFIRM** target host (e.g. the existing GAS/Jera Hetzner box) and a deploy user.
- Node.js (build can run on the server **or** locally — see §4). Match the major
  version the project builds clean on (Node 20+ recommended; verified on Node 26).
- nginx installed and enabled.
- DNS: an `A` record for `anomaly.gasecosys.co.za` → the Hetzner box public IP. **CONFIRM**
- certbot (Let's Encrypt) for TLS.
- Web root for this site: `/var/www/anomaly.gasecosys.co.za/current` (symlink to a
  timestamped release dir — see §5). **CONFIRM** if the box uses a different convention.

---

## 3. Choose the fixture mode (REQUIRED, recorded decision)

The portal ships with two fixture modes. The live site must pick one deliberately:

| Mode | Build command | What it shows | Use when |
|------|---------------|---------------|----------|
| `demo` (default) | `npm run build` | 3-year history, Tourvest seed, R670K cumulative | Sales-demo / showcase site |
| `clean` | `VITE_FIXTURE=clean npm run build` | First-time client, no history, upload intake | A real client's first live audit |

For `clean` mode, first update `src/features/audit/reports.fixture.clean.ts`
(`CLIENT_INFO.name`, health score, leakage figures, `FINDINGS_CURRENT`) on a
branch, get it reviewed, and merge to `main` — never edit fixtures on the server.

**Record the chosen mode in the deploy log (§6).**

---

## 4. Build (gates must pass)

Build from a clean checkout of `main`. Building locally and shipping `dist/`, or
building on the server, are both acceptable — the gates are identical.

```bash
git clone https://github.com/Ryzo9518/gas-anomaly-portal.git
cd gas-anomaly-portal
git checkout main
git rev-parse HEAD          # <-- record this SHA for the deploy log

npm ci                      # reproducible install from package-lock.json
npm run typecheck           # Gate 1 — must be 0 errors
npm run build               # Gate 2 — must succeed   (or: VITE_FIXTURE=clean npm run build)
# Gate 3 (manual visual check) — run once before first promotion:
#   PORT=5199 npm run preview   and verify the QUALITY_GATES.md regression checklist
```

If any gate fails, **stop** — do not publish. Fix on a branch, merge, rebuild.

The publishable artifact is the `dist/` directory.

---

## 5. Publish (atomic release + rollback)

Use timestamped release directories with a `current` symlink so promotion is
atomic and rollback is instant.

```bash
# On the server (or via rsync from your machine):
RELEASE="/var/www/anomaly.gasecosys.co.za/releases/$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$RELEASE"
sudo rsync -a --delete dist/ "$RELEASE/"

# Atomic switch:
sudo ln -sfn "$RELEASE" /var/www/anomaly.gasecosys.co.za/current
sudo nginx -t && sudo systemctl reload nginx
```

**Rollback:** point `current` back at the previous release dir and reload nginx.

```bash
sudo ln -sfn /var/www/anomaly.gasecosys.co.za/releases/<previous> /var/www/anomaly.gasecosys.co.za/current
sudo systemctl reload nginx
```

Keep the last few releases; prune older ones.

---

## 6. Deploy log (required)

Append one line per deploy to `/var/www/anomaly.gasecosys.co.za/DEPLOY_LOG.txt`:

```
<UTC timestamp> | sha=<git SHA> | mode=<demo|clean> | release=<dir> | by=<who>
```

This satisfies the "deployed commit SHA is recorded / traceable" rule.

---

## 7. nginx site config

`/etc/nginx/sites-available/anomaly.gasecosys.co.za` (symlink into
`sites-enabled/`). TLS lines are added by certbot in §8.

```nginx
server {
    listen 80;
    server_name anomaly.gasecosys.co.za;
    # certbot adds the HTTPS redirect here after §8.
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name anomaly.gasecosys.co.za;

    root /var/www/anomaly.gasecosys.co.za/current;
    index index.html;

    # SPA fallback — REQUIRED. Unknown paths return index.html so client-side
    # routes (/dashboard, /findings, /engagement, ...) work on deep link / refresh.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Long-cache the fingerprinted assets; never cache the HTML shell.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /index.html {
        add_header Cache-Control "no-store";
    }

    gzip on;
    gzip_types text/css application/javascript image/svg+xml application/json;

    # --- Phase 2 only: uncomment when the FastAPI backend is live ---
    # location /api/ {
    #     proxy_pass http://127.0.0.1:8000;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     proxy_set_header X-Forwarded-Proto $scheme;
    # }

    # ssl_certificate / ssl_certificate_key lines added by certbot (§8).
}
```

---

## 8. TLS (Let's Encrypt)

```bash
sudo certbot --nginx -d anomaly.gasecosys.co.za
sudo certbot renew --dry-run     # confirm auto-renewal works
```

HTTP must redirect to HTTPS (certbot configures this).

---

## 9. Post-deploy verification

```bash
curl -I https://anomaly.gasecosys.co.za/                 # 200, text/html
curl -I https://anomaly.gasecosys.co.za/dashboard        # 200 (SPA fallback, NOT 404)
curl -sI http://anomaly.gasecosys.co.za/ | grep -i location   # 301 -> https
```

Then load the site in a browser and walk the `QUALITY_GATES.md` regression
checklist: report switch rehydrates all screens, historical reports show the
amber banner and freeze, the cumulative KPI stays live, and deep-link refresh works.

---

## 10. One-shot deploy script (optional, recommended)

Once the **CONFIRM** values are fixed, capture §4–§6 in
`scripts/deploy-hetzner.sh` in this repo so deploys are repeatable and identical
every time. The script must still run all three gates and refuse to publish on
any gate failure.
