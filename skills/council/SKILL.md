---
name: council
description: "Settles a load-bearing choice between two or more defensible options. Three seats, each blind to the others and each holding one lens (simplicity, risk, fit to the goal), read the code and return a ballot with evidence. A judge who sees the packet and the ballots, never the caller's preference, picks one option and names the dissent. Use at a real fork in a design or plan where the answer cannot be obtained by running something, especially during /auto when the user is not there to ask. Not for facts, for cheap reversible choices, or for finding out what is wrong (that is /advisor). Invoke via /council or at a decision checkpoint."
argument-hint: "[--seats=<model>] [--judge=<model>] <the decision, and the options if already known>"
allowed-tools:
  - Workflow
  - Agent
  - Task
  - Read
  - Grep
  - Glob
  - Bash
  - Skill
  - AskUserQuestion
---

# Council

A session that has been working on a problem usually has a favorite option
before it finishes listing the alternatives, and it then weighs the evidence
toward that favorite. The council removes the caller from the weighing. Seats
evaluate the options independently, and a judge who never learns which option
the caller prefers decides on the ballots.

**Decision**: $ARGUMENTS

## When to convene one

Convene a council when all three hold:

- There are two or more options that a competent engineer could defend.
- The choice is load-bearing: it shapes later work or is costly to reverse.
- Nothing cheap settles it. If a benchmark, a test, or ten minutes of reading
  would answer the question, do that instead.

Other tools fit the neighboring cases:

- A question with one right answer is not a fork. Check it.
- A cheap, reversible choice is decided inline. A council costs four agents.
- "What am I missing" or "why does this keep failing" goes to `/advisor`. A
  council chooses between options. It does not diagnose.
- A preference only the user can hold goes to `AskUserQuestion` in an
  interactive session. Under `/auto` the council's pick stands as a provisional
  decision.

One council per fork, and about two per task. If a task seems to need more, the
plan is the problem. Take the plan to `/advisor`.

## Procedure

### 1. Write the packet

The seats and the judge start with no context, so the packet is everything they
know. Read the relevant code first so the packet can cite it.

- **question**: one sentence that names the decision.
- **options**: two to four, each with an `id`, a one-line `title`, and a
  `detail` paragraph saying concretely what would be built or done. Describe
  every option with the same care and at the same length. Add the option of
  doing nothing when that is a real choice.
- **context**: the goal the decision serves, the constraints and invariants
  that matter, what has been tried, and `file:line` pointers to the code
  involved.
- **criteria**: what a good outcome looks like here, in priority order when
  there is one.

Leave the caller's own preference out of every field. A packet that argues for
one option biases the seats toward it. If writing the packet makes the answer
obvious, take the answer and skip the council.

### 2. Run it

Preferred path, when the `Workflow` tool is available:

```
Workflow({
  scriptPath: "<this skill dir>/workflow/council.js",
  args: {
    question: "...",
    options:  [{ id: "a", title: "...", detail: "..." }, ...],
    context:  "...",
    criteria: "...",
    dir:      "<absolute path of the working tree>",
    lenses:   null,   // or [{ id, brief }, ...] to replace the default three
    seatModel:  null, // null inherits the session model
    judgeModel: null, // null inherits the session model
  },
})
```

Parse `--seats=` and `--judge=` into `seatModel` and `judgeModel`. Both default
to the session model. On a Sonnet session, set `judgeModel` to `opus`, because
the judge's reading of conflicting evidence is the step that most rewards a
stronger model. The seats' value comes from independence and from their
different lenses, so a mid-tier model serves them well.

The default lenses are:

- **simplicity**: which option leaves the least machinery behind, and whether
  any option makes a failure mode unreachable instead of handling it.
- **risk**: how each option fails, how likely and how bad that is, and how hard
  it is to back out of.
- **fit**: which option reaches the stated goal with the least work outside
  its scope.

Replace them when the decision turns on something else, such as performance,
wire compatibility, or operator experience. Keep three seats. A fourth rarely
changes the outcome.

The workflow runs in the background and returns `{ decision, ballots }`. Work
that does not depend on the decision can continue while it runs.

Fallback, without the `Workflow` tool: spawn the three seats as `Agent` calls
in one message, each given the packet and one lens, with instructions to work
read-only and to return a pick, a ranking, any fatal flaw with its evidence,
and a short rationale. Then spawn one judge with the same packet and
the three ballots. Do not include this session's view in either prompt.

### 3. Act on the verdict

The council advises. The caller still owns the decision and the consequences.

1. **Check the evidence.** Open the code behind every claim in
   `decision.restsOn`, starting with the fatal flaws. A seat can misread a file. If the flaw is not real, the verdict
   that rests on it does not hold. Decide between the remaining options on the
   ballots that survive.
2. **Run the experiment if the judge named one.** When the ballots split over a
   fact, the judge returns a cheap check that would settle it in
   `decision.experiment`. Run the check
   and go with what it shows.
3. **Take a write-in seriously.** When a seat proposes an option that was not
   in the packet and the judge picks it, the packet was missing the best
   answer. That is the council working as intended.
4. **Record it.** Use `/session-log decision "<choice>" --rationale="<why>"`,
   including `decision.dissent` and `decision.wouldChange`, the condition
   the judge said would change the answer. Then proceed. Do not reopen the decision unless that condition
   occurs.

Report the outcome to the user in a few lines: the pick, the deciding reason,
and the strongest dissent. Do not paste the ballots.

## Related

- `/advisor`: one stronger reader for a plan or a stuck problem.
- `/advisor-review`: an audit of finished work.
- `/auto`: uses the council for forks when the user is away.
