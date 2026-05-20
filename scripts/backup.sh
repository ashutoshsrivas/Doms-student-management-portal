#!/usr/bin/env bash
# Nightly MariaDB backup for the DOMS portal.
# Dumps both 'doms' (new portal) and 'appdb' (legacy PHP site).
# Stores gzipped dumps under /opt/doms/_backups with 14-day rotation.
# Reads credentials from ~/.my.cnf.
#
# Manual run:   /opt/doms/scripts/backup.sh
# Cron-driven:  30 20 * * * /opt/doms/scripts/backup.sh  (20:30 UTC = 02:00 IST)

set -euo pipefail

BACKUP_DIR=/opt/doms/_backups
LOG=/opt/doms/_backups/backup.log
RETENTION_DAYS=14
DBS=(doms appdb)
TS=$(date -u +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"
exec >> "$LOG" 2>&1
echo "=== $(date -u --iso-8601=seconds) backup start ==="

for db in "${DBS[@]}"; do
  out="$BACKUP_DIR/${db}-${TS}.sql.gz"
  tmp="$out.tmp"
  echo "Dumping $db -> $out"
  if mysqldump --single-transaction --quick --skip-lock-tables \
       --routines --triggers --events \
       --default-character-set=utf8mb4 \
       "$db" 2>/dev/null | gzip -c > "$tmp"; then
    mv "$tmp" "$out"
    size=$(stat -c %s "$out")
    if [ "$size" -lt 500 ]; then
      echo "  WARN: $out is suspiciously small ($size bytes)"
    else
      echo "  OK   $out ($(numfmt --to=iec $size))"
    fi
  else
    rm -f "$tmp"
    echo "  FAIL: mysqldump exited non-zero for $db"
    # Continue with the other DBs rather than aborting entirely
  fi
done

# Rotation: remove gz dumps older than RETENTION_DAYS days
deleted=$(find "$BACKUP_DIR" -maxdepth 1 -name '*.sql.gz' -mtime +$RETENTION_DAYS -print -delete | wc -l)
echo "Rotated (deleted): $deleted file(s) older than $RETENTION_DAYS days"

# Cap the log itself at 1 MB by trimming
if [ -f "$LOG" ] && [ $(stat -c %s "$LOG") -gt 1048576 ]; then
  tail -c 524288 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
fi

echo "=== backup done ==="
