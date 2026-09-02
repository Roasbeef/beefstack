# Protocol-change proposals

A protocol-change is the only way an interface the repo has declared
frozen may move. Loom freezes spec Part 1 (wire frames, durable row
shapes, the tool contract); another repo might freeze a public API, a
database schema, or an RPC surface. The point is the same: a frozen thing
moves through a numbered, reviewable document, never through a commit
that happens to touch it. Reviewers grep for the number.

Only scaffold `protocol-change/` in a repo that actually has a frozen
layer. A library with semantic versioning already has a mechanism; adding
a second one is machinery with no failure mode behind it.

## Shape

```
# protocol-change/NNN — <the change as an imperative>

**Status**: PROPOSED YYYY-MM-DD · **Affects**: Part 1.4 `exec_exit` ·
**Raised by**: issue #NN (<why>) · **Implemented**: <packages, once landed>

## Problem
## Proposal
## Impact
## Decision            (added when the status becomes ACCEPTED)
```

Optional sections appear where a proposal needs them, under their own
names: `What was considered`, `Alternatives considered`, `Ownership and
race semantics`, `Interim behaviour (what X does instead)` for a proposal
that stays PROPOSED while the tree ships a workaround.

## Each section

**Problem.** The state that the current interface cannot represent or
cannot distinguish, with measurement. The precedent: "A cancelled run
whose payload had backgrounded its work reported `code=0 signal=0`, an
ordinary clean success, in 3 of 3 measured runs." Then why each existing
field fails to carry the information ("`code=143` is produced by three
distinct causes"). Two or three bullets of this kind make the proposal
self-evidently necessary; without them it reads as a preference.

**Proposal.** The literal diff to the interface in a fenced block: the
field added, the variant introduced, the frame renamed. Show the type as
it will read afterwards, not a prose description of the change. If the
change has a compatibility story (an optional field, a version bump), it
goes here.

**Impact.** Blast radius by language and file, plus the operational
fallout. "Both ends of this wire ship from one tree, so a helper binary
built before this change no longer speaks it: rebuild `bin/loom-exec`."
Name every generated artifact that must be regenerated and every gate
that will fail until it is.

**Decision.** Opens with **Accepted.** (or **Rejected.**) followed by the
rejected alternative and why: "The alternative, inferring cancellation
broker-side from 'we sent a cancel frame and then an exit arrived', was
considered and dismissed." An accepted proposal also updates the
**Status** line to `ACCEPTED YYYY-MM-DD` and fills `**Implemented**:`.

## Ordering

A protocol-change is written *before* the phase of work that needs it, so
that the spec text, the code, and the proposal land together and the
proposal's number can appear in the commit. A change discovered mid-wave
still gets a proposal first; the wave pauses on that slice, which is
cheaper than the drift it prevents.

Once accepted, the spec's own text is updated to match and cites the
proposal number in a footnote or comment. The proposal is never edited
after acceptance; a further change to the same interface is a new number.
