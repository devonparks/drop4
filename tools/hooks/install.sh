#!/bin/sh
# One-time setup for Drop4 git hooks.
# Run from repo root: bash tools/hooks/install.sh

set -e
REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_SRC="$REPO_ROOT/tools/hooks/pre-commit"
HOOK_DST="$REPO_ROOT/.git/hooks/pre-commit"

if [ ! -f "$HOOK_SRC" ]; then
  echo "Missing $HOOK_SRC"
  exit 1
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"
echo "✓ Installed pre-commit hook → $HOOK_DST"
echo "  Runs tsc + jest before every commit. Skip with: git commit --no-verify"
