#!/bin/sh
# Provision the full compiler and a known package set; normal jobs stay offline.
set -eu
cd "$(dirname "$0")/.."
[ "$(uname -s)" = Linux ] && [ "$(uname -m)" = x86_64 ] || exit 1
command -v bwrap >/dev/null
command -v prlimit >/dev/null
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
curl -fsSL --proto '=https' https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.17.0/tectonic-0.17.0-x86_64-unknown-linux-musl.tar.gz -o "$work/engine.tar.gz"
printf '%s  %s\n' 8533d07f9ccbd7a65824b9e0459041bca34af1eb33daba48f59215593753a3b7 "$work/engine.tar.gz" | sha256sum --check --status
tar -xzf "$work/engine.tar.gz" -C "$work"
mkdir -p data/bin data/tex-cache
install -m 755 "$work/tectonic" data/bin/tectonic
cp test/fixtures/full-latex.tex "$work/paper.tex"
bwrap --die-with-parent --unshare-all --share-net --ro-bind /usr /usr --symlink usr/lib /lib --symlink usr/lib64 /lib64 --ro-bind /etc/fonts /etc/fonts --ro-bind /etc/ssl /etc/ssl --ro-bind /etc/resolv.conf /etc/resolv.conf --ro-bind "$(pwd)/data/bin/tectonic" /tectonic --bind "$work" /work --bind "$(pwd)/data/tex-cache" /cache --proc /proc --dev /dev --tmpfs /tmp --clearenv --setenv HOME /tmp --setenv PATH /usr/bin --setenv TECTONIC_CACHE_DIR /cache --chdir /work /tectonic --untrusted paper.tex
