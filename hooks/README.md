# Hooks

Shell and Python scripts bound to Claude Code lifecycle events in
`../settings.json`. Everything in this directory is wired; a script that stops
being wired is deleted rather than left as an example.

```
hooks/
├── substrate/                    # Subtrate agent messaging and mission control
│   ├── session_start.sh          # SessionStart: heartbeat, inject unread mail
│   ├── user_prompt.sh            # UserPromptSubmit: silent heartbeat, mail check
│   ├── stop.sh                   # Stop: long-poll so the agent stays reachable
│   ├── subagent_stop.sh          # SubagentStop: one-shot mail check
│   ├── pre_compact.sh            # PreCompact: save identity for restoration
│   ├── notification.sh           # Notification: forward to the agent's card
│   ├── pretooluse_plan.sh        # PermissionRequest(ExitPlanMode): sync the plan
│   ├── posttooluse_plan.sh       # PostToolUse(Write): sync plan file writes
│   └── task_sync.sh              # PostToolUse(Task*): sync the task list
├── sessionstart/
│   └── load_project_context.sh   # SessionStart: .notes/ summary for the tree
├── userpromptsubmit/
│   └── context_enhancer.py       # UserPromptSubmit: "continue"/"resume" context
└── ultrathink_hook.py            # UserPromptSubmit: prompt-level thinking directive
```

One hook is inline in `settings.json` rather than a script: on `SessionStart`
with the `compact` matcher, an `echo` reminds the model that `/session-log`
runs before anything else.

## The session-log hooks

Two hooks support the `session-log` skill, whose record lives in an
untracked `.notes/` directory at the top of each working tree:

1. **On startup**, `load_project_context.sh` runs the skill's
   `scripts/notes.sh status`, which prints the active plans, the next open
   step, open questions, and the newest notebook entry, or a notice when
   legacy `.sessions/` files are waiting to be imported.
2. **After compaction**, the inline reminder tells the model to run
   `/session-log` with no arguments to orient before anything else.

Everything else is on disk, so nothing needs saving at `PreCompact`.

## Configuration

Hooks are configured in `../settings.json` under `hooks`, keyed by event, each
entry with an optional `matcher` and a list of commands. To disable one, remove
its entry. `../HOOKS.md` has the contract a hook script follows and how to add
a new one.
