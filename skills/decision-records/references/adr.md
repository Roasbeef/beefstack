# Architecture decision records

An ADR records a decision whose consequences outlive the change that
prompted it: which SQLite binding, why msgpack, at what granularity a
budget pools, where the sandbox boundary sits on a platform. It is not a
design doc and not a changelog; it is the argument, frozen, so that the
next person who wants to move the boundary knows what they are arguing
against.

## Shape

```
# ADR-NNN — <the ruling as a sentence>

**Status**: accepted · **Date**: YYYY-MM-DD · **Supersedes**: nothing ·
**Relates to**: issue #NN (why), #MM (why)

## The question
## Decision
## Why
## Consequences
## Addendum — <case> (issue #NN)      (only when one is needed)
```

Title is the ruling, not the topic: "the pooled budget bounds the batch,
not the call", not "budget pooling". `Status` is `proposed`, `accepted`,
or `superseded by ADR-MMM`. Use `**Spec ref**:` in place of or beside
`Relates to` when the repo has a spec with numbered parts.

The minimal form is `Decision` / `Why` / `Consequences` and is right for
a small ruling. Add `The question` when the reader needs the failing case
in front of them to understand the decision, which is most of the time.
Extra sections earn their place by name: `Verification gate`, `What this
settles for #NN`, `What is not settled here`, `Pilot verdict (date)`.

## Each section

**The question.** The concrete situation, with evidence. Name the code
path (`broker.reserve_budget` keys ledgers by `#(op_id, step_id)`), the
interleaving that breaks, and how it was found ("every test of
concurrency used `bash`, which is `Exclusive` and cannot produce the
interleaving, so this went unnoticed until an unrelated review tripped
over it"). A question with no evidence is an opinion.

**Decision.** One or two paragraphs, the ruling in bold up front. State it
in the repo's own vocabulary and at the level of the invariant, not the
patch: "the ledger key is the batch, and a call inside a batch shares the
batch's budget" rather than "change the key to drop `call_id`".

**Why.** The argument, including the alternatives and why each lost. This
is the section that prevents re-litigation, so the alternative must be
stated fairly enough that its proponent would recognise it. Name the cost
of the chosen option too; a decision with no cost was not a decision.

**Consequences.** What follows: which packages change, which invariants
appear in their `CLAUDE.md`, which tests must exist, what an operator
now has to do. If the ADR depends on a gate, say which one enforces it.

## Addenda

An ADR is amended only by appending. The precedent form:

```
## Addendum — two programs in one batch (issue #87)

*Added 2026-08-27. The decision above is unchanged; this records what it
answers for a case it did not name.*

<restate the new case>

**It is the pooling working, and the key does not move.**

**On #23's unit, where this ADR guessed and the build differs.** The
"What this settles" section above suggested ... What shipped is per
*execution*, and the difference is deliberate rather than an oversight
(issue #88).

**The constraint this puts on future work.** ...
```

Three properties of a good addendum:

- It dates itself and says whether the ruling above is unchanged.
- Where the original guessed wrong, it says so by section name, and the
  original body gets a one-line italic forward pointer at that spot:
  `*(That last recommendation is the one thing here the build departs
  from; the addendum says why.)*`. The wrong sentence stays; a reader
  can see what was believed and when.
- It ends with the constraint on future work, since that is what the
  next reader is looking for.

A shorter addendum form, for a change of default rather than a new case:

```
## Addendum: the production demand follows the platform boundary
**Date**: 2026-08-30

The original decision made `FullEnforcement` the production default. That
demand was truthful, but ... The production default is now
`PlatformEnforcement`.
```

Superseding an ADR entirely is a new ADR whose `Supersedes` line names the
old one, and the old one's status becomes `superseded by ADR-MMM`. Its
body is untouched.
