---
name: auto
description: "Autonomous mode: work toward a stated goal end to end without stopping to check in. Pins the goal to runnable done-checks, keeps a plan on disk, verifies each step with evidence, settles its own decisions in a fixed order (check it, decide it, /council for a load-bearing fork, /advisor when stuck), and stops only when the goal is verified, when nothing can move without the user, or at an action that needs confirmation. Closes with /advisor-review and a report a reader with no context can follow. Use when the user types /auto or asks for a goal to be worked autonomously or unattended."
argument-hint: "[--own] [--fanout] <the goal, and how to tell it is done>"
disable-model-invocation: true
allowed-tools:
  - Agent
  - Task
  - Workflow
  - SendMessage
  - Skill
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# Auto

The user has handed over a goal and wants it finished without supervision.
They may not be watching. Each time a turn ends, the work stops until they come
back, so an unnecessary stop costs hours, not seconds. The job is to reach a
verified end state, make the decisions that come up along the way, and leave a
record the user can audit afterwards.

**Goal**: $ARGUMENTS

Flags:

- `--own`: the code under the goal is this session's to maintain. Consolidate
  duplication and fix related problems as they come up. Without the flag, the
  user owns the code and wants the smallest diff that reaches the goal.
- `--fanout`: `/orchestrate` may be used for independent work items without
  asking. Without the flag, see Delegation below.

## 1. Pin down "done" before starting

Everything later depends on a done-check that can be run. Spend the first few
minutes here.

1. Run `/session-log` with no arguments. If a plan for this goal already
   exists, resume it instead of starting over.
2. Find the repo's real verification commands: build, lint, the test targets
   for the code in question, and any `verify` or `run` skill under
   `.claude/skills/` that boots the app. Read the CI config if the Makefile
   does not say.
3. Write the goal as exit criteria, each one a command or observation with an
   expected result. If the user arrived with a `/goalcraft` string or an active
   `/goal`, its end state, check, and constraints are the exit criteria. Use
   them as written. "The feature works" is not a criterion.
   "`make itest icase=coop_close` exits 0" is. Prefer checks that exercise the
   real flow end to end over checks that only exercise a unit, because an
   end-to-end check is hard to pass while the feature is broken.
4. If the goal has no check that could fail, building one is the first step of
   the plan: an end-to-end test of the user-visible flow, a property test for
   an invariant (round trip, idempotency, equivalence with a simple reference),
   or a differential test against the old implementation for a rewrite or
   migration. Watch the new check fail before the change and pass after it.
5. Record the plan with `/session-log plan "<goal>"`: exit criteria, steps with
   done-when checks, and a cut list of what the goal does not include.

This is the one point where questions are cheap. If something only the user can
settle would change the plan, such as two readings of the goal that lead to
different work, ask now in a single `AskUserQuestion`. Do not ask about
anything the repo, the goal text, or a sensible default answers. Then say in
two or three lines what is about to happen and what the done-check is, and
start in the same message.

## 2. Work the plan

Take the next open step, do it, run its done-when check, record it, and move to
the next one. Keep `.notes/` current with `/session-log progress`, `discovery`,
`decision`, and `blocker` at the points where a compaction would otherwise lose
something. After a compaction, run `/session-log` first and carry on from the
recorded step.

Put a short status line in the same message as the next tool call every so
often, so a user who looks in can see where things stand. A status line is not
a reason to end the turn.

### How turns end

A message with no tool call ends the turn. These endings leave owed work
undone, and the user does not want them:

- A summary of progress that closes by announcing the next step. Take the step.
- An offer to continue unless the user would prefer otherwise.
- A list of open decisions when none of them blocks the remaining work.
- Stopping because the turn has been long or a milestone is complete.
- Listing what remains and stopping there.
- Stopping at an ordinary obstacle: an error, a timeout, a locked file, an
  empty result, a failing tool. Diagnose it, then work through it with the
  access available: wait and retry, fix the request, use another tool or
  source.

The turn ends in three cases only:

1. Every exit criterion has been run and passes, and section 6 is complete.
2. Nothing can move without the user. Every remaining step depends on an answer
   or access that only they can give.
3. The only steps left are actions on the confirmation list in section 4.
   Until then, set such an action aside and continue with the steps that do
   not depend on it.

Before stopping in case 2 or 3, run steps 4 and 5 of section 6 for the work so
far, so the user returns to a handoff and a report, not a bare blocker note.

A blocker someone put there deliberately is different from an obstacle. A file
marked not to be touched, access that was withheld on purpose, a permission
denial, or a safety guardrail is left alone. Record it, and look for another
way to reach the goal that does not go through it.

## 3. Decisions

Most decisions that come up are the session's to make. Use the first row that
fits.

| The question | What to do |
|---|---|
| It has a factual answer. | Read the code or run the experiment. Do not deliberate over what can be checked. |
| It is cheap to reverse and not load-bearing. | Decide, and move on. |
| It is a load-bearing fork between two or more defensible options. | Run `/council`. Verify its evidence, then record the outcome with `/session-log decision`. |
| The same step has failed twice, or the plan no longer looks right. | Run `/advisor`. On a Fable or Opus session, reason it through first, and consult anyway if that does not unblock the step, because a reader with a fresh context sees what this one has stopped seeing. |
| It is a preference or scope call that the user would normally be asked about. | Decide provisionally, as described below. |

**Provisional decisions.** In an interactive session, a new dependency, a
public API change, a deletion of code, a workaround after the intended approach
failed, or a change in scope would each stop for the user. Under `/auto` the
user has asked not to be stopped, so:

- Choose the option that is easiest to undo and closest to the stated goal. Use
  `/council` when the choice is load-bearing.
- Keep the change in its own commit so it can be reverted alone.
- Record it with `/session-log decision`, including the alternative that was
  rejected.
- If Subtrate is set up, mail the user a two-line note through `/substrate` and
  keep working. The note lets them veto early. It is not a request to wait.
- List it in the final report under "Decisions made for you".

**A change cannot modify the check that judges it.** This covers the exit
criteria and every existing test whose expected behavior the goal did not ask
to change. For those, do not delete, skip, or loosen a failing test, edit an
exit criterion, add a sleep or a retry to get a flaky test past, or mark a step
done to get past a hook. If such a check looks wrong, find the root cause and
record the evidence as a blocker on that step. Then continue with the steps
that do not depend on it. Whether to change the check is the user's call, and
it goes in the final report.

Two cases are ordinary work and not covered by the rule. A test that asserts
behavior the goal asks to change is updated as part of the change. A check this
session wrote in section 1 can be fixed if it has a bug. List both kinds of
edit in the final report.

## 4. What still needs the user

Autonomy covers the working tree. These actions get a confirmation unless the
goal text authorizes them by name, as in "and open a PR":

- Pushing, force-pushing, opening or merging a PR, creating or commenting on an
  issue, publishing a package or a page.
- Sending messages to people outside the session. Subtrate mail to the user is
  not in this category.
- Deleting or overwriting anything git cannot restore: untracked files, data
  outside the repo, databases, remote branches.
- Spending money, or changing shared infrastructure, CI configuration, or
  secrets.

Everything else is routine and needs no approval: reading anything, editing
files in the working tree, running builds, tests, linters, and local services,
making local commits, branches, and worktrees, installing dependencies the plan
already calls for, and spawning the consults named in this skill.

When the goal is otherwise complete and an action on the list is all that
remains, finish section 6 and ask for that one action by name.

Notes, memories, and hazards from earlier sessions sometimes carry cautions
such as "never retry X". Check whether the reason behind one still holds before
obeying it. If the reason is gone, drop the caution and say so in the notebook.
A caution about an action on the list above stays until the user lifts it.

## 5. Verification

A step is done when its check has run and passed in this session, with the
command and result in the transcript. Reasoning that the code should work is
not evidence.

- **Run the change, not only its tests.** Boot the service, drive the CLI, or
  open the page, and observe the behavior the goal describes. Use the repo's
  `verify` or `run` skill when it has one. Unit tests can pass while the
  feature is broken.
- **Cheap checks first.** Build, lint, and the focused tests run after each
  step. The slow suites run before a commit that closes a step and once more
  at the end.
- **Three rounds.** If the same check still fails after three distinct attempts
  at a fix, stop spending on it.
  Record a blocker with what was tried and what each attempt showed, and move
  to the steps that do not depend on it. If none remain, that is the second
  stopping case in section 2.
- **Flaky checks.** Reproduce and find the root cause. Rerunning until green
  hides the failure from the user and from the next session.
- **Build on earlier rounds.** After fixing review findings, send the same
  reviewer the fix delta, as `/advisor-review` describes. A fresh reviewer
  would re-check everything from nothing.

## Delegation

A subagent starts with none of this session's context and its report cannot be
watched as it forms, so it costs more than it appears to. Do the work inline
unless delegation buys something specific:

- `/council` and `/advisor` at the points the table in section 3 names, and
  `/advisor-review` once at the end. These are bounded: a few agents each.
- An `Explore` agent for a broad search where only the conclusion is needed.
- `/orchestrate` when the plan contains four or more independent items that
  each take real work. It needs `--fanout`. Without the flag, do the items
  one after another. `/orchestrate` cannot
  be invoked through the Skill tool, so read
  `~/.claude/skills/orchestrate/SKILL.md` and follow it directly.

Treat what a subagent reports as a claim, and check it before building on it.

## 6. Closing out

1. Run every exit criterion again from a clean state, and paste the commands
   and results.
2. For a substantive change, commit, then run `/advisor-review` once. Verify
   each finding against the code, fix what is confirmed, and re-run the
   affected checks.
3. If something went wrong in a way that could recur, name it in the report as
   a `/codify` candidate. Do not run `/codify` unasked.
4. Run `/session-log handoff`.
5. Write the final report.

The person reading the report has not seen the tool calls and may be switching
in from other work. Write it to stand alone: short sentences, plain words, no
labels invented during the work, and the outcome in the first two lines.

- **Outcome.** Whether the goal is met, in one sentence. If it is partly met,
  say which part is not.
- **Evidence.** Each exit criterion, the command that checked it, and the
  result. Name anything that was not verified and why.
- **Decisions made for you.** Each provisional decision, the alternative, the
  commit that holds it, and the later commits that build on it. The last part
  tells the user what undoing the decision would cost.
- **Open.** Blockers, checks that look wrong, deferred findings, and any action
  waiting for confirmation.
- **Changes.** Commits or files, including small ones. A reader reviews the
  diff against this list, so leave nothing out.

## Running it

- `/auto` runs best at `high` effort. At `low` and `medium` the model stops
  early more often.
- `/auto` shapes behavior inside the session. `/goal` enforces a completion
  condition from the harness. The exit criteria from section 1 are a valid
  `/goal` condition, and `/goalcraft` writes one. Pair them for long unattended
  runs.

## Related

- `/council`: a blind panel and a judge for a fork between options.
- `/advisor`: one consult when stuck or before a risky plan.
- `/advisor-review`: the closing audit by a reader with a fresh context.
- `/orchestrate`: parallel workers for independent items.
- `/session-log`: the on-disk plan and notebook that survive compaction.
