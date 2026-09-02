# Review waves

A review wave is N read-only reviewers attacking disjoint surfaces of the
tree at one commit, followed by one triage roll-up that says what each
finding became. The files are historical records: they say what a
reviewer saw at a commit, and re-pinning them to today's tree would
falsify the record. That is why a citation checker exempts
`docs/review/**` from gating while still counting its drift.

## Files

```
docs/review/<wave>-<surface>.md     one per reviewer
docs/review/<wave>-triage.md        one per wave, by the orchestrator
```

`<wave>` is the milestone or the occasion (`m3`, `m4`, `durability`);
`<surface>` is the plane or package the reviewer owned. A wave with one
reviewer still gets a triage file, because the dispositions are the part
that outlives the review.

## The reviewer's report

```
# Adversarial review — <surface>

**Scope.** <exact packages and modules>

**Method.** Read <the design doc>, <the frozen contracts>, and <the gap
log> for intended semantics, then read every source file line by line
asking, for each: what input breaks the total decoder, what interleaving
breaks the single-writer assumption, ...

## Findings

### <ID>. <title>
**Where.** `file.ext:NN`
**Claim.** <one sentence>
**Reachable from.** <caller or input, or "not reachable: ...">
**Severity.** <fix / doc / defer / dismiss, with why>
```

Findings carry stable ids (`D-F4`, `CH-F2`: a surface prefix and a
number) so the triage file and the fix commits can name them. A finding
states the claim in one sentence and then whether the path is reachable
from real inputs and callers; unreachable ones are dismissed with the
reason, not patched. A review that manufactures rare scenarios and lands
a pile of complexity is the anti-pattern, and the report is where that is
caught.

The reviewer writes nothing but the report. No fixes, no git.

## The triage roll-up

```
# <Wave> triage

<one paragraph: who reviewed what, at which commit>

## Bottom line
**<the security or correctness verdict in one bold sentence>**

## Where this stands
<updated as fixes land: what is merged, what is open>

## Disposition
Legend: **FIX** (this wave, failing test first), **DOC** (correct a
document that claimed otherwise), **DEFER** (issue #NN), **DISMISS**
(unreachable / already prevented, with the reason).

| ID | Finding | Disposition | Where |
|---|---|---|---|

## What the wave also turned up
```

The bottom line leads with the verdict the reader came for: "No
capability escape was found on any of the three surfaces." The
disposition table is the durable output; a FIX row names the commit once
landed, a DEFER row names the issue, a DISMISS row carries its reason in
the row. "Where this stands" is the one section edited after filing, so
that the triage file stays true as the fixes merge.

## After the wave

- Each FIX lands with a failing test first, and the commit message cites
  the finding id.
- Each DEFER becomes an issue that cites the review file and the id.
- Each DOC edit cites the finding in its commit.
- `docs/next.md` records the wave in one line and points here; the
  triage file, not the handoff, carries the detail.
