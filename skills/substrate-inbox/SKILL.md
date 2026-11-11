---
name: substrate-inbox
description: Arm and keep alive the Subtrate mail watcher so incoming mail wakes the session. Run once at the start of a session and after every compaction. Re-arm after every wake until the user says to stop watching.
---

# Substrate Inbox

`substrate watch` blocks until mail arrives, then exits with a digest. Run in
the background, its exit wakes you, so you can sit idle without polling. No
hook arms it for you, so this skill is the only thing that keeps the session
reachable.

## Arm

1. Check whether a watcher is already armed:

   ```bash
   substrate watch --check --session-id "$CLAUDE_SESSION_ID"
   ```

   Exit 0 means one is armed; do nothing more.

2. Otherwise start one with the Bash tool and `run_in_background: true`:

   ```bash
   substrate watch --session-id "$CLAUDE_SESSION_ID" --project "$PWD" --timeout 25m
   ```

Arming does not end your turn. Keep working on the current task.

## Keep it armed

- Re-arm after every wake, once you have handled the mail. A watcher that
  exited 0 with a re-arm line, or on timeout with no mail, still needs
  re-arming.
- Re-arm after every compaction, since background tasks die with the process.
- Always pass a bounded `--timeout` (25m). Claude Code kills background tasks
  at 30 minutes, and an unbounded watcher dies as exit 130 ("do not re-arm")
  and leaves the session watcher-less. The value matches the CLI's
  `WatchRearmTimeout` constant; keep the two in agreement.
- Handle the digest the wake delivers: read the mail with the `substrate`
  skill, act on it, and reply by `send`-ing to the original sender.

## Stop

Stop re-arming only when the user says to ("stop watching", "turn off the
watcher", or similar). Then do not re-arm until they ask again. Subagents do
not arm their own.
