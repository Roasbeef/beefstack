---
name: ambition
description: "Router for the three ambition skills from Felix Rieseberg's 'How to be more ambitious': reads a task, checks its premise against the code or data, decides whether any ambition axis applies, and if so recommends altitude (own the outcome instead of the task), depth (do the task the way a field-leading expert would), range (bring other fields' methods to bear), or at most two of them in order, then runs the chosen skill. Says plainly when a task should just be done as asked. Use when the user wants a task made more ambitious but has not said in which direction. Invoked via /ambition."
argument-hint: "[<task text>|@file|#issue]"
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - Skill
---

# Ambition

Felix Rieseberg splits ambition with models into four types. Speed (the same
work in less time) needs no help. The other three each have a skill:

- `/altitude`: go up in abstraction and own the outcome, not the task.
- `/depth`: do the task the way the best professional in the field would.
- `/range`: bring in fields the task does not seem to need.

This skill picks among them. It does no rewriting itself.

Source: https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/

## 1. Capture the task and check its premise

Parse `$ARGUMENTS`: raw text, an `@file`, or an issue (`gh issue view <n>
--json title,body,comments`). With no arguments, take the most recent task in
the conversation.

Then look at the code or data the task names. If the task asserts a fact ("this
variable holds an outpoint", "this path is slow", "this feature does not
exist"), check it. A false premise is reported back to the user with what was
found, not routed. Context found here (an existing feature, a prior attempt,
a recurring pattern in `git log`) feeds the tells below.

## 2. Decide whether ambition applies

Some tasks should be done as asked: lookups, edits whose every site is
determined by the request, a change the user just scoped down on purpose, a
fix under time pressure. Say so in one line and stop. A router that always
finds a reason to expand scope is the failure this step exists to prevent.

## 3. Rate each axis

Rate each axis strong, weak, or no, with one line of why.

- **Altitude** is strong when this task is one instance of an outcome the user
  cares about more than the instance: the same kind of task has come before
  (check `git log`, open issues, the conversation) or will come again. Being
  headed for a PR or a meeting is not enough on its own; most work is.
- **Depth** is strong when the task is already the right task but must be
  done very well, and there is raw data or tooling beneath it and a way to
  measure the result.
- **Range** is strong when the deliverable has an audience to persuade or
  teach, an adversary to survive, or several distinct facets, or when the
  problem has a known shape in another field (queueing, latency-bound
  protocols, auctions, epidemiology).

Altitude helps little with creative work, meaning open-ended making where the
user's taste is the target (a post, a design, a video); range helps most
there.

## 4. Recommend

Recommend the strong axes only, at most two, and list weak ones as
alternatives. Each axis in a combination costs the user another round of
choices, so a single axis is the default.

Order a pair by what has to be known first:

- When the task's answer is already understood, altitude goes first: choose
  the right task, then the method (depth) or the breadth (range).
- When the task is an investigation whose cause is not known yet, depth goes
  first. Offer altitude after the cause is found, when it is clear what
  outcome there is to own.
- Depth and range together: depth first, then range on the result.

Then one `AskUserQuestion` with at most four options: the recommendation, its
strongest single axis (if the recommendation is a pair), one alternative, and
"just do the task as asked". If the task is ambiguous in a way that changes
the routing (which release, which branch), ask that as a second question in
the same call.

## 5. Run the chosen skill

The three skills set `disable-model-invocation` so they never fire on their
own, which also means the `Skill` tool cannot call them. Instead, read
`~/.claude/skills/<axis>/SKILL.md` and follow it from step 1, with the task
and anything step 1 here found as its input. For a pair, run the first skill
to its proposal, let the user choose within it, then pass the chosen rewritten
prompt to the second skill. Do not chain past a skill whose proposal the user
declined.
