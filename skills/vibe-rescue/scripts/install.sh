#!/usr/bin/env bash
# Install the vibe-rescue skill into an agent's skills folder.
# Usage (from a local clone of vibe-code-rescue):
#   bash skills/vibe-rescue/scripts/install.sh [claude-code|codex|opencode|cursor]
# With no argument, installs for Claude Code (~/.claude/skills/vibe-rescue).
set -euo pipefail

TARGET="${1:-claude-code}"
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SRC="$REPO_ROOT/skills/vibe-rescue"

case "$TARGET" in
  claude-code) DEST="$HOME/.claude/skills/vibe-rescue" ;;
  codex)       DEST="$HOME/.codex/skills/vibe-rescue" ;;
  opencode)    DEST="$HOME/.config/opencode/skills/vibe-rescue" ;;
  cursor)      DEST="$HOME/.cursor/skills/vibe-rescue" ;;
  *) echo "Unknown target: $TARGET (use claude-code, codex, opencode, or cursor)" >&2; exit 2 ;;
esac

mkdir -p "$DEST"
cp -R "$SRC"/. "$DEST"/
echo "Installed vibe-rescue skill to $DEST"
echo "The skill runs the CLI at $REPO_ROOT/bin/vibe-rescue.js (Node 18+, no install needed)."
