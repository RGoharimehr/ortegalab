#!/bin/sh
# Install the pinned official Pandoc release without root access (Linux x86_64).
set -eu
cd "$(dirname "$0")/.."
[ "$(uname -s)" = Linux ] && [ "$(uname -m)" = x86_64 ] || { echo 'This installer requires Linux x86_64.'; exit 1; }
archive=$(mktemp)
work=$(mktemp -d)
trap 'rm -f "$archive"; rm -rf "$work"' EXIT
curl --fail --location --proto '=https' --tlsv1.2 https://github.com/jgm/pandoc/releases/download/3.12/pandoc-3.12-linux-amd64.tar.gz -o "$archive"
printf '%s  %s\n' '67d7d011fed8c8543306022b985b9b2499ab9b74818df91d8727c7e9ebc5ba06' "$archive" | sha256sum --check --status
tar -xzf "$archive" -C "$work"
mkdir -p data/bin
install -m 755 "$work/pandoc-3.12/bin/pandoc" data/bin/pandoc
data/bin/pandoc --version
