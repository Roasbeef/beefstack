#!/usr/bin/env bash
# contact_sheet.sh: tile frames pulled from a rendered video into one image, so
# QA is done on the encoded file rather than on agent review stills.
#
#   contact_sheet.sh <video> <out.jpg> <cols> <tile_width> <t1> [t2 ...]
#   contact_sheet.sh out/final.mp4 out/qa/sheet.jpg 4 640 1 5 9.5 14 ...
#   contact_sheet.sh out/final.mp4 out/qa/openings.jpg 6 480 $(cut -d, -f1 shot_starts.csv)
#
# Times are seconds. A frame-2 sheet of every shot start (start + 0.07 s) is the
# cheapest check for empty or washed-out openings.
set -euo pipefail
VIDEO=$1 OUT=$2 COLS=$3 TW=$4; shift 4
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
i=0
for t in "$@"; do
  ffmpeg -loglevel error -y -ss "$t" -i "$VIDEO" -frames:v 1 \
    -vf "scale=${TW}:-2,drawtext=text='${t}s':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6" \
    "$TMP/$(printf %03d $i).png"
  i=$((i + 1))
done
mkdir -p "$(dirname "$OUT")"
ffmpeg -loglevel error -y -framerate 1 -i "$TMP/%03d.png" \
  -vf "tile=${COLS}x$(( (i + COLS - 1) / COLS )):padding=4:color=black" -frames:v 1 "$OUT"
echo "$OUT ($i frames)"
