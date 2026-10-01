#!/bin/sh
# Run on the administrator's Mac. Copies only completed server backups over SSH.
set -eu
umask 077
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
destination="$root/data/offsite-backups"
mkdir -p "$destination"
chmod 700 "$destination"
latest=$(ssh -o BatchMode=yes -o ConnectTimeout=15 reza@188.245.82.3 'find /home/reza/latfs-backups -maxdepth 1 -name "latfs-*.tar.gz" -printf "%f\n" | sort | tail -1')
case "$latest" in latfs-*.tar.gz) ;; *) echo 'No completed server backup found' >&2; exit 1 ;; esac
case "$latest" in *[!a-zA-Z0-9.-]*) echo 'Invalid backup filename' >&2; exit 1 ;; esac
expected=$(ssh -o BatchMode=yes -o ConnectTimeout=15 reza@188.245.82.3 "sha256sum /home/reza/latfs-backups/$latest" | cut -d ' ' -f 1)
if [ ! -f "$destination/$latest" ]; then
  scp -q -o BatchMode=yes -o ConnectTimeout=15 "reza@188.245.82.3:/home/reza/latfs-backups/$latest" "$destination/$latest.partial"
  actual=$(shasum -a 256 "$destination/$latest.partial" | cut -d ' ' -f 1)
  [ "$actual" = "$expected" ] || { rm -f "$destination/$latest.partial"; echo 'Checksum mismatch' >&2; exit 1; }
  mv "$destination/$latest.partial" "$destination/$latest"
fi
actual=$(shasum -a 256 "$destination/$latest" | cut -d ' ' -f 1)
[ "$actual" = "$expected" ] || { echo 'Existing backup checksum mismatch' >&2; exit 1; }
chmod 600 "$destination/$latest"
# Retain the newest fourteen verified copies; never touch other files.
python3 - "$destination" <<'PY'
from pathlib import Path
import sys
files = sorted(Path(sys.argv[1]).glob('latfs-*.tar.gz'), reverse=True)
for file in files[14:]:
    file.unlink()
PY
printf 'Off-server backup verified: %s\n' "$destination/$latest"
