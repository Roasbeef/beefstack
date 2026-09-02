#!/bin/sh
# doc_check.sh — gate the per-package documentation graph.
#
# Four checks. Three run over every package directory that has real
# source; the fourth runs over the prose under DOCS_DIR:
#
#   1. coverage  — the package has a DOC_NAME file.                  (error)
#   2. mirror    — MIRROR_NAME exists, byte-identical to DOC_NAME.   (error)
#   3. staleness — source has a newer last commit than DOC_NAME.     (warning)
#   4. citations — docs cite `file.ext:431`; the file must resolve
#                  and still hold the symbol the prose names.        (error,
#                  with three exemptions below)
#
# Configuration is the block just under this comment. Every value can be
# overridden from the environment, and `doc-graph init` rewrites the
# defaults to fit the repo it is installed in. PACKAGE_DIRS is a list of
# shell globs, one per line or space-separated, naming the directories
# that count as packages; SOURCE_EXTS says what makes a directory a real
# package rather than a scaffold; CITE_EXTS is the wider set of file
# kinds a doc may cite by line.
#
# Resolution is a suffix match against the tracked tree, so a bare
# `planner.go` and a package-relative `machine/planner.go` both land; a
# name that matches two files is reported rather than guessed at. Drift
# is a windowed symbol check: the backticked symbol nearest before the
# citation must appear within DOC_CHECK_CITE_WINDOW lines of the cited
# span. Citations with no symbol to check are resolution-only and
# counted separately, so the census says how much of the doc corpus the
# stronger check actually covers.
#
# Every citation is checked and every finding is reported. What the tier
# decides is which findings fail the build. A finding is an error only
# when all three hold:
#
#   * The document is not under REVIEW_PREFIX. Review documents record
#     what a reviewer saw at a commit; re-pinning them to today's tree
#     would falsify the record. They stay in the warning census.
#   * The citation is backticked. Backticks separate "a real path in
#     this tree" from prose, and bare prose includes rhetorical examples
#     that are not claims about the tree.
#   * The finding is decidable. "No such file", "several files match",
#     "the file is shorter than that", and "the symbol is in the file
#     but at line N" are provable and name the fix. "The symbol is
#     nowhere in this file" is the one shape a mis-attributed span and a
#     genuinely deleted symbol share, so it stays a warning.
#
# Staleness is a warning by design: source moves faster than prose, and
# the warning list is the work queue for the doc-gardening skill. File
# mtimes are meaningless in a fresh checkout, so the comparison uses
# each path's last commit time. A package whose docs are untracked, or a
# tree with no git history, skips the staleness check rather than guess.
#
# No builds, no toolchain: this stays usable while other work compiles.
set -eu

cd "$(dirname "$0")/.."

# ---------------------------------------------------------------------
# configuration (rewritten by `doc-graph init`; env overrides)
# ---------------------------------------------------------------------
PACKAGE_DIRS=${DOC_CHECK_PACKAGE_DIRS:-"packages/*"}
DOC_NAME=${DOC_CHECK_DOC_NAME:-CLAUDE.md}
MIRROR_NAME=${DOC_CHECK_MIRROR_NAME:-AGENTS.md}   # empty disables the mirror check
SOURCE_EXTS=${DOC_CHECK_SOURCE_EXTS:-"gleam go"}
CITE_EXTS=${DOC_CHECK_CITE_EXTS:-"gleam go erl hrl sql toml md sh"}
DOCS_DIR=${DOC_CHECK_DOCS_DIR:-docs}
REVIEW_PREFIX=${DOC_CHECK_REVIEW_PREFIX:-docs/review/}
PRUNE_DIRS=${DOC_CHECK_PRUNE_DIRS:-"build node_modules target vendor _build dist"}
KEYWORDS=${DOC_CHECK_KEYWORDS:-"pub fn let use case const type opaque import todo panic func var return package chan defer struct interface impl mod enum trait def class self async await"}
GARDEN_HINT=${DOC_CHECK_GARDEN_HINT:-"run /doc-gardening"}

errors=0
warnings=0

# Last commit time (unix seconds) for a path; empty when git cannot say.
committed_at() {
	git log -1 --format=%ct -- "$1" 2>/dev/null || true
}

# find(1) prune expression for the vendored/built directories.
prune_expr() {
	first=1
	for d in $PRUNE_DIRS; do
		if [ "$first" -eq 1 ]; then
			printf -- '-name %s' "$d"
			first=0
		else
			printf -- ' -o -name %s' "$d"
		fi
	done
}

has_sources() {
	dir=$1
	for ext in $SOURCE_EXTS; do
		# shellcheck disable=SC2046
		found=$(find "$dir" \( $(prune_expr) \) -prune -o -type f -name "*.$ext" -print 2>/dev/null | head -n 1)
		[ -n "$found" ] && return 0
	done
	return 1
}

for glob in $PACKAGE_DIRS; do
	for dir in $glob; do
		[ -d "$dir" ] || continue
		pkg=${dir#*/}
		[ "$pkg" = "$dir" ] && pkg=$dir

		if ! has_sources "$dir"; then
			printf 'skip     %-12s no source modules yet\n' "$pkg"
			continue
		fi

		doc="$dir/$DOC_NAME"
		mirror="$dir/$MIRROR_NAME"

		if [ ! -f "$doc" ]; then
			printf 'ERROR    %-12s missing %s\n' "$pkg" "$DOC_NAME"
			errors=$((errors + 1))
			continue
		fi

		if [ -n "$MIRROR_NAME" ]; then
			if [ ! -f "$mirror" ]; then
				printf 'ERROR    %-12s missing %s (cp %s %s)\n' "$pkg" "$MIRROR_NAME" "$DOC_NAME" "$MIRROR_NAME"
				errors=$((errors + 1))
			elif ! cmp -s "$doc" "$mirror"; then
				printf 'ERROR    %-12s %s differs from %s\n' "$pkg" "$MIRROR_NAME" "$DOC_NAME"
				errors=$((errors + 1))
			fi
		fi

		src_at=""
		[ -d "$dir/src" ] && src_at=$(committed_at "$dir/src")
		[ -n "$src_at" ] || src_at=$(committed_at "$dir")
		doc_at=$(committed_at "$doc")

		if [ -n "$src_at" ] && [ -n "$doc_at" ] && [ "$src_at" -gt "$doc_at" ]; then
			printf 'WARNING  %-12s source committed after %s (%s %s)\n' \
				"$pkg" "$DOC_NAME" "$GARDEN_HINT" "$pkg"
			warnings=$((warnings + 1))
		else
			printf 'ok       %-12s\n' "$pkg"
		fi
	done
done

# ---------------------------------------------------------------------
# 4. citations
# ---------------------------------------------------------------------
#
# Two inputs on one stream: "I <path>" for every file citations may
# resolve against, "D <path>" for every doc to scan. Dot-directories and
# the pruned build/vendor directories are skipped: a vendored copy of our
# own sources would make every bare filename ambiguous.

cite_window=${DOC_CHECK_CITE_WINDOW:-5}
cite_limit=${DOC_CHECK_CITE_LIMIT:-10}

cite_ext_re=$(printf '%s' "$CITE_EXTS" | tr ' ' '|')
cite_name_expr=""
for ext in $CITE_EXTS; do
	if [ -z "$cite_name_expr" ]; then
		cite_name_expr="-name *.$ext"
	else
		cite_name_expr="$cite_name_expr -o -name *.$ext"
	fi
done

cite_out=$({
	# The -name patterns must reach find(1) unexpanded, so globbing is
	# off for this one call.
	set -f
	# shellcheck disable=SC2046,SC2086
	find . -path './.*' -prune -o \( $(prune_expr) \) -prune -o -type f \
		\( $cite_name_expr \) -print | sed 's|^\./|I |'
	set +f
	find "$DOCS_DIR" -type f -name '*.md' -print 2>/dev/null | sort | sed 's|^|D |'
} | awk -v win="$cite_window" -v limit="$cite_limit" \
	-v extre="$cite_ext_re" -v review="$REVIEW_PREFIX" -v kw="$KEYWORDS" '
BEGIN {
	CITE = "[A-Za-z0-9_./@-]*[A-Za-z0-9_]\\.(" extre "):[0-9]+"
	IDENT = "[A-Za-z_][A-Za-z0-9_]*"
	# Keywords name no construct, so they prove nothing about a line.
	n = split(kw, word, " ")
	for (i = 1; i <= n; i++) keyword[word[i]] = 1
}
{
	path = substr($0, 3)
	if (substr($0, 1, 1) == "I") {
		n = split(path, part, "/")
		byname[part[n]] = byname[part[n]] path "\n"
	} else {
		docs[++ndocs] = path
	}
}
# The one file whose path ends in the cited one: "" none, "?" several.
function resolve(cited,   n, part, k, cand, i, hits, hit) {
	n = split(cited, part, "/")
	if (byname[part[n]] == "") return ""
	k = split(byname[part[n]], cand, "\n")
	hits = 0
	for (i = 1; i <= k; i++) {
		if (cand[i] == "") continue
		if (cand[i] == cited ||
		    substr(cand[i], length(cand[i]) - length(cited)) == "/" cited) {
			hits++
			hit = cand[i]
		}
	}
	if (hits == 0) return ""
	if (hits > 1) return "?"
	return hit
}
function load(f,   i, line) {
	if (f in nlines) return
	i = 0
	while ((getline line < f) > 0) src[f, ++i] = line
	close(f)
	nlines[f] = i
}
# Identifiers in one backticked span: paths and citations are not
# symbols, and a module qualifier is dropped (`api.prompt` -> prompt).
function symbols(span, out,   tok, after, n) {
	n = 0
	if (span == "" || index(span, "/") > 0 || match(span, CITE)) return 0
	while (match(span, IDENT)) {
		tok = substr(span, RSTART, RLENGTH)
		after = substr(span, RSTART + RLENGTH, 1)
		span = substr(span, RSTART + RLENGTH)
		if (after == "." || length(tok) < 3 || tok in keyword) continue
		out[++n] = tok
	}
	return n
}
# Docs also write the symbol just after the citation, parenthesised:
# `storage/memory.go:554` (`take_limit`). Only that exact shape.
function paren_span(s) {
	if (!match(s, /^`?[ ]*\(`[^`]*`\)/)) return ""
	s = substr(s, RSTART, RLENGTH)
	sub(/^`?[ ]*\(`/, "", s)
	sub(/`\)$/, "", s)
	return s
}
# Contents of the last backticked span in s (the one nearest the citation).
function nearest_span(s,   best) {
	best = ""
	while (match(s, /`[^`]*`/)) {
		best = substr(s, RSTART + 1, RLENGTH - 2)
		s = substr(s, RSTART + RLENGTH)
	}
	return best
}
# Is the citation inside a code span? Odd backtick count before it.
function backticked(before,   copy) {
	copy = before
	return gsub(/`/, "&", copy) % 2
}
# First line in [a,b] holding sym as a whole word, else 0.
function seek(f, a, b, sym,   i, re) {
	re = "(^|[^A-Za-z0-9_])" sym "([^A-Za-z0-9_]|$)"
	if (a < 1) a = 1
	if (b > nlines[f]) b = nlines[f]
	for (i = a; i <= b; i++) if (src[f, i] ~ re) return i
	return 0
}
# Where sym sits closest to the cited span, the line to cite instead.
function nearest(f, a, b, sym,   i, d, best, dist) {
	best = 0
	dist = nlines[f] + 1
	for (i = 1; i <= nlines[f]; i++) {
		if (!seek(f, i, i, sym)) continue
		d = i < a ? a - i : (i > b ? i - b : 0)
		if (d < dist) { dist = d; best = i }
	}
	return best
}
# Buffer one finding at its tier. Errors are never elided; warnings are
# tallied by the reason they are not gated, so the census says why.
function report(sev, msg) {
	nfind++
	fsev[nfind] = sev
	fmsg[nfind] = msg
	if (sev == "E") {
		nerr++
		return
	}
	nwarn++
	if (!gated) w_review++
	else if (!ticked) w_bare++
	else w_absent++
}
END {
	for (d = 1; d <= ndocs; d++) {
		doc = docs[d]
		# Review documents are historical records: checked, never gated.
		gated = (review == "" || index(doc, review) != 1)
		lineno = 0
		while ((getline line < doc) > 0) {
			lineno++
			rest = line
			while (match(rest, CITE)) {
				cite = substr(rest, RSTART, RLENGTH)
				before = substr(line, 1, length(line) - length(rest) + RSTART - 1)
				rest = substr(rest, RSTART + RLENGTH)
				total++
				ticked = backticked(before)
				if (ticked) backticks++
				# Decidable findings gate; the rest warn.
				hard = (gated && ticked) ? "E" : "W"
				split(cite, part, ":")
				file = part[1]
				first = part[2] + 0
				last = first
				# Ranges: hyphen, en dash or em dash.
				if (match(rest, /^(-|–|—)[0-9]+/)) {
					span = substr(rest, RSTART, RLENGTH)
					sub(/^(-|–|—)/, "", span)
					if (span + 0 > last) last = span + 0
				}
				where = "%s:%d cites %s"
				f = resolve(file)
				if (f == "") {
					report(hard, sprintf(where " — no such file in the tree", doc, lineno, cite))
					continue
				}
				if (f == "?") {
					report(hard, sprintf(where " — several files match that name", doc, lineno, cite))
					continue
				}
				load(f)
				if (last > nlines[f]) {
					report(hard, sprintf(where " — %s has %d lines", doc, lineno, cite, f, nlines[f]))
					continue
				}
				resolved++
				nsym = symbols(nearest_span(before), sym)
				if (nsym == 0) nsym = symbols(paren_span(rest), sym)
				if (nsym == 0) { unchecked++; continue }
				checked++
				for (i = 1; i <= nsym; i++)
					if (seek(f, first - win, last + win, sym[i])) break
				if (i <= nsym) continue
				for (i = 1; i <= nsym; i++)
					if ((at = nearest(f, first, last, sym[i]))) break
				if (i <= nsym)
					report(hard, sprintf(where " — `%s` is at line %d", doc, lineno, cite, sym[i], at))
				else
					# Undecidable: a mis-attributed span looks exactly
					# like a symbol that has been deleted.
					report("W", sprintf(where " — `%s` is not in %s", doc, lineno, cite, sym[1], f))
				drifted++
			}
		}
		close(doc)
	}
	for (i = 1; i <= nfind; i++)
		if (fsev[i] == "E") print "E " fmsg[i]
	shown = 0
	for (i = 1; i <= nfind; i++) {
		if (fsev[i] != "W") continue
		if (limit > 0 && shown >= limit) continue
		shown++
		print "W " fmsg[i]
	}
	printf "S %d cited (%d backticked), %d resolve, %d symbol-checked (%d resolution-only), %d drifted\n",
		total, backticks, resolved, checked, unchecked, drifted
	printf "S %d error(s), %d warning(s): %d review docs, %d bare prose, %d symbol absent from file\n",
		nerr + 0, nwarn + 0, w_review + 0, w_bare + 0, w_absent + 0
	if (limit > 0 && nwarn > shown)
		printf "S %d warning(s), %d shown — DOC_CHECK_CITE_LIMIT=0 lists every one\n",
			nwarn, shown
	printf "#%d %d\n", nerr + 0, nwarn + 0
}')

# Awk ends with the two finding counts; before it come the findings,
# each tagged with its tier, then the census.
nl='
'
cite_tail=${cite_out##*"$nl"}
cite_tail=${cite_tail#\#}
cite_errors=${cite_tail%% *}
cite_warnings=${cite_tail##* }
case $cite_errors in "" | *[!0-9]*) cite_errors=0 ;; esac
case $cite_warnings in "" | *[!0-9]*) cite_warnings=0 ;; esac
cite_body=$(printf '%s\n' "$cite_out" | sed '$d')

echo
printf '%s\n' "$cite_body" |
	while IFS= read -r finding; do
		tag=${finding%% *}
		text=${finding#* }
		case $tag in
		E) printf 'ERROR    %-12s %s\n' citations "$text" ;;
		W) printf 'WARNING  %-12s %s\n' citations "$text" ;;
		S)
			if [ "$cite_errors" -eq 0 ] && [ "$cite_warnings" -eq 0 ]; then
				printf 'ok       %-12s %s\n' citations "$text"
			else
				printf '         %-12s %s\n' citations "$text"
			fi
			;;
		esac
	done
errors=$((errors + cite_errors))
warnings=$((warnings + cite_warnings))

echo
if [ "$errors" -gt 0 ]; then
	echo "doc-check FAILED: $errors error(s), $warnings warning(s)"
	exit 1
fi
echo "doc-check clean: 0 errors, $warnings warning(s)"
