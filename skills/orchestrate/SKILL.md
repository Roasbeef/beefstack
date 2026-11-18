---
name: orchestrate
description: "Splits a scoped task into independent work items, runs one worker per item in parallel through a Workflow, and synthesizes the results. The planning and synthesis stay on a strong model and stay thin; the token-heavy execution runs on a cheaper worker tier, with each worker briefed to stand alone and to report evidence for what it verified. Prefers the bundled deterministic workflow; falls back to in-instance Agent dispatch. Use when the user types /orchestrate or asks to decompose, fan out, or parallelize a task across independent workers."
argument-hint: "[--planner=opus|fable] [--worker=sonnet|haiku|opus] [--effort=low|medium|high] [--isolation] <task to decompose and run>"
disable-model-invocation: true
allowed-tools:
  - Agent
  - Task
  - Workflow
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
---

# Orchestrate

Run the **orchestrator pattern** from the [advisor-tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool): a strong model plans and decomposes, cheaper workers do the token-heavy execution in parallel, and the strong model combines the results into one answer. Most tokens are generated at the worker rate.

**Target**: $ARGUMENTS

This is the inverse of `/advisor`, where a cheap main loop consults an expensive model. Here the expensive reasoning is scarce (one plan, one synthesis) and the cheap work is abundant.

## When it pays, and when it does not

A worker starts with none of this session's context. It knows only its brief, and this session sees only its report. Both handoffs lose detail, and a worker's mistake comes back in the same confident tone as its finding. Fan-out is worth that cost when:

- The task has roughly four or more items that are independent: no item needs another's output, and no two edit the same file.
- Each item takes real work. A handful of tool calls per item is faster done inline.
- Each item has a check that a worker can run by itself.

Do the work in this session instead when the items share evolving context, when the split is not yet known, or when the whole task is one thread. For a single hard decision use `/advisor` or `/council`.

## Phase 0: Scope and brief (always done by the main loop)

The plan is only as good as the context behind it, and this session is the only one that has that context.

1. **Parse flags.**
   - `--planner=`: `opus` (default) or `fable` for a decomposition that is itself hard.
   - `--worker=`: `sonnet` (default), `haiku` for mechanical and fully specified items, or `opus` when each item needs judgment.
   - `--effort=`: worker effort. Leave it unset to inherit the session's. `low` suits well-specified, high-volume items.
   - `--isolation`: workers get their own git worktrees. Use it only when items must edit the same files, because worktrees are slow to set up. A split with disjoint files is the better fix.

2. **Scout inline.** List the files, find the call sites, scope the diff. A fan-out over a work-list nobody has looked at wastes every stage after it.

3. **Write the work-list yourself when you can.** On an Opus or Fable session, this session is the planner: it has the context a fresh planner agent lacks. Write `items` directly and the workflow skips its Plan phase. Let the planner agent decompose only when the session is on a cheaper model or the split is not obvious after scouting.

   Each item is `{ id, spec, done }`:
   - `spec` says what to do and names the files or areas, in words a reader with no other context can act on.
   - `done` is a check the worker runs, with the expected result: "`go test ./lnwire/...` exits 0", not "tests pass".
   - Keep it to about eight items, and batch small pieces together. Workflows in this setup are sized for under ten agents.

4. **Write the shared `context`.** This goes verbatim to the planner and to every worker, so it is the one place to state what they cannot see: the constraints that must hold, the conventions to follow, the facts scouting turned up, and the build and test commands. Without it, each worker rediscovers the repo or guesses.

## Preferred path: the bundled workflow

When the `Workflow` tool is available, run `workflow/orchestrate.js`. Do not hand-author a script per invocation.

```
Workflow({
  scriptPath: "<this skill dir>/workflow/orchestrate.js",
  args: {
    task:      "<the task, verbatim>",
    context:   "<constraints, conventions, scouting facts, verify commands>",
    items:     [{ id, spec, done }, ...],  // or null to let the planner split
    planner:   "opus",
    worker:    "sonnet",
    workerEffort: null,   // or "low" | "medium" | "high"
    isolation: false,
  },
})
```

The workflow runs three phases:

- **Plan**, on the planner tier. Skipped when `items` is supplied. The planner works from `task` and `context` only and returns items plus anything that does not split cleanly (`uncovered`).
- **Execute**, on the worker tier, one worker per item in parallel. Each worker is told to do its whole item and nothing outside it, to work through ordinary obstacles, to run its done-when check, and to report `status`, the check's actual result, and what it could not verify.
- **Synthesize**, on the planner tier. It combines the reports and lists conflicts, gaps, and the checks to run on the combined result.

It returns `{ items, results, incomplete, uncovered, answer }`. `answer` is null if the synthesizer failed, in which case work from `results`. The workflow runs in the background and notifies on completion.

## After the workflow returns

The workflow's answer is a set of claims. Each worker verified only its own item, and parallel changes can break each other.

1. **Run the combined check here.** Build and run the task's tests over the merged result, plus anything in `answer.recheck`. A fan-out is not finished until this passes in the main loop.
2. **Handle `incomplete`.** Finish a small leftover inline. Re-run several with the same workflow, passing only those items and adding to `context` what the first round found, so the second round builds on the first.
3. **Collect isolated work.** With `--isolation`, each result carries a `commit`. Cherry-pick them in order and resolve conflicts here.
4. **Do `uncovered` yourself.** Those are the parts that needed this session's context, or items the planner produced beyond the cap of eight.
5. **Report from `answer`,** corrected by what steps 1 to 4 showed. The per-item `results` are background detail.

## Fallback path: in-instance Agent dispatch

Without the `Workflow` tool, run the same phases by hand:

1. **Plan**: write the items yourself, or make one `Agent` call on the planner tier with the task and the shared context.
2. **Execute**: one `Agent` call per item on the worker tier, all in one message so they run concurrently. Give each the task, the shared context, its `spec` and `done`, and the same reporting instructions the workflow uses.
3. **Synthesize**: combine the reports yourself on a strong session, or make one `Agent` call on the planner tier.

Then follow "After the workflow returns".

## Keep the expensive stages thin

The savings depend on the planner and synthesizer staying small. Three ways they stop being small:

- **The planner reads the codebase.** It then pays expensive rates for work a worker or this session's scouting should do. Give it a better `context`, or make "read X and report the shape of Y" a worker item.
- **The synthesizer re-derives worker results.** Its job is to combine and to flag. Verification belongs to the workers' own checks and to the combined check in the main loop.
- **Synthesis is skipped on the fallback path.** Raw worker output is N fragments, and the user asked for one answer.

## Related

- `/advisor`: the inverse, a cheap main loop consulting an expensive model.
- `/council`: a small blind panel for one decision between options.
- `/auto`: may run this skill for independent items when given `--fanout`.
- Background and economics: `docs/advisor-and-orchestrate.md`.
