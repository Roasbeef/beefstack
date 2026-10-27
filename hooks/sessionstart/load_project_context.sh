#!/bin/bash
# SessionStart hook: Load project context
# Shows the tree's .notes/ record (see the session-log skill) so a session
# that continues earlier work starts from the plan, not from memory.

# Don't use set -e because grep returns 1 when no matches found
set -uo pipefail

echo ""
echo "🚀 Claude Code Session Starting"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Show current directory
current_dir=$(pwd)
echo "📁 Project: $(basename "$current_dir")"

# Git status
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    branch=$(git branch --show-current 2>/dev/null || echo "detached")
    echo "🌿 Branch: $branch"

    changes=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$changes" -gt 0 ]; then
        echo "   Uncommitted: $changes file(s)"
    fi
fi

echo ""

# The session-log record for this working tree, if any. The script prints
# nothing when the tree has no notes.
notes_status=$("$HOME/.claude/skills/session-log/scripts/notes.sh" status)
if [ -n "$notes_status" ]; then
    echo "$notes_status"
    echo ""
fi

# Project type detection (compact)
if [ -f "go.mod" ]; then
    echo "🔵 Go project"
elif [ -f "package.json" ]; then
    echo "🟢 Node.js project"
elif [ -f "Cargo.toml" ]; then
    echo "🦀 Rust project"
elif [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
    echo "🐍 Python project"
fi

echo ""
exit 0
