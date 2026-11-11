#!/bin/bash
# Subtrate SessionStart hook - heartbeat + check for mail
#
# This hook runs when a Claude Code session starts. It:
# 1. Exports CLAUDE_SESSION_ID to the environment (via CLAUDE_ENV_FILE)
# 2. Sends a heartbeat to mark the agent as active
# 3. Checks for any pending messages to inject as context
#
# Output format: plain text for context injection

# Read hook input from stdin to get session_id.
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')
cwd=$(echo "$input" | jq -r '.cwd // empty')

# Determine the host agent. The Codex hook definitions append --codex to the
# installed command; Claude Code invokes the same script with no arguments.
# Sniffing the payload or the environment instead would misfire whenever a
# Claude session inherits CODEX_* variables from a parent shell.
is_codex=false
if [ "${1:-}" = "--codex" ]; then
    is_codex=true
fi

# Hook input is authoritative. Environment fallbacks also make the script easy
# to test manually in either supported agent.
if [ -z "$session_id" ]; then
    session_id="${CLAUDE_SESSION_ID:-$CODEX_SESSION_ID}"
fi

project_dir="${CLAUDE_PROJECT_DIR:-${CODEX_PROJECT_DIR:-$cwd}}"
agent_args=()
if [ -n "$session_id" ]; then
    agent_args+=(--session-id "$session_id")
fi
if [ -n "$project_dir" ]; then
    agent_args+=(--project "$project_dir")
fi

# Export CLAUDE_SESSION_ID via CLAUDE_ENV_FILE if available.
# This makes the session ID available to the agent during the session.
if [ -n "$session_id" ] && [ -n "$CLAUDE_ENV_FILE" ]; then
    echo "CLAUDE_SESSION_ID=$session_id" >> "$CLAUDE_ENV_FILE"
fi

# Send heartbeat to mark session start.
substrate heartbeat --session-start "${agent_args[@]}" \
    --format context 2>/dev/null || true

# Poll for new messages (non-blocking).
# Output is injected as context at session start.
result=$(substrate poll "${agent_args[@]}" --format context --quiet \
    2>/dev/null || echo "")

if [ -n "$result" ]; then
    echo "$result"
fi
