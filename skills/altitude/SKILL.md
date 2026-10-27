---
name: altitude
description: "Rewrites a task one or two levels up in abstraction: from the task as stated, to the outcome it serves, to a standing outcome Claude could own without being re-prompted. Pulls the task's evidence first, shows the ladder with a check per rung that would fail on a fake fix, probes the harness gaps (signal, provenance, reproduction, verification, authority, memory, cadence) that block Claude from owning the higher rung, and hands back a rewritten prompt plus, for standing outcomes, the /goalcraft, /loop, or /schedule wiring. The altitude axis from Felix Rieseberg's 'How to be more ambitious'. Use when a task is one of a recurring series, is a step toward a result that will be discussed in a meeting or review, or when the user keeps assigning the same kind of fix. Invoked via /altitude or from /ambition."
argument-hint: "[<task text>|@file|#issue]"
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

# Altitude

A task handed to Claude is the user's best guess at how to reach some
outcome. Altitude means asking for the outcome instead. Felix Rieseberg's
example: he stopped asking Claude to fix individual crashes and asked it to
keep the apps crash-free. That only worked after he gave Claude crash-report
access, a map from app version to git commit, and Windows, macOS, and Linux
machines to reproduce and verify fixes on. The rewritten prompt is half the
work; the access that makes the higher rung ownable is the other half, and it
is the half people skip.

Source: https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/

The output is a proposal. Nothing runs and no scope grows until the user
picks a rung.

## 1. Capture the task and its evidence

Parse `$ARGUMENTS`: raw text, an `@file`, or an issue (`gh issue view <n>
--json title,body,comments`). With no arguments, take the most recent task in
the conversation. Write it as one sentence: the task as stated.

Then pull the evidence the task rests on, sampled rather than exhaustive: for
a bug or flake, its occurrence count over a recent window and its distinct
error signatures; for a recurring chore, the last few times it was done. The
evidence often changes the ladder (a "flake" with two signatures may be one
flake and one real bug), and it sets the baseline every check is measured
against.

If the task is a lookup, a mechanical edit, or a change whose scope the user
just narrowed on purpose, say altitude does not apply and stop.

## 2. Climb the ladder

Ask two questions of the task, repeatedly: what does the user want to happen
next, and why does this task exist? Write three rungs:

- **Rung 0, the task.** One deliverable. "Fix this flaky test."
- **Rung 1, the outcome.** The state of the world the task serves, reached
  once. "Every test that failed twice on master this quarter has a fix PR or
  a tracking issue."
- **Rung 2, the standing outcome.** Rung 1 held continuously, with Claude as
  the owner. "Each day, cluster new master failures by signature and
  root-cause new clusters; no cluster older than 48 hours lacks a PR or an
  issue."

Rung 3 is rare: a better mechanism than the one in place (Felix's example
replaces a quarterly review deck with something that catches problems
sooner). If it needs authority Claude cannot hold, it is the ceiling, not a
rung.

Rules for the ladder:

- **Every rung has a check that would fail on a fake fix.** A check that an
  unfixed system passes most of the time is not a check. For intermittent
  failures, measure the failure rate p from the evidence and size the
  repetitions at about 3/p for 95% confidence, or require a deterministic
  reproduction. At p = 1.5%, fifty clean runs happen about half the time with
  no fix at all.
- **Name the ceiling.** Stop when the next rung needs authority Claude cannot
  hold (budget, hiring, product direction, CI policy) or cannot be checked.
  Say where the ceiling is and why.
- **Stay recognizable.** Rung 1 must be something the user would agree is why
  they asked. When two readings are plausible, carry both forward and make
  the reading the first question in step 5. Ask early only when the two
  readings would need entirely different gap checks.
- **Use the tell.** A task that recurs, or that the user would follow with
  the next instance, points up the ladder. Creative work (open-ended making
  where the user's taste is the target) gains little from altitude; point at
  `/range`.

## 3. Probe the harness gaps

For the highest plausible rung, list what Claude would need to own it without
the user relaying information turn by turn. Use the seven categories in
`references/harness-gaps.md`: signal, provenance, reproduction, verification,
authority, memory, cadence.

Probe each row against the real environment instead of guessing: run the
command, look for the MCP tool, find the script, read the CI config. Keep the
probes cheap: existence checks and one sampled baseline (10 to 20 runs, not
the full history). Do not do the rung's work while proposing it. Record:

| Need | Exists? | How checked | What closes the gap |
|------|---------|-------------|---------------------|

Check the rows in the environment the work will run in. A `/schedule`
routine does not inherit this machine's Docker, binaries, or credentials.

The gaps pick the rung:

- If verification is open for the whole scope, recommend the rung below and
  list closing the gap as the first task.
- If a row is open for only part of the scope (Linux reproduces, Windows does
  not), either narrow the rung to the part where it is closed and escalate
  the rest, or drop a rung. Say which and why.
- An open authority gap is fine when the prompt says what to escalate.

## 4. Write the rewritten prompt

For the recommended rung, write a prompt that states:

- the outcome, and the check that shows it holds;
- where the raw inputs live (logs, CI runs, issue labels, datasets), with the
  evidence from step 1 cited;
- what Claude may decide alone and what it must escalate;
- what must not change on the way there.

Write the fallback rung as a delta from that prompt ("part (a) only"), not a
second full prompt.

A prompt at rung 1 that runs for hours, or any prompt at rung 2, is not
one-shot. Name the wiring:

- `/goalcraft` for a completion condition when the work runs until a state
  is reached;
- `/loop` for self-paced repetition inside a session;
- `/schedule` for a cloud routine on a cron, once its environment is probed;
- an existing CI workflow that runs Claude (claude-code-action) given a
  `schedule:` trigger, which gets CI's exact environment;
- `/handoff` so the next session knows the standing outcome exists.

## 5. Present and ask

Show, in this order: the evidence, the ladder with each rung's check, the gap
table, the recommendation with its cost (access to grant, compute, setup the
user must do), and the rewritten prompt. Then one `AskUserQuestion` call with
two questions (three if a reading was carried forward from step 2):

1. which rung, recommended first;
2. what to do with it: run it now, hand back the prompt only, or close the
   gaps first.

Do nothing else until the answer arrives. On "run it now", execute the
rewritten prompt. On "close the gaps first", treat the gap list as the task.

## Worked example

The environment facts here were true when written; re-probe every one.

Task: "fix the `rbf coop close` itest flaking on CI" in lnd.

- Evidence: on master, the case failed in 4 of about 130 completed runs
  (p ≈ 3%), with two signatures: a fee-rate assertion mismatch, and a timeout
  on the fee bump after a reconnect. The second may be a real bug in the RBF
  closer, not a timing flake. The whole master workflow failed on most runs,
  and unit tests failed more often than any itest job.
- Rung 0: fix the case. Check: a root cause per signature, plus a test that
  forces the race or about 100 consecutive passes per affected backend
  (3/p), counted by a wrapper, since `make flakehunter-itest` loops until
  failure with no count.
- Rung 1: every itest case that failed twice on master in the window has a
  fix PR or an open `test flake` issue with its signature and run IDs.
- Rung 2: own master CI health daily. Scope fork: itests only, or unit tests
  too, since they fail most.
- Ceiling: quarantining tests, editing workflows, and merging belong to the
  maintainers.
- Gaps: reproduction is open for the Windows job and differs in bitcoind
  version from CI; cadence is unprobed for a cloud routine. The credentials
  allow merging, so the prompt must state that the user permits only draft
  PRs and issues.
- Recommendation: rung 1 now; rung 2 after a cadence host is chosen and
  probed, with Windows-only clusters escalated.

## What not to do

- Do not climb for a task that is already the right size. Saying "altitude
  does not apply" is a valid result.
- Do not invent an outcome the user never hinted at.
- Do not present a standing outcome without its check and its gap table.
- Do not do a rung's work while proposing it, or start executing a higher
  rung before the user picks it.
