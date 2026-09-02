# Execution

This is not a style guide or a plan. It is the operational layer between
them: how work gets done in this repository. Everything below is written
from work that ran, and every rule earns its place by something going
wrong first. Add to §8 when a hazard costs real time; do not add to it
speculatively.

## 1. The shape: one orchestrator, disjoint slices

One root session plans, dispatches, verifies and commits. Sub-agents own
one slice each on a disjoint file set and do no git operations at all. A
wave is three or four concurrent slices chosen so that file sets do not
overlap: two agents in one package is survivable if they touch different
files; two agents in one file is not.

Never delegate: the decision about what the slices are, the final
verification, the commit messages, or anything that needs the whole-tree
picture.

## 2. Briefing

A brief that produces good work is long. It carries: the required reading
in order; the issue restated with `file.ext:NN` evidence; the ownership
list and the no-touch list; the cut list, which is the single
highest-value paragraph in a brief; the standard of proof; and the house
rules that are not in the code (commit authorship, no tool names in
content, generated files get their own commit, never `git checkout <file>`).

Give the ruling, not the question. Handing over "decide how to key the
ledger" produces a week of drift; handing over the decision and its
reasoning produces the slice.

## 3. Monitoring

Do not poll an agent's transcript; it floods the orchestrator's context.
Do read-only work meanwhile and watch `git status --porcelain`. A
completed-agent notification is not proof the work is good. It is notice
that verification can start.

## 4. Verification: the part that is not optional

Do not trust an agent's report of its own gates.

- **Capture the exit code of the thing you care about.** `make check >
  log; echo $?; tail log` reports `tail`'s status.
- **An incremental build cache can lie.** Verify on a clean checkout
  (a git worktree) before calling a fix done.
- **Mutation testing is the standard of proof.** Break the code under a
  fix and observe the intended test fail, and observe that only the
  intended tests fail.
- **Verify the claim, not the vicinity.** Match the check to the property
  claimed.

## 5. Landing the work

The orchestrator commits: atomically by concern, not by agent. Generated
files get their own commit. Stage by path, never `git add -A` during a
wave. Scan diffs for tool names. Write the message about the why. Before
pushing, `git log --oneline <old>..origin/main` to catch the push race.

## 6. The recurring lesson: measure before you build

When an issue's diagnosis and the code disagree, the code is right and the
issue gets a comment saying so. Quantify before mechanising, and prefer a
documented bound with a test over a knob. When you correct an issue, write
the correction on the issue: the next reader finds the filing before they
find the commit.

## 7. Advisors

Before code on a contested or security-relevant decision, consult a
read-only advisor. Demand a decision with its cost, not a survey; ask for
the cut list and for the cheapest thing that would prove the ruling wrong.
Tell it other agents are live and it must not write.

## 8. Hazards specific to this repository

<Empty at init. One bold sentence per incident, with what it cost.>

## 9. A wave, end to end

1. Read `docs/next.md`; audit it against the tree if anything looks off.
2. Consult an advisor on anything contested; record the ruling.
3. Plan disjoint slices; write the briefs.
4. Dispatch; do read-only work; do not poll transcripts.
5. Verify each slice by its own gate's exit code, on a clean checkout.
6. Commit atomically by concern. Scan for tool names. Check doc mirrors.
7. Push; diff what actually went out against what you verified.
8. Close the issues with a comment saying what was decided and why,
   especially where the issue's own diagnosis was wrong.
9. Write down what the next session needs (`docs/next.md`).
