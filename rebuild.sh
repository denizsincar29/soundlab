#!/usr/bin/env bash
# rebuild.sh: deploy Sound Lab's static frontend to /var/www/html/soundlab
#
# Sound Lab is a pure static site: HTML, CSS, and ES6 modules, no build
# step, no server-side state, nothing to compile. This script only exists
# to rsync the right files to the right place and skip everything that
# isn't part of the deployed app.
#
# What it does:
#   • Copies index.html, css/, js/, and presets/ (the bundled reference
#     preset JSON files, fetched by the app's "load preset" file picker)
#   • Skips .git/, README.md, *.sh, and any local scratch files
#   • --delete removes stale files from dest that are gone from src, so a
#     renamed/removed preset or module does not linger on the server
#
# Usage:
#   ./rebuild.sh              deploy to default target
#   ./rebuild.sh /other/path  deploy to a custom target

set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:-/var/www/html/soundlab}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}==> soundlab rebuild${NC}"
echo    "    src : $SRC"
echo    "    dest: $DEST"
echo

# ── Preflight ────────────────────────────────────────────────────────────
if [[ ! -f "$SRC/index.html" ]]; then
    echo -e "${RED}ERROR: run this script from the repo root (index.html not found)${NC}"
    exit 1
fi

# Create dest if needed (requires sudo if /var/www is root-owned)
if [[ ! -d "$DEST" ]]; then
    echo -e "${YELLOW}  creating $DEST${NC}"
    mkdir -p "$DEST"
fi

# ── Copy static files with rsync ───────────────────────────────────────────
# --checksum        only copy when content differs (no unnecessary mtime updates)
# --delete          remove stale files from dest that are gone from src
# --exclude         skip everything that isn't deployed frontend

rsync -av --checksum --delete \
    --exclude='.git/'         \
    --exclude='rebuild.sh'    \
    --exclude='*.md'          \
    --exclude='*.bak'         \
    "$SRC/" "$DEST/"

echo
echo -e "${GREEN}==> Done.${NC}"
echo    "    Sound Lab is a static site, no service to restart."
echo    "    Make sure $DEST is served over http(s), not file://,"
echo    "    or the page's ES6 module imports will be blocked by the browser."
