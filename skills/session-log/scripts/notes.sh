#!/bin/bash
# notes.sh: deterministic helpers for the session-log skill.
#
#   notes.sh root    Print the notes directory for the current tree.
#   notes.sh init    Create the notes directory and keep it out of git.
#   notes.sh status  Print a short summary of the notes, or nothing.
#
# The notes live in .notes/ at the top of the working tree. Each git
# worktree gets its own, which matches one body of work per branch. The
# directory is excluded through the repository's info/exclude file, so no
# tracked file changes and shared repositories never see it.

set -uo pipefail

notes_root() {
	local top
	if top=$(git rev-parse --show-toplevel 2>/dev/null); then
		echo "$top/.notes"
	else
		echo "$PWD/.notes"
	fi
}

cmd_init() {
	local dir exclude
	dir=$(notes_root)
	mkdir -p "$dir/plans" "$dir/archive"

	if git rev-parse --git-dir >/dev/null 2>&1; then
		# info/exclude is shared by every worktree of the repository, so
		# one line covers them all.
		exclude=$(git rev-parse --path-format=absolute \
			--git-path info/exclude)
		mkdir -p "$(dirname "$exclude")"
		if ! grep -qxF '.notes/' "$exclude" 2>/dev/null; then
			echo '.notes/' >>"$exclude"
		fi
		if [ -n "$(git ls-files -- "$dir")" ]; then
			echo "warning: $dir has tracked files; they stay tracked" >&2
		fi
	fi

	if [ ! -f "$dir/notebook.md" ]; then
		printf '# Notebook\n\nDated entries, newest first. Append-only.\n' \
			>"$dir/notebook.md"
	fi

	echo "$dir"
}

# section prints the body of one "## <name>" section of a markdown file.
section() {
	awk -v name="## $2" '
		$0 == name { on = 1; next }
		on && /^## / { exit }
		on { print }
	' "$1" 2>/dev/null
}

# legacy_notice reports files from the old .sessions/ system, which the
# orient step imports. It stays quiet once a plan exists in .notes/.
legacy_notice() {
	local top dir
	top=$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")
	dir=$1
	ls "$top"/.sessions/active/*.md >/dev/null 2>&1 || return 0
	ls "$dir"/plans/*.md >/dev/null 2>&1 && return 0
	echo "Legacy session files in .sessions/; run /session-log to" \
		"import them into .notes/ before writing anything new."
}

cmd_status() {
	local dir plan slug steps done total next head open
	dir=$(notes_root)

	if [ ! -d "$dir" ]; then
		legacy_notice "$dir"
		return 0
	fi

	echo "Notes: $dir"
	legacy_notice "$dir" | sed 's/^/  /'

	if [ -f "$dir/next.md" ]; then
		head=$(grep -m1 '^Baseline:' "$dir/next.md" ||
			grep -m1 '^#' "$dir/next.md")
		echo "  Handoff: ${head:0:160}"
	fi

	for plan in "$dir"/plans/*.md; do
		[ -f "$plan" ] || continue
		grep -q '^status: active' "$plan" || continue
		slug=$(basename "$plan" .md)

		# Progress counts the Steps section only; exit criteria are
		# checks, not steps.
		steps=$(section "$plan" Steps)
		done=$(grep -c -E '^[[:space:]]*- \[[xX]\]' <<<"$steps")
		total=$(grep -c -E '^[[:space:]]*- \[[ xX]\]' <<<"$steps")
		next=$(grep -m1 -E '^[[:space:]]*- \[ \]' <<<"$steps" |
			sed -E 's/^[[:space:]]*- \[ \] ?//')
		echo "  Plan $slug: $done/$total steps done"
		[ -n "$next" ] && echo "    Next: ${next:0:160}"

		# Open questions are the plan's current blockers; the notebook
		# only records when they arose and cleared.
		section "$plan" "Open questions" |
			grep -E '^[[:space:]]*[-*] ' | head -3 |
			sed -E 's/^[[:space:]]*[-*] //' |
			while IFS= read -r open; do
				echo "    Open: ${open:0:150}"
			done
	done

	if [ -f "$dir/notebook.md" ]; then
		head=$(grep -m1 '^## ' "$dir/notebook.md")
		[ -n "$head" ] && echo "  Latest entry: ${head#\#\# }"
	fi

	echo "  Run /session-log to orient before continuing."
}

case "${1:-status}" in
root) notes_root ;;
init) cmd_init ;;
status) cmd_status ;;
*)
	echo "usage: notes.sh root|init|status" >&2
	exit 2
	;;
esac
