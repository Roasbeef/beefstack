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
│   └── load_project_context.sh   # SessionStart: active session summary
├── userpromptsubmit/
│   ├── context_enhancer.py       # UserPromptSubmit: "continue"/"resume" context
│   └── session_context.py        # UserPromptSubmit: session state injection
├── precompact/
│   └── save_important_context.sh # PreCompact: checkpoint, emit surviving context
└── ultrathink_hook.py            # UserPromptSubmit: prompt-level thinking directive
```

One hook is inline in `settings.json` rather than a script: on `SessionStart`
with the `compact` matcher, an `echo` reminds the model that `/session-resume`
runs before anything else.

## The session hooks

These four power the session system described in `../SESSIONS.md`:

1. **On startup**, `load_project_context.sh` shows the active session's summary
   and suggests `/session-resume` if `.sessions/active/` has files.
2. **During work**, the model logs progress and decisions with `/session-log`.
3. **Before compaction**, `save_important_context.sh` checkpoints the session
   and prints the context that must survive the summary.
4. **After compaction**, the inline reminder fires, and `context_enhancer.py`
   injects session context when the user says "continue" or "resume".

## Configuration

Hooks are configured in `../settings.json` under `hooks`, keyed by event, each
entry with an optional `matcher` and a list of commands. To disable one, remove
its entry. `../HOOKS.md` has the contract a hook script follows and how to add
a new one.
