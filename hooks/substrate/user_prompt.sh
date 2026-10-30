#!/bin/bash
# Subtrate UserPromptSubmit hook - silent heartbeat + check mail
#
# This hook runs each time the user submits a prompt. It:
# 1. Sends a heartbeat to indicate active use
# 2. Quietly checks for new mail to inject as context
#
# Output format: plain text for context injection (quiet if no messages)

# Read hook input from stdin to get session_id.
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')
cwd=$(echo "$input" | jq -r '.cwd // empty')

# Try the host agent's session environment as a fallback.
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

# Send heartbeat (best effort, silent).
substrate heartbeat "${agent_args[@]}" --format context 2>/dev/null || true

# Check for new mail and inject as context if any.
substrate poll "${agent_args[@]}" --quiet --format context 2>/dev/null || true
