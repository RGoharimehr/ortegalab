#!/bin/sh
# Ubuntu 26.04: extract authenticated distribution packages without root access.
set -eu
cd "$(dirname "$0")/.."
root=$(pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p data/pdf-tools
cd "$work"
apt-get download poppler-utils libpoppler156 libcurl3t64-gnutls libgpgmepp7 libjpeg8 libjpeg-turbo8 libopenjp2-7 libtiff6 libnss3 libnspr4 libgpgme45 libwebp7 liblerc4 libjbig0 libdeflate0
for archive in *.deb; do dpkg-deb -x "$archive" "$root/data/pdf-tools"; done
LD_LIBRARY_PATH="$root/data/pdf-tools/usr/lib/x86_64-linux-gnu" "$root/data/pdf-tools/usr/bin/pdftocairo" -v

# Warm only the extra trusted preview package used to crop TikZ pages.
cat > "$work/paper.tex" <<'TEX'
\documentclass{article}
\usepackage[active,tightpage]{preview}
\begin{document}
\begin{preview}Diagram tools ready.\end{preview}
\end{document}
TEX
bwrap --die-with-parent --unshare-all --share-net --ro-bind /usr /usr --symlink usr/lib /lib --symlink usr/lib64 /lib64 --ro-bind /etc/fonts /etc/fonts --ro-bind /etc/ssl /etc/ssl --ro-bind /etc/resolv.conf /etc/resolv.conf --ro-bind "$root/data/bin/tectonic" /tectonic --bind "$work" /work --bind "$root/data/tex-cache" /cache --proc /proc --dev /dev --tmpfs /tmp --clearenv --setenv HOME /tmp --setenv PATH /usr/bin --setenv TECTONIC_CACHE_DIR /cache --chdir /work /tectonic --untrusted paper.tex
