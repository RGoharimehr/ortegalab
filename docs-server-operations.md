# Hetzner operations

Production: https://latfs.duckdns.org, SSH `reza@188.245.82.3`, checkout `/var/www/ortegalab`.

Publish changes to GitHub master first. On the server, ensure the checkout is clean, create a backup, pull with `git pull --ff-only`, run `npm ci` if dependencies changed and `npm run build`, then `pm2 restart latfs --update-env` and `pm2 save`. Verify `/healthz` over HTTPS.

Set `HOST=127.0.0.1` in the private server `.env`; Nginx proxies to port 3000. Container deployments can retain `HOST=0.0.0.0`.

## Backups

Run from the server checkout:

```sh
flock -n /home/reza/latfs-backups/backup.lock node --env-file-if-exists=.env scripts/backup.js
```

The daily cron runs at 03:20 server time. It retains the latest two completed archives outside the checkout, checks SQLite integrity, and includes uploads and the private `.env`. SQLite is captured using its online backup API. Uploads are copied afterwards, so avoid deleting or replacing uploads during a backup if strict cross-file consistency is needed. Archive access is restricted to the owner. Backups contain credentials; never commit or publicly share them.

On the Mac, run `sh scripts/offsite-backup.sh`. This copies the latest completed archive over SSH into ignored `data/offsite-backups`, verifies SHA-256 against the server, and retains fourteen copies. Off-server copies are currently disabled at the owner’s request pending selection of external storage. Do not run this helper without approval. The Codex maintenance task checks website health and server backup freshness hourly while the Mac/Codex are available; it does not copy archives. This is not an always-on external monitoring service.

For recovery, stop the app, preserve the current database/config/uploads separately, extract a chosen archive into a private temporary directory, and check `latfs.db` with SQLite `PRAGMA integrity_check`. Restore the database to the configured database path, `.env` to the checkout, and uploads to the configured uploads path. Remove stale WAL/SHM files only after stopping the app and preserving the old database. Preserve owner-only access to `.env`, then restart PM2 and verify health and content.

## Logs and monitoring

PM2 log rotation uses a 10 MB threshold, seven retained compressed logs, and daily rotation. Check with `pm2 conf pm2-logrotate`. HTTPS health is `/healthz`; a healthy response is HTTP 200 with `{"ok":true}`. The maintenance task alerts on failures/recovery or stale backups and stays quiet otherwise. Server backup failures are recorded in `/home/reza/latfs-backups/backup.log` (latest run).

## Search indexing

Public pages now have path URLs (for example `/research` and `/research/1`), server-rendered readable content, metadata, and organization structured data. Old fragment links redirect in the browser to the corresponding path. `/sitemap.xml` includes public research, active people, facilities and news details. Admin, platform and password-reset responses carry `X-Robots-Tag: noindex, nofollow`.

Canonical URLs, social preview URLs, robots.txt and the sitemap use the private server `BASE_URL` setting. It currently points to the working DuckDNS hostname. When the final domain is ready, configure DNS/TLS, update `BASE_URL`, restart PM2, redirect the old hostname to matching paths, then verify the final domain in Google Search Console and submit `/sitemap.xml`. Never set a canonical hostname that is not serving the website.
