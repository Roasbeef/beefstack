# Harness gaps

What Claude needs before it can own an outcome instead of a task. Check each
category against the real environment; an assumed capability is a gap.

## Signal: how Claude learns something needs doing

Without a signal, the user is still the one noticing problems and relaying
them, which means the rung did not change.

- Questions: where do failures, regressions, or opportunities first appear?
  Can Claude read that place directly?
- Examples: CI run history (`gh run list`, `gh run view --log-failed`), crash
  reports, error logs, metrics dashboards, issue trackers filtered by label,
  user reports, benchmark history, dependency advisories.

## Provenance: mapping a symptom to the code that caused it

- Questions: given a failure, can Claude find the exact commit, build, config,
  and environment that produced it?
- Examples: CI run metadata (commit SHA, workflow inputs), release tag to
  commit, binary version strings, deploy logs, a config snapshot per node.

## Reproduction: making the failure happen on demand

Felix's crash-free outcome needed real Windows, macOS, and Linux machines.
A fix that cannot be reproduced cannot be verified.

- Questions: can Claude recreate the failing environment locally or in a
  sandbox? Which part of the matrix (OS, backend, database, network) is
  missing?
- Examples: `make itest icase=<name>`, Docker for btcd, bitcoind, neutrino,
  and postgres backends, regtest networks, VMs, browser automation, recorded
  traffic for replay.

## Verification: a check that says done, run by something other than Claude

- Questions: what command or observation shows the outcome holds? Does it
  run without a human? Would it catch a fake fix? For intermittent failures,
  is the repetition count sized from the measured failure rate (about 3/p
  for 95% confidence)?
- Examples: a test repeated N times, a benchmark with a threshold, a flake
  rate computed over the last K CI runs, a canary metric, a reviewer agent
  with a fresh context (`/advisor-review`).

## Authority: what Claude may do alone

Open authority gaps are acceptable when the prompt says what to escalate.

- Questions: what do the credentials allow (push, merge, close, deploy,
  spend, message), and what does the user permit? Record both; the prompt
  must cover the difference. Probing a token's scopes answers the first
  question, never the second.
- Examples: open PRs but not merge; quarantine a test behind an issue but not
  delete it; page a human through Subtrate mail for anything touching
  consensus code.

## Memory: where state lives between runs

A standing outcome spans many sessions. Each run needs to know what earlier
runs found and decided.

- Questions: where does Claude record what it triaged, what it is waiting on,
  and what it ruled out?
- Examples: issue labels as a ledger, a `docs/next.md` handoff, decision
  records, a tracking issue with a checklist, a JSON state file in the repo.

## Cadence: what wakes Claude up

- Questions: is the work triggered by time, by an event, or by a threshold?
- Examples: `/schedule` for a daily cloud routine, `/loop` within a session,
  an existing workflow that runs Claude (claude-code-action) given a
  `schedule:` trigger, a CI webhook, a PR event, `/goalcraft` plus `/goal` to
  run until a condition holds.
- The cadence decides the environment. Re-check the reproduction,
  verification, and authority rows where the cadence runs: a `/schedule`
  routine does not inherit this machine's Docker, binaries, or credentials.
