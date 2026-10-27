---
name: range
description: "Brings fields beyond the obvious one to bear on a task, as methods rather than voices: resolves the deliverable to a concrete target, restates it as verbs (what it must accomplish, for whom, under what constraint), assembles a crew of fields whose job is each verb plus one adversary whose job is to break the result, strikes any member that adds only tone, targets the wrong object, or duplicates what already exists, and dispatches the kept members as sub-agents (builders on the source, checkers on the draft) whose artifacts the lead synthesizes. The range axis from Felix Rieseberg's 'How to be more ambitious'. Use for work with an audience or an adversary, multi-faceted or creative work, protocol and design changes, and anything that must persuade, teach, or survive attack. Invoked via /range or from /ambition."
argument-hint: "[<task text>|@file|#issue] [--crew=<n>]"
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - Skill
  - Task
---

# Range

Range means looking at the work from more fields than it seems to need,
more than would have been economical before sub-agents made each extra field
cheap to run. Every heist film spends its first act assembling a crew; this
skill does the same for a task, then runs the crew.

The failure range must avoid is role play. Asking Claude to "write like a
short seller" makes the transcript stranger without improving the result. A
short seller is useful because of what they do: build a thesis from filings
and footnotes that the company's own story leaves out. Every crew member here
is kept for a procedure and the artifact it produces, never for a voice.

Range adds fields; it does not replace the default. The lead still does the
work the obvious field would do, with that field's tools and house skills
(for this user's prose, `roasbeef-prose` and `technical-writing`).

Source: https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/

The output is a proposal. Nothing is dispatched until the user approves the
crew.

## 1. Capture and resolve the task

Parse `$ARGUMENTS`: raw text, an `@file`, or an issue (`gh issue view <n>
--json title,body,comments`). With no arguments, take the most recent task in
the conversation.

Resolve the noun to a concrete object: which branch, file, issue, or release,
against which base, and whether a version already exists (an open PR body, a
prior draft, a README that covers the ground). If more than one candidate
fits, list them; the question in step 6 carries the choice. Name the obvious
field: the one the task would get by default.

If the task is a lookup or a mechanical edit, say range does not apply and
stop.

## 2. Replace the nouns with verbs

The deliverable is named by a noun: a deck, a PR description, a spec change,
a design doc. Restate it as what it must accomplish, for whom, under what
constraint (time, attention, trust, an adversary). Write one to three verb
phrases. This is the technique from Tom Kelley's *The Art of Innovation*.

- "A quarterly review deck" becomes "get busy people to believe a story about
  cause and effect, and decide under uncertainty, in 30 minutes".
- "A PR description" becomes "convince a reviewer with ten minutes that the
  change is safe, and show them where to look hardest".
- "A spec change" becomes "get several independent implementations to build
  the same behavior, with no rational peer able to profit from abusing it".

The verbs, not the noun, decide which fields belong on the crew.

## 3. Assemble the crew

Frame the stakes as Felix does: this has to be the best version of the thing
ever made. Which team would you assemble? For each verb, list the fields whose
day job is that verb; `references/fields.md` maps verb families to fields and
their procedures. Add one adversarial field whose job is to break the result:
an attacker, a short seller, a forensic accountant, a hostile reviewer.

Write each candidate as a row:

| Field | Procedure | Artifact | What the default lacks without it | Role |
|-------|-----------|----------|-----------------------------------|------|

Role is **B** (builder: works from the source material before synthesis) or
**C** (checker: works on the synthesized draft). The adversary is always C.
A field that cuts, edits, or audits a draft is C even if it is not the
adversary.

Strike a row, with a one-line reason, when any of these holds:

- **Tone only.** Its artifact is the same content in a different voice.
- **Wrong object.** Its artifact would improve something other than the
  deliverable (the code instead of the PR description, the spec instead of
  the announcement).
- **Already exists.** The inputs already contain its artifact; cite the file.
- **Second adversary.** A builder whose artifact is a list of objections is
  doing the adversary's job. Seat one adversary; it works from the draft and
  attacks the claims the draft makes.

## 4. Cut to the working crew

Size the crew to the deliverable. When the deliverable is short and the
obvious field already has a skill for it (a PR description, release notes),
default to two members: one builder and the adversary, and say what a larger
crew would buy. Otherwise keep two to four (`--crew` overrides), always
including the adversary. Prefer members far from the obvious field whose
procedure is concrete. For each cut member, say in one line what they would
have added, so the user can swap one back in.

## 5. Plan the dispatch

Each kept member becomes one sub-agent brief containing: the procedure, the
inputs (files, commit range, data), the artifact to return with a length
bound, and its permissions (read-only, or which commands it may run). The
brief tells the agent what to do, not who to be. Order:

1. The builders run in parallel on the source material.
2. The lead synthesizes their artifacts into the deliverable, using the
   obvious field's tools and house skills. Conflicts between members go to
   the user, not averaged away.
3. The checkers, adversary included, run in parallel on the draft. The lead
   fixes or explicitly accepts each finding.

For a crew larger than four or work that splits into many files, hand the
plan to `/orchestrate` instead of dispatching by hand.

## 6. Present and ask

Show: the resolved target, the verbs, the full crew table with struck rows
and why, the working crew, the dispatch plan, and the cost: per agent, the
material it must read and any toolchain runs, then the total against doing
the task directly. Then one `AskUserQuestion` call: first any ambiguity left
from step 1 (which branch, which PR), then run now, hand back the plan only,
or adjust the crew.

On "run it now", spawn the builders in one message so they run in parallel,
synthesize, run the checkers, and report which member changed the result and
how. If a member contributed nothing the default approach would not have, say
so; that calibrates the next crew.

## Worked examples

**A Lightning protocol change.** Task: "write up the spec change for the new
gossip sync messages". Obvious field: spec author.

- Verbs: get several implementations to build identical behavior; leave no
  peer a profitable abuse; let node operators predict the bandwidth cost.
- Crew:
  - B, standards editor: list every MUST and SHOULD with two plausible
    readings. Artifact: an ambiguity table.
  - B, game theorist: enumerate each party's actions and payoffs under the
    new messages. Artifact: a deviation table with profitable deviations
    marked.
  - B, formal methods: model the message exchange in TLA+ and check the sync
    invariants, unless a model already exists in the inputs. Artifact: the
    model and the TLC result.
  - C, adversary (attacker): write a concrete abuse sequence against the
    drafted rules and run it on regtest. Artifact: a reproduction script or a
    statement of what blocked it.
- Struck: "a diplomat to make the wording less contentious" (tone only).

**A release blog post.** Task: "write a post announcing the release".
Obvious field: technical writer.

- Verbs: get an operator who skims to know whether to upgrade today; get a
  developer to try the new API.
- Crew:
  - B, journalist: find the one verified fact that leads the post and write
    the lede and nut graf. Artifact: two paragraphs plus the source.
  - B, information designer: one diagram for the mechanism the post depends
    on. Artifact: the diagram.
  - C, editor: cut the draft by a third and reorder by reader priority.
    Artifact: the cut draft and a list of removed claims.
  - C, adversary (hostile commenter): list every claim a skeptical reader
    would attack, with the evidence the post would need. Artifact: a claims
    table.

## What not to do

- Do not keep a crew member for flavor. No artifact, no seat.
- Do not write the deliverable in a persona's voice.
- Do not skip the adversary, and do not seat two.
- Do not dispatch more than four agents without the user approving the cost.
