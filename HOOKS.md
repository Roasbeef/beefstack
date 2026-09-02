# Hooks

Hooks are scripts that Claude Code runs at lifecycle events, configured in
`settings.json`. They are what turns a rule into something the harness enforces
rather than something the model is asked to remember: identity survives
compaction because a hook saves it, and a session resumes because a hook
injects it. `hooks/README.md` lists every wired script and its event; this
file is the contract and the recipe for adding one.

## What is wired

| Event | Matcher | Hook | Does |
|-------|---------|------|------|
| SessionStart | | `sessionstart/load_project_context.sh` | Active session summary, suggest `/session-resume` |
| SessionStart | `compact` | inline `echo` | Reminder that `/session-resume` runs first after compaction |
| SessionStart | | `substrate/session_start.sh` | Heartbeat, inject unread mail |
| UserPromptSubmit | | `ultrathink_hook.py` | Append the thinking directive to the prompt |
| UserPromptSubmit | | `userpromptsubmit/context_enhancer.py` | Detect "continue"/"resume", inject session context |
| UserPromptSubmit | | `userpromptsubmit/session_context.py` | Session state injection |
| UserPromptSubmit | | `substrate/user_prompt.sh` | Silent heartbeat, check for new mail |
| PreCompact | | `precompact/save_important_context.sh` | Checkpoint the session, emit surviving context |
| PreCompact | | `substrate/pre_compact.sh` | Save identity for restoration |
| Stop | | `substrate/stop.sh` | Long-poll so the agent stays reachable for mail |
| SubagentStop | | `substrate/subagent_stop.sh` | One-shot mail check, then exit |
| Notification | | `substrate/notification.sh` | Forward permission and idle prompts to the agent's card; wake on idle |
| PermissionRequest | `ExitPlanMode` | `substrate/pretooluse_plan.sh` | Sync the plan to mission control |
| PostToolUse | `Write` | `substrate/posttooluse_plan.sh` | Sync plan file writes |
| PostToolUse | `TaskCreate\|TaskUpdate\|TaskList\|TaskGet` | `substrate/task_sync.sh` | Sync the task list |

The substrate hooks are installed by `substrate hooks install`; the rest are
checked in here.

## The contract

A hook receives one JSON object on stdin and signals with its exit code.

```bash
#!/bin/bash
input=$(cat)
tool=$(echo "$input" | jq -r '.tool_name // empty')

# Exit 0 to continue. Exit 2 to block, with the reason on stderr; the model
# sees the reason and adjusts. Anything printed to stdout on exit 0 reaches
# the model as context.
exit 0
```

The fields vary by event. Tool events carry `tool_name`, `tool_input` and, for
PostToolUse, `tool_response`; every event carries `session_id` and `cwd`;
Notification carries `message`, `title` and `notification_type`. A hook that
wants to add context structurally rather than by printing returns JSON with
`hookSpecificOutput.additionalContext`, as `substrate/notification.sh` does to
wake an idle agent.

## Adding one

1. Write the script under `hooks/<event>/` and `chmod +x` it.
2. Add it to `settings.json`:
   ```json
   "PreToolUse": [
     {
       "matcher": "Edit|Write",
       "hooks": [
         { "type": "command", "command": "~/.claude/hooks/pretooluse/my_hook.sh" }
       ]
     }
   ]
   ```
   The matcher is a regex over the tool name; omit it to run on every tool.
   Hooks under one event run in the order listed.
3. Test it directly: `echo '{"tool_name":"Edit"}' | hooks/pretooluse/my_hook.sh; echo $?`.
4. Update `hooks/README.md` and the table above. A script that is not wired
   is deleted, not kept as an example.

Prefer a hook over a `CLAUDE.md` rule whenever the behaviour can be checked
mechanically; `/codify` is the skill that makes that call.

## Troubleshooting

- **Not running**: check the execute bit, that the path in `settings.json`
  resolves, and run the script by hand with sample input.
- **Blocking unintentionally**: the script exits non-zero on a path it did not
  mean to; add `set -e` deliberately or not at all, and test the empty-input
  case.
- **Slow prompts**: every UserPromptSubmit hook runs on every prompt. Keep them
  under a second and never network-bound without a timeout.

Hooks run with your shell environment and credentials. Review a hook before
wiring it and keep secrets in the environment, not in the script.
