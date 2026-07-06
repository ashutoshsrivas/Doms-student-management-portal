#!/usr/bin/env bash
# Production deploy for DOMS portal — runs on the EC2 host.
#
# Safety model (DATA IS THE PRIORITY):
#   1. Take a fresh DB backup BEFORE touching anything. If backup fails, abort.
#   2. Fast-forward git pull only — never `reset --hard`.
#   3. Build frontend BEFORE reloading services. If build fails, abort
#      (the live site keeps serving the old build).
#   4. `pm2 reload` is graceful: zero-downtime, no in-flight request drop.
#   5. Backend DB sync is `force: false` with inline ALTER-IF-MISSING — it
#      only adds new tables/columns, never drops.
#   6. Post-deploy health check against /health. Non-zero exit on failure so
#      CI surfaces it loudly.
#
# Rollback (if needed):
#   cd /opt/doms/app && git reset --hard <previous-sha>
#   cd backend && npm ci --omit=dev
#   cd ../frontend && npm ci && npm run build
#   pm2 reload <names>
#   (DB restore only if a destructive migration actually ran:
#     /opt/doms/app/scripts/restore.sh <pre-deploy-backup>.sql.gz)
#
# Configuration via env vars (override in CI or shell):
#   APP_DIR        path to checkout                (default /opt/doms/app)
#   BRANCH         git branch to deploy            (default main)
#   PM2_BACKEND    pm2 process name for backend    (default doms-backend)
#   PM2_FRONTEND   pm2 process name for frontend   (default doms-frontend)
#   HEALTH_URL     URL to curl after reload        (default http://127.0.0.1:4000/health)
#   SKIP_BACKUP    set to 1 to skip pre-deploy backup (NOT recommended)

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/doms/app}"
BRANCH="${BRANCH:-main}"
PM2_BACKEND="${PM2_BACKEND:-doms-backend}"
PM2_FRONTEND="${PM2_FRONTEND:-doms-frontend}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4000/health}"
SKIP_BACKUP="${SKIP_BACKUP:-0}"

log() { printf '[deploy %s] %s\n' "$(date -u +%H:%M:%SZ)" "$*"; }
die() { log "FATAL: $*"; exit 1; }

[ -d "$APP_DIR/.git" ] || die "$APP_DIR is not a git checkout"
cd "$APP_DIR"

PREV_SHA=$(git rev-parse HEAD)
log "current sha: $PREV_SHA"

# ---- 1. Pre-deploy backup ---------------------------------------------------
if [ "$SKIP_BACKUP" != "1" ]; then
  if [ -x "$APP_DIR/scripts/backup.sh" ]; then
    log "running pre-deploy backup..."
    "$APP_DIR/scripts/backup.sh" || die "backup.sh failed — aborting deploy"
    log "backup OK"
  else
    die "scripts/backup.sh missing or not executable — refusing to deploy without a backup. Set SKIP_BACKUP=1 to override (NOT recommended)."
  fi
else
  log "WARNING: SKIP_BACKUP=1 — no pre-deploy backup taken"
fi

# ---- 2. Fetch + fast-forward ------------------------------------------------
log "fetching origin/$BRANCH..."
git fetch --prune origin "$BRANCH"
TARGET_SHA=$(git rev-parse "origin/$BRANCH")
log "target sha: $TARGET_SHA"

if [ "$PREV_SHA" = "$TARGET_SHA" ]; then
  log "already at target SHA — nothing to do"
  exit 0
fi

# Refuse to deploy if the working tree is dirty (someone edited on the server)
if ! git diff --quiet || ! git diff --cached --quiet; then
  die "working tree on server is dirty — refuse to overwrite local edits. Investigate before re-running."
fi

git merge --ff-only "origin/$BRANCH" || die "fast-forward merge failed (history diverged). Investigate before re-running."
log "checked out $TARGET_SHA"

# ---- 3. Install + build -----------------------------------------------------
log "installing backend deps (npm ci --omit=dev)..."
( cd backend && npm ci --omit=dev ) || die "backend npm ci failed"

log "installing frontend deps + building..."
( cd frontend && npm ci && npm run build ) || die "frontend build failed — backend NOT reloaded, site still serving previous build"

# ---- 4. Reload services (graceful, zero downtime) ---------------------------
log "reloading pm2 process: $PM2_BACKEND"
pm2 reload "$PM2_BACKEND" --update-env || die "pm2 reload $PM2_BACKEND failed"

log "reloading pm2 process: $PM2_FRONTEND"
pm2 reload "$PM2_FRONTEND" --update-env || die "pm2 reload $PM2_FRONTEND failed"

pm2 save >/dev/null 2>&1 || true

# ---- 5. Health check --------------------------------------------------------
log "health check: $HEALTH_URL"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
    log "health OK on attempt $i"
    log "DEPLOY SUCCESS  $PREV_SHA -> $TARGET_SHA"
    exit 0
  fi
  sleep 2
done

die "health check failed after 10 attempts — backend may be down. Check 'pm2 logs $PM2_BACKEND' and consider rolling back."

# deploy trigger — 2026-07-06T06:47:35Z
