# Corrections go on the issue

The recurring lesson in Loom is that an issue's diagnosis and the code
disagree more often than not, and that the code is right. Three issues in
one release were filed against a cause that measurement showed did not
exist; the fix in each case was smaller than the issue proposed, or was no
fix at all. That lesson produces one rule and one corollary.

**Measure before you build.** When an issue proposes a mechanism, first
reproduce the failure and quantify it. A documented bound with a test
beats a knob; a clear error beats a retry loop; an invariant that makes
the state unrepresentable beats a branch that copes with it.

**When you correct an issue, write the correction on the issue.** The
next reader finds the filing before they find the commit. A commit
message that says "the issue was wrong about X" is invisible to someone
reading the issue tracker; a comment on the issue is the first thing they
see.

## The comment

Post it before the fix lands, or with it. Four parts, a sentence or two
each:

1. **What the issue claimed.** Quote it.
2. **What measurement showed.** The command run, the count, the
   `file:line`. "Ran the soak for 200 iterations; the leak the issue
   describes did not reproduce, and `pool.gleam:118` already bounds the
   set at 64."
3. **The ruling.** What is being done instead, or that nothing is.
4. **Where it is recorded.** The ADR, the design note, the commit, or
   "closing on this comment".

```
gh issue comment NN --body-file correction.md
```

Then close the issue with the same comment if the ruling closes it, or
retitle it if the real problem is different from the filed one.

## Corrections to documents

The same rule applies when a document is wrong and a session finds out:

- **`docs/next.md`** names the places where the previous edition was
  wrong, as such, in the rewrite: "The previous edition said CI had never
  completed a run. That was true when written and is false now."
- **An ADR** gets an addendum, and the wrong sentence gets an italic
  forward pointer; see `adr.md`.
- **A per-package `CLAUDE.md`** is simply fixed, because it describes the
  present tree and has no historical role; the `doc-graph` gate exists to
  keep it current.
- **A review file** is never corrected; it is a record of what a reviewer
  saw. The triage file's "Where this stands" section carries the update.

The test in every case: could a reader a month from now tell what was
believed, when it changed, and why? A silent edit fails that test even
when the new text is right.
