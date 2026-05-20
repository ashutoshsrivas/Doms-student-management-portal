#!/usr/bin/env bash
# Restore one of the gzipped backups under /opt/doms/_backups into MariaDB.
# Always takes a safety snapshot of the current state before touching the live DB.
#
# Usage:
#   /opt/doms/scripts/restore.sh             # interactive picker
#   /opt/doms/scripts/restore.sh <file.sql.gz> [database]
#
# The database name is inferred from the filename prefix (doms-* or appdb-*)
# unless you pass it explicitly as the second argument.

set -euo pipefail

BACKUP_DIR=/opt/doms/_backups

list_backups() {
  echo "Available backups in $BACKUP_DIR:"
  printf '  %-3s  %-44s  %-9s  %s\n' '#' 'FILE' 'SIZE' 'WHEN (UTC)'
  printf '  %-3s  %-44s  %-9s  %s\n' '---' '--------------------------------------------' '---------' '--------------------'
  local i=1
  while IFS= read -r f; do
    sz=$(stat -c %s "$f")
    when=$(stat -c %y "$f" | cut -d. -f1)
    printf '  %-3s  %-44s  %-9s  %s\n' "$i" "$(basename "$f")" "$(numfmt --to=iec $sz)" "$when"
    i=$((i+1))
  done < <(ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null)
}

# === Pick a backup file ===
if [ $# -ge 1 ]; then
  FILE=$1
  [ -f "$FILE" ] || FILE="$BACKUP_DIR/$1"
  if [ ! -f "$FILE" ]; then
    echo "Backup file not found: $1" >&2
    list_backups
    exit 1
  fi
else
  list_backups
  echo
  read -rp 'Enter the number (or full filename) to restore: ' CHOICE
  if [[ "$CHOICE" =~ ^[0-9]+$ ]]; then
    FILE=$(ls -1t "$BACKUP_DIR"/*.sql.gz | sed -n "${CHOICE}p")
    [ -z "$FILE" ] && { echo 'Invalid number.' >&2; exit 1; }
  else
    FILE="$BACKUP_DIR/$CHOICE"
    [ -f "$FILE" ] || { echo "Not found: $CHOICE" >&2; exit 1; }
  fi
fi

# === Infer DB name from filename (doms-... or appdb-...) ===
if [ $# -ge 2 ]; then
  DB=$2
else
  DB=$(basename "$FILE" | cut -d- -f1)
fi

case "$DB" in
  doms|appdb) ;;
  *) echo "Refusing to restore to database '$DB' (only 'doms' or 'appdb' are recognised). Override by passing it as the second argument." >&2; exit 1 ;;
esac

echo
echo '====================================================='
echo " Restore target DB : $DB"
echo " From backup file  : $FILE"
echo " Size              : $(numfmt --to=iec $(stat -c %s "$FILE"))"
echo " Taken             : $(stat -c %y "$FILE" | cut -d. -f1)"
echo '====================================================='
echo
echo 'WARNING: This DROPS the live "'"$DB"'" database and reloads it from the backup.'
echo 'A safety snapshot of the CURRENT state will be taken first (so even this is reversible).'
echo
read -rp "Type the database name ($DB) to proceed: " CONFIRM
if [ "$CONFIRM" != "$DB" ]; then
  echo 'Confirmation did not match. Aborting. No changes made.'
  exit 1
fi

# === 1) Safety snapshot of the live DB ===
SAFETY="$BACKUP_DIR/${DB}-pre-restore-$(date -u +%Y%m%d-%H%M%S).sql.gz"
echo
echo "[1/4] Taking safety snapshot of current $DB -> $SAFETY"
if ! mysqldump --single-transaction --quick --skip-lock-tables \
     --routines --triggers --events --default-character-set=utf8mb4 \
     "$DB" | gzip -c > "$SAFETY"; then
  rm -f "$SAFETY"
  echo 'Safety snapshot FAILED. Aborting before restore.' >&2
  exit 1
fi
echo "      Safety snapshot ok ($(numfmt --to=iec $(stat -c %s "$SAFETY")))"

# === 2) Drop + recreate target DB ===
echo "[2/4] Dropping and recreating $DB ..."
mysql -e "DROP DATABASE IF EXISTS \`$DB\`; CREATE DATABASE \`$DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# === 3) Stream the backup into MariaDB ===
echo "[3/4] Importing $FILE into $DB ..."
gunzip -c "$FILE" | mysql "$DB"

# === 4) Restart the backend so it drops stale connections / re-reads schema ===
echo "[4/4] Restarting doms-backend (graceful, in-flight requests finish)..."
pm2 reload doms-backend >/dev/null 2>&1 || pm2 restart doms-backend >/dev/null 2>&1 || echo '  (pm2 not available -- restart manually if needed)'

echo
echo 'Restore complete.'
echo
echo 'Rollback (undo this restore):'
echo "  /opt/doms/scripts/restore.sh \"$SAFETY\" $DB"
