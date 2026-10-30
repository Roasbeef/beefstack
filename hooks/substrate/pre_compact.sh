#!/bin/bash
# Subtrate PreCompact hook - save identity and send status mail
#
# This hook runs before context compaction. It:
# 1. Saves the agent's identity and consumer offsets
# 2. Records a heartbeat
# 3. Sends a status update mail to User (summarizing session)
# 4. Outputs status for context injection
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

if [ -z "$session_id" ]; then
    session_id="${CLAUDE_SESSION_ID:-$CODEX_SESSION_ID}"
fi

# Build agent args if available. Codex supplies cwd in hook input rather than a
# persistent project environment variable.
project_dir="${CLAUDE_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${cwd:-$(pwd)}}}"
session_args=()
if [ -n "$session_id" ]; then
    session_args+=(--session-id "$session_id")
fi
if [ -n "$project_dir" ]; then
    session_args+=(--project "$project_dir")
fi

# Save identity state before compaction.
substrate identity save "${session_args[@]}" >/dev/null 2>&1 || true

# Record heartbeat.
substrate heartbeat "${session_args[@]}" --format context \
    >/dev/null 2>&1 || true

# Get agent name for the status mail.
# Format is "Current agent: AgentName (ID: N)"
agent_name=$(substrate identity current "${session_args[@]}" --format text 2>/dev/null | sed -n 's/Current agent: \([^ ]*\).*/\1/p' || echo "Unknown")

# Get project info.
project_name=$(basename "$project_dir")
git_branch=$(git -C "$project_dir" branch --show-current 2>/dev/null || echo "unknown")

# Send status update mail to User (fire and forget, don't block compaction).
# NOTE: claude -p is DISABLED - it causes recursive hook loops.
{
    # Try to get summary from sessions-index.json instead.
    project_hash=$(echo "$project_dir" | tr '/.' '-')
    sessions_index="$HOME/.claude/projects/$project_hash/sessions-index.json"
    summary=""

    if [ -f "$sessions_index" ]; then
        summary=$(jq -r '.entries[-1].summary // empty' "$sessions_index" 2>/dev/null)
    fi

    # Fallback: generic status message.
    if [ -z "$summary" ]; then
        summary="Session compacting. Agent will resume shortly."
    fi

    # Build the status message
    status_body="[Context: Working on $project_name, branch: $git_branch]

$summary

---
(Automated status before context compaction)"

    # Build a project/branch context tag for the subject so the user
    # can tell which worktree is compacting at a glance — agent names
    # aren't memorable when many agents are running.
    if [ -n "$project_name" ] && [ -n "$git_branch" ]; then
        status_ctx="$project_name/$git_branch"
    elif [ -n "$project_name" ]; then
        status_ctx="$project_name"
    else
        status_ctx="$agent_name"
    fi

    # Send to User agent
    substrate send "${session_args[@]}" \
        --to User \
        --subject "[Status] $status_ctx — Compacting" \
        --body "$status_body" \
        2>/dev/null || true
} </dev/null >/dev/null 2>&1 &

# Codex ignores plain text for PreCompact and expects a single JSON object.
# Claude uses the status text as context around compaction.
if [ "$is_codex" = "true" ]; then
    echo '{}'
else
    substrate status "${session_args[@]}" --format context 2>/dev/null || true
fi
