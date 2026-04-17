#!/usr/bin/env bash
# Drop4 Polish Merge — one-command fast-forward merge of polish-loop → main.
#
# Run this whenever you want to pull the overnight polish commits into main.
# Takes ~10 seconds. Safe: uses fast-forward only (aborts on conflict).
#
# Usage:
#   cd ~/Desktop/Drop4
#   bash tools/merge-polish.sh
#
# What it does:
#   1. Saves your current branch (we'll return to it at the end).
#   2. Checks out main, pulls latest.
#   3. Fast-forward merges polish-loop. Aborts if it can't FF.
#   4. Runs tsc + jest. Aborts if either is red.
#   5. Pushes main to origin.
#   6. Returns to your original branch.

set -e

cd "$(git rev-parse --show-toplevel)"

STASH_REF=""
ORIG_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "→ Drop4 polish merge"
echo "  From: polish-loop"
echo "  Into: main"

# If the working tree is dirty, stash temporarily so we can switch branches.
if ! git diff-index --quiet HEAD --; then
  echo "  Working tree dirty — stashing temporarily..."
  STASH_REF=$(git stash create "polish-merge temp")
  git stash store -m "polish-merge temp" "$STASH_REF" 2>/dev/null
  git reset --hard HEAD
fi

cleanup() {
  set +e
  git checkout "$ORIG_BRANCH" 2>/dev/null
  if [ -n "$STASH_REF" ]; then
    echo "  Restoring stashed changes..."
    git stash pop 2>/dev/null || echo "  ⚠ Stash restore had conflicts — resolve manually with 'git stash list'"
  fi
}
trap cleanup EXIT

# Sync both branches from origin
echo "→ Fetching latest..."
git fetch origin main polish-loop

# Switch to main
git checkout main
git pull --ff-only origin main

# Count commits to merge
AHEAD=$(git rev-list --count main..origin/polish-loop)
if [ "$AHEAD" = "0" ]; then
  echo "✓ Nothing to merge — polish-loop is already in main."
  exit 0
fi

echo "→ Merging $AHEAD polish commits..."
git log main..origin/polish-loop --oneline | head -10
echo "  ..."

# Fast-forward only — refuses to merge if a 3-way merge would be needed.
# That protects main: if polish-loop diverged (e.g. you committed to main
# separately), the merge aborts and you resolve manually.
if ! git merge --ff-only origin/polish-loop; then
  echo "❌ Can't fast-forward. polish-loop has diverged from main."
  echo "   You probably committed to main directly. Resolve manually:"
  echo "     git log main..origin/polish-loop --oneline"
  echo "     git rebase main origin/polish-loop  # or merge with conflicts"
  exit 1
fi

# Sanity check: tsc + jest must still pass on the merged state
echo "→ Verifying tsc + jest on merged main..."
if ! npx tsc --noEmit; then
  echo "❌ TypeScript errors after merge. Aborting push — investigate first."
  git reset --hard origin/main
  exit 1
fi
if ! npx jest --silent > /dev/null 2>&1; then
  echo "❌ Jest failing after merge. Aborting push — investigate first."
  git reset --hard origin/main
  exit 1
fi

# Push to main
echo "→ Pushing to origin/main..."
git push origin main

echo ""
echo "✓ Merged $AHEAD polish commits into main."
echo "  GitHub: https://github.com/devonparks/drop4"
