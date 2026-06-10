#!/usr/bin/env bash
#
# Deploy the GAS Anomaly Portal to the Hetzner box (anomaly.gasecosys.co.za).
#
# Builds and deploys all THREE artifacts from a CLEAN, up-to-date `main`:
#   1. backend  -> /opt/gas-portal/backend            (gas-portal-api.service :8001)
#   2. staff    -> /opt/gas-anomaly-portal/dist        (gas-anomaly.service node :8090)
#   3. portal   -> /opt/gas-portal/portal              (Caddy static, /portal)
#
# Why this script exists: deploys used to be hand-typed, which caused (a) the
# staff `server.js` going missing -> outage, and (b) the client portal being
# left on a stale build -> login crash. This script makes all three consistent,
# restores server.js, logs the SHA, and VERIFIES the live bundle == what it built.
#
# Usage:
#   scripts/deploy-hetzner.sh [all|backend|staff|portal]   # default: all
#
# Requires: SSH to $DEPLOY_HOST, node/npm, rsync. Run from a clean `main`.
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-root@159.69.216.113}"
STAFF_DIR="${STAFF_DIR:-/opt/gas-anomaly-portal/dist}"
PORTAL_DIR="${PORTAL_DIR:-/opt/gas-portal/portal}"
BACKEND_DIR="${BACKEND_DIR:-/opt/gas-portal/backend}"
DEPLOY_LOG="${DEPLOY_LOG:-/opt/gas-anomaly-portal/DEPLOY_LOG.txt}"
SITE="${SITE:-https://anomaly.gasecosys.co.za}"
TARGET="${1:-all}"

cd "$(git rev-parse --show-toplevel)"
ssh() { command ssh -o BatchMode=yes "$@"; }
say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# --- guards: only deploy committed, current main ---------------------------
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || die "not on main (checkout main first)"
git fetch -q origin
[ -z "$(git status --porcelain)" ] || die "working tree is dirty (commit/stash first)"
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || die "local main != origin/main (git pull first)"
command -v rsync >/dev/null || die "rsync not found"
ssh "$DEPLOY_HOST" true 2>/dev/null || die "cannot SSH to $DEPLOY_HOST"

SHA=$(git rev-parse --short HEAD)
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
say "Deploying [$TARGET] @ $SHA -> $DEPLOY_HOST"

backup() { ssh "$DEPLOY_HOST" "rm -rf '$1.bak-$SHA'; cp -r '$1' '$1.bak-$SHA'" || true; }
live_hash() { curl -s --max-time 15 "$1" | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1; }
built_hash() { ls dist/assets/index-*.js | xargs -n1 basename; }

deploy_backend() {
  say "backend"
  backup "$BACKEND_DIR/app"
  rsync -az --delete --exclude=__pycache__ --exclude='*.pyc' backend/app/ "$DEPLOY_HOST:$BACKEND_DIR/app/"
  rsync -az --exclude=__pycache__ backend/requirements.txt backend/requirements-dev.txt backend/migrations backend/alembic.ini "$DEPLOY_HOST:$BACKEND_DIR/"
  # alembic upgrade head runs via the service's ExecStartPre on restart.
  ssh "$DEPLOY_HOST" "cd '$BACKEND_DIR' && .venv/bin/pip -q install -r requirements.txt && systemctl restart gas-portal-api.service"
  sleep 3
  ssh "$DEPLOY_HOST" "systemctl is-active --quiet gas-portal-api.service" || die "gas-portal-api failed to start"
  echo "   backend ok"
}

deploy_staff() {
  say "staff (VITE_ADAPTER=bff)"
  rm -rf dist && VITE_ADAPTER=bff npm run build >/dev/null
  cp deploy/static-server.js dist/server.js     # the node static server — vite does NOT produce this
  local want; want=$(built_hash)
  backup "$STAFF_DIR"
  rsync -az --delete dist/ "$DEPLOY_HOST:$STAFF_DIR/"
  ssh "$DEPLOY_HOST" "test -f '$STAFF_DIR/server.js' || { echo 'server.js missing after deploy'; exit 1; }"
  ssh "$DEPLOY_HOST" "systemctl restart gas-anomaly.service"; sleep 2
  ssh "$DEPLOY_HOST" "systemctl is-active --quiet gas-anomaly.service" || die "gas-anomaly failed to start"
  local got; got=$(live_hash "$SITE/")
  [ "$got" = "$want" ] || die "staff verify: live=$got built=$want (mismatch)"
  echo "   staff ok ($want live)"
  rm -rf dist
}

deploy_portal() {
  say "portal (VITE_AUTH=client VITE_DATA_ADAPTER=bff)"
  rm -rf dist && VITE_AUTH=client VITE_DATA_ADAPTER=bff npm run build >/dev/null
  local want; want=$(built_hash)
  backup "$PORTAL_DIR"
  rsync -az --delete dist/ "$DEPLOY_HOST:$PORTAL_DIR/"   # Caddy static — no server.js needed
  local got; got=$(live_hash "$SITE/portal/")
  [ "$got" = "$want" ] || die "portal verify: live=$got built=$want (mismatch)"
  echo "   portal ok ($want live)"
  rm -rf dist
}

case "$TARGET" in
  all)     deploy_backend; deploy_staff; deploy_portal ;;
  backend) deploy_backend ;;
  staff)   deploy_staff ;;
  portal)  deploy_portal ;;
  *) die "unknown target '$TARGET' (use: all|backend|staff|portal)" ;;
esac

# --- log + smoke -----------------------------------------------------------
ssh "$DEPLOY_HOST" "echo '$TS | sha=$SHA | mode=$TARGET (scripts/deploy-hetzner.sh) | by='\$(whoami) >> '$DEPLOY_LOG'"
say "smoke test"
for url in "/" "/portal/" "/api/health"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 12 "$SITE$url")
  printf '   %-14s %s\n' "$url" "$code"
  [ "$code" = "200" ] || echo "   ⚠ $url returned $code"
done
say "done — $TARGET @ $SHA deployed and verified == built"
