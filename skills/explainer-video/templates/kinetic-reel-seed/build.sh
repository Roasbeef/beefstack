#!/usr/bin/env bash
# build.sh: concatenates reel/parts/*.js (engine + one file per chapter group) into reel/reel.js, the page's module.
set -euo pipefail
cd "$(dirname "$0")"
cat reel/parts/[0-9]-*.js > reel/reel.js
node --check reel/reel.js
