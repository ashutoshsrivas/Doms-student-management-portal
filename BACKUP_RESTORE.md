# Backup & Restore

This portal automatically backs up its MariaDB databases every night and
provides a one-command restore. The current data is the priority — every
restore takes a safety snapshot of the live state *before* touching it, so even
restores are reversible.

---

## TL;DR

| You want to… | Command |
|---|---|
| Take a backup right now | `/opt/doms/app/scripts/backup.sh` |
| Restore (interactive picker) | `/opt/doms/app/scripts/restore.sh` |
| Restore a specific file | `/opt/doms/app/scripts/restore.sh doms-20260520-053954.sql.gz` |
| See when the next auto-backup runs | `sudo systemctl list-timers doms-backup.timer` |
| See backup history | `cat /opt/doms/_backups/backup.log` |
| See timer-driven run history | `sudo journalctl -u doms-backup.service` |

---

## What is and isn't covered

| ✅ Backed up | ❌ Not backed up by this system |
|---|---|
| `doms` database (new portal — users, sessions, assessments, rubrics, mentor teams, announcements, SIP, all of it) | Files in S3 (`s3://rpms.geu.ac.in/uploads/doms/`) — turn on **S3 versioning + lifecycle** in the AWS console |
| `appdb` database (legacy PHP site) | Legacy uploads on disk (`/var/www/html/profilepics/`, `/var/www/html/certificates/`) |
| | The application code (already in git — that *is* the backup) |
| | The server itself (`/etc/`, `/opt/`, certs, etc.) — relies on AWS EC2 snapshots or AMI baking |

If you need to start backing up the legacy upload directories on disk, tell me
and I'll extend `backup.sh` to also `tar.gz` them into the same `_backups/` dir.

---

## How the automatic backup works

- **Schedule**: every day at **02:00 IST** (20:30 UTC), with up to 5 minutes of
  randomized delay so multiple servers wouldn't pile on at once.
- **Mechanism**: a systemd timer (`doms-backup.timer`) fires a oneshot service
  (`doms-backup.service`) which runs `/opt/doms/app/scripts/backup.sh` as
  `ec2-user`.
- **Output**: gzipped SQL dumps land in `/opt/doms/_backups/`, named
  `{database}-{YYYYMMDD-HHMMSS}.sql.gz` (timestamps in UTC).
- **Retention**: 14 days. The script deletes any `*.sql.gz` older than that on
  every run. (Pre-restore safety snapshots aren't filtered specially — they
  rotate at the same age. If you want to keep one indefinitely, copy it out of
  `_backups/`.)
- **Consistency**: `mysqldump --single-transaction` produces a consistent
  snapshot **without locking writes**. Users can keep using the site while a
  backup runs.
- **Survives reboot**: `Persistent=true` on the timer means if the box was off
  when the schedule fired, the next backup runs as soon as the box is back up.

The script logs everything to `/opt/doms/_backups/backup.log` and trims that
log to 512 KB if it ever exceeds 1 MB.

---

## How to restore

### Interactive (recommended)

```bash
/opt/doms/app/scripts/restore.sh
```

The script will:

1. List every backup with its size and timestamp, numbered.
2. Ask you which one to restore (by number, or paste a filename).
3. Infer which database to restore into from the filename (`doms-*` →
   restore into `doms`; `appdb-*` → restore into `appdb`).
4. Make you **type the database name** to confirm — this is a destructive op.
5. Take a *fresh* gzipped dump of the CURRENT live state into the same
   `_backups/` directory, named `{db}-pre-restore-{timestamp}.sql.gz`. This is
   your undo button.
6. Drop and recreate the target database with `utf8mb4` collation.
7. Stream the chosen backup into it.
8. `pm2 reload doms-backend` (graceful — in-flight requests finish) so the
   backend drops stale connections and re-reads the schema.
9. Print the **exact command to undo** this restore.

### Non-interactive

```bash
/opt/doms/app/scripts/restore.sh doms-20260520-053954.sql.gz
# or with an absolute path:
/opt/doms/app/scripts/restore.sh /opt/doms/_backups/doms-20260520-053954.sql.gz
# explicit target DB (only needed if filename doesn't start with doms- or appdb-):
/opt/doms/app/scripts/restore.sh some-file.sql.gz doms
```

It still prompts for the type-the-DB-name confirmation. There's no `--force`
flag on purpose.

### Undoing a restore

After every restore, the last line of output tells you exactly how to roll
back to where you were before the restore. Example:

```
Rollback (undo this restore):
  /opt/doms/app/scripts/restore.sh "/opt/doms/_backups/doms-pre-restore-20260520-180000.sql.gz" doms
```

That works because the safety snapshot is itself a valid backup file in the
same format.

---

## Paths reference

| Thing | Path |
|---|---|
| Backup script | `/opt/doms/app/scripts/backup.sh` (in this repo: `scripts/backup.sh`) |
| Restore script | `/opt/doms/app/scripts/restore.sh` (in this repo: `scripts/restore.sh`) |
| Backup files | `/opt/doms/_backups/*.sql.gz` |
| Backup log | `/opt/doms/_backups/backup.log` |
| MariaDB creds | `/home/ec2-user/.my.cnf` (mode 600, user `admin`, password local) |
| systemd service | `/etc/systemd/system/doms-backup.service` (in this repo: `scripts/systemd/doms-backup.service`) |
| systemd timer | `/etc/systemd/system/doms-backup.timer` (in this repo: `scripts/systemd/doms-backup.timer`) |

The `~/.my.cnf` file is **not** in git (and shouldn't be — it contains the
admin password). It's set up once per server.

---

## Fresh-server install (one-time setup)

If you ever bring up a new EC2 from scratch and want backups working:

```bash
# 1. Code (assumes git clone already done into /opt/doms/app and DB user 'admin' exists)
sudo chmod +x /opt/doms/app/scripts/backup.sh /opt/doms/app/scripts/restore.sh

# 2. MariaDB credentials file for ec2-user (replace password)
cat > ~/.my.cnf <<EOF
[client]
user=admin
password=Dom@geu123
host=127.0.0.1
default-character-set=utf8mb4
EOF
chmod 600 ~/.my.cnf

# 3. Backup storage directory
sudo mkdir -p /opt/doms/_backups
sudo chown ec2-user:ec2-user /opt/doms/_backups

# 4. Install systemd unit files from this repo
sudo cp /opt/doms/app/scripts/systemd/doms-backup.service /etc/systemd/system/
sudo cp /opt/doms/app/scripts/systemd/doms-backup.timer  /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now doms-backup.timer

# 5. Smoke-test by firing once manually
sudo systemctl start doms-backup.service
ls -lh /opt/doms/_backups/
```

---

## Updating the scripts later

Because the systemd service points at the in-repo path, any updates flow
through git:

```bash
# Locally:
# edit scripts/backup.sh or scripts/restore.sh
git add scripts/ && git commit -m "..." && git push origin main

# On the server:
cd /opt/doms/app && git pull
sudo chmod +x scripts/*.sh   # in case mode bits flipped
# No systemd reload needed unless you changed the .service or .timer files.
```

If you change `scripts/systemd/*.service` or `*.timer`:

```bash
sudo cp /opt/doms/app/scripts/systemd/doms-backup.service /etc/systemd/system/
sudo cp /opt/doms/app/scripts/systemd/doms-backup.timer  /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart doms-backup.timer
```

---

## Troubleshooting

**Backup says `Access denied` or hangs.**
Check `~/.my.cnf` exists, is mode 600, and that the `admin` user works:
`mysql -e 'SHOW DATABASES;'` should list `appdb`, `doms`, etc.

**Disk filling up.**
Backups are ~100 KB each today, ~3 MB total in 14 days. If the DBs ever grow
to gigabytes, lower `RETENTION_DAYS` in `scripts/backup.sh` or move
`_backups/` to a larger volume / S3.

**Restore failed mid-import.**
The safety snapshot was already taken (look in `_backups/` for
`{db}-pre-restore-*.sql.gz`). Drop the broken DB and restore that snapshot:

```bash
/opt/doms/app/scripts/restore.sh {db}-pre-restore-{timestamp}.sql.gz
```

**Timer didn't fire when expected.**
`sudo systemctl list-timers doms-backup.timer` shows the next scheduled time.
`sudo journalctl -u doms-backup.service` shows past invocations. If
`Persistent=true` is set and the box was off, the missed run executes shortly
after boot.

**You want a backup *right now* before a risky change.**
Just run `/opt/doms/app/scripts/backup.sh` manually. It coexists with the
nightly timer — both write into the same directory, distinguishable by
timestamp.

---

## What I'd add next (optional)

1. **S3 versioning + lifecycle on `rpms.geu.ac.in`** (AWS Console → S3 →
   bucket → Properties → Bucket Versioning → Enable). This is the single
   biggest gap right now — uploaded files have no recovery path. Five-minute
   change in the console.
2. **Off-box copies of backups**: sync `_backups/` to S3 (e.g. a separate
   `rpms.geu.ac.in-backups/` bucket) so a destroyed EC2 doesn't take the
   backups with it. Trivial to add: `aws s3 sync /opt/doms/_backups/
   s3://.../backups/ --exclude '*.log'` at the end of `backup.sh`.
3. **Restore-test cron**: every Sunday, restore the latest backup into a
   throwaway `doms_restoretest` DB and run a couple of `SELECT count(*)`
   sanity queries. Proves the backups are actually restorable, not silently
   broken.

Ask me when you're ready for any of these.
