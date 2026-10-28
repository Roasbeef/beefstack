#!/usr/bin/env bash
# recall.sh: blind recall for a DST harness.
#
# For each fix commit, check out the branch tip in a scratch worktree, revert
# only that commit, run the generic swarm command, and record whether it
# failed (the bug was found) and how many runs it took.
#
# Usage:
#   recall.sh --repo <path> --cmd '<test command>' [--base <rev>] \
#             [--timeout 600] [--runs-regex '<regex with one group>'] \
#             <sha> [<sha> ...]
#
# --base is the tree the fixes are reverted from (default HEAD). Join SHAs
# with commas, oldest first (a,b), to revert them together, for a bug guarded by more than
# one commit; a later fix often covers the same failure. An argument
# that names an existing file is applied with `git apply` instead of reverted;
# use one for a fix that no longer reverts cleanly (write the hand edit as a
# patch against --base).
#
# Example (neutrino):
#   recall.sh --repo . --timeout 600 \
#     --cmd "go test . -run '^TestHeaderTransportDSTSwarm\$' \
#            -dst.seed=1 -dst.swarm=1000000 -count=1" \
#     --runs-regex 'failed after ([0-9]+) runs' \
#     6236575 a5678d1 e0eda4e
#
# A commit that also changed the harness must be split first: revert only its
# production half, or the result measures a different harness.

set -euo pipefail

repo=.
base=HEAD
cmd=
limit=600
runs_regex='after ([0-9]+) runs'
shas=()

while [ $# -gt 0 ]; do
	case "$1" in
	--repo) repo=$2; shift 2 ;;
	--cmd) cmd=$2; shift 2 ;;
	--base) base=$2; shift 2 ;;
	--timeout) limit=$2; shift 2 ;;
	--runs-regex) runs_regex=$2; shift 2 ;;
	-h|--help) sed -n 2,25p "$0"; exit 0 ;;
	*) shas+=("$1"); shift ;;
	esac
done

if [ -z "$cmd" ] || [ ${#shas[@]} -eq 0 ]; then
	echo "usage: recall.sh --repo <path> --cmd '<cmd>' <sha>..." >&2
	exit 2
fi

repo=$(cd "$repo" && git rev-parse --show-toplevel)
head=$(git -C "$repo" rev-parse "$base")
work=$(mktemp -d "${TMPDIR:-/tmp}/dst-recall.XXXXXX")
trap 'git -C "$repo" worktree prune >/dev/null 2>&1 || true' EXIT

# run_limited runs a command under a wall-clock limit. It starts the command
# in its own process group and kills the whole group when the limit expires,
# since a Go test binary ignores SIGALRM and would otherwise keep running
# after its parent shell died. Exits 124 on timeout, like coreutils timeout.
run_limited() {
	perl -e '
		my $limit = shift;
		my $pid = fork();
		if ($pid == 0) { setpgrp(0, 0); exec @ARGV; exit 127; }
		$SIG{ALRM} = sub {
			kill "TERM", -$pid; sleep 3; kill "KILL", -$pid;
			waitpid($pid, 0); exit 124;
		};
		alarm $limit;
		waitpid($pid, 0);
		exit($? & 127 ? 128 + ($? & 127) : $? >> 8);
	' "$limit" bash -c "$1"
}

echo "| Fix | Subject | Found? | Runs to find | Wall time | First failure |"
echo "|---|---|---|---|---|---|"

for sha in "${shas[@]}"; do
	if [ -f "$sha" ]; then
		patch=$(cd "$(dirname "$sha")" && pwd)/$(basename "$sha")
		short=$(basename "$sha")
		subject="patch $short"
	else
		patch=
		IFS=, read -r -a set <<<"$sha"
		subject=$(git -C "$repo" log -1 --format=%s "${set[0]}")
		short=
		for s in "${set[@]}"; do
			short="${short:+$short,}$(git -C "$repo" rev-parse --short "$s")"
		done
		[ ${#set[@]} -gt 1 ] && subject="$subject (+$(( ${#set[@]} - 1 )))"
	fi
	tree="$work/${short//,/_}.tree"
	log="$work/${short//,/_}.log"

	git -C "$repo" worktree add -q --detach "$tree" "$head"
	if [ -n "$patch" ]; then
		applied=$(git -C "$tree" apply "$patch" 2>&1 && echo ok || true)
	else
		# Revert newest first so later fixes come off before the ones
		# they build on.
		applied=ok
		for (( i=${#set[@]}-1; i>=0; i-- )); do
			git -C "$tree" revert --no-commit "${set[$i]}" \
				>/dev/null 2>&1 || { applied=; break; }
		done
	fi
	if [ "$applied" != ok ]; then
		echo "| $short | $subject | does not apply, revert by hand | - | - | - |"
		git -C "$repo" worktree remove --force "$tree"
		continue
	fi

	start=$(date +%s)
	set +e
	(cd "$tree" && run_limited "$cmd") >"$log" 2>&1
	status=$?
	set -e
	elapsed=$(( $(date +%s) - start ))

	runs=$(grep -Eo "$runs_regex" "$log" | head -1 |
		sed -E "s/$runs_regex/\1/" || true)
	first=$( { grep -m1 -E '_test\.go:[0-9]+:|panic:' "$log" ||
		grep -m1 -E -- '--- FAIL' "$log"; } |
		sed -E 's/^[[:space:]]+//; s/\|/\\|/g' | cut -c1-80 || true)

	if grep -qE '\[build failed\]|\[setup failed\]' "$log"; then
		found="build failed, revert by hand"
		runs=-
	elif [ "$status" -eq 0 ]; then
		found="no (campaign passed)"
	elif [ "$status" -eq 124 ]; then
		found="no (${limit}s budget)"
		runs=-
	else
		found=yes
	fi

	echo "| $short | $subject | $found | ${runs:--} | ${elapsed}s | ${first:--} |"
	git -C "$repo" worktree remove --force "$tree"
done

echo
echo "Logs: $work"
