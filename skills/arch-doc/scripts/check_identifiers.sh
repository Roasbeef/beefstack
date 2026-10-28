#!/usr/bin/env bash
# List backticked identifiers in a Markdown file that do not appear in the
# source tree. Output is a list of questions, not errors: SQL names, wire
# messages, and config keys may live outside the language sources.
#
# Usage: check_identifiers.sh <file.md> <repo-dir>
set -uo pipefail

doc="${1:?usage: check_identifiers.sh <file.md> <repo-dir>}"
repo="${2:?usage: check_identifiers.sh <file.md> <repo-dir>}"

# Take single-backtick tokens outside fenced blocks, strip receivers and call
# parens, keep identifier-shaped tokens.
awk '/^```/ { f = !f; next } !f' "$doc" |
	grep -oE '`[A-Za-z_][A-Za-z0-9_.]*(\([^`]*\))?`' |
	tr -d '`' | sed -E 's/\(.*$//' | tr '.' '\n' |
	grep -E '^[A-Za-z_][A-Za-z0-9_]{2,}$' | sort -u |
	while read -r id; do
		if ! grep -rqw --exclude-dir=.git --exclude-dir=docs --exclude-dir=node_modules -- "$id" "$repo"; then
			echo "$id"
		fi
	done
