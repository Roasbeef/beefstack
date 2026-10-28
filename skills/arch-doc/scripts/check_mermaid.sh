#!/usr/bin/env bash
# Render every ```mermaid block in a Markdown file with mermaid-cli and report
# the blocks that fail, with the line number of the opening fence.
#
# Usage: check_mermaid.sh <file.md>
set -uo pipefail

doc="${1:?usage: check_mermaid.sh <file.md>}"
[ -f "$doc" ] || { echo "no such file: $doc" >&2; exit 2; }

if ! command -v mmdc >/dev/null 2>&1; then
	echo "mmdc (mermaid-cli) not found; push the branch and check GitHub's" >&2
	echo "renderer for 'Unable to render' instead." >&2
	exit 3
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Split the file into one .mmd per block, named by its starting line.
awk -v dir="$tmp" '
	/^```mermaid[[:space:]]*$/ { inblk = 1; start = NR; out = sprintf("%s/%05d.mmd", dir, start); next }
	/^```[[:space:]]*$/ && inblk { inblk = 0; close(out); next }
	inblk { print > out }
' "$doc"

cfg="$tmp/puppeteer.json"
echo '{"args":["--no-sandbox"]}' > "$cfg"

total=0
failed=0
for f in "$tmp"/*.mmd; do
	[ -e "$f" ] || { echo "no mermaid blocks found in $doc"; exit 0; }
	total=$((total + 1))
	line="$(basename "$f" .mmd | sed 's/^0*//')"
	if err="$(mmdc -p "$cfg" -i "$f" -o "$f.svg" 2>&1)"; then
		echo "ok    $doc:$line"
	else
		failed=$((failed + 1))
		echo "FAIL  $doc:$line"
		echo "$err" | sed 's/^/      /' | head -12
	fi
done

echo "$total block(s), $failed failed"
[ "$failed" -eq 0 ]
