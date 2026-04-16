#!/usr/bin/env bash
# Drop4 Continuous Polish Loop
# ============================
# Runs Claude Code in headless mode on an infinite loop, applying one
# small polish per iteration. Uses YOUR local git credentials to push,
# so auth works (unlike the remote trigger attempt that couldn't push).
#
# Usage:
#   cd ~/Desktop/Drop4
#   ./tools/polish-loop.sh
#
# To stop: Ctrl+C in the terminal, or from another terminal:
#   touch ~/Desktop/Drop4/.STOP_POLISH
#
# Logs: tools/polish-loop.log
# Status: tail -f tools/polish-loop.log

set -u  # Error on undefined variables (but not -e — we want to survive failures)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

LOG="$ROOT/tools/polish-loop.log"
STOP_FILE="$ROOT/.STOP_POLISH"
ITER=0

# ANSI colors for the terminal (log file gets plain text via tee)
C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'
C_RED='\033[0;31m'
C_CYAN='\033[0;36m'
C_OFF='\033[0m'

log() {
  local msg="$1"
  local ts
  ts=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${C_CYAN}[${ts}]${C_OFF} $msg" | tee -a "$LOG"
}

die() {
  log "${C_RED}FATAL:${C_OFF} $1"
  exit 1
}

# Remove any prior stop signal
rm -f "$STOP_FILE"

log "${C_GREEN}=== Drop4 polish loop started ===${C_OFF}"
log "Root: $ROOT"
log "To stop: Ctrl+C or 'touch $STOP_FILE'"

# The prompt given to each Claude iteration. Self-contained — the agent
# has no memory between runs, so everything it needs is here or in the
# docs it's told to read.
POLISH_PROMPT=$(cat <<'PROMPT'
You are a polish agent for Drop4. ONE iteration of a loop a human started. Do ONE small, safe improvement and commit. Then exit.

Context files to read first (in order):
1. CLAUDE.md
2. docs/POLISH_CHARTER.md
3. docs/POLISH_FOLLOWUPS.md
4. docs/3D_SYSTEM_OVERVIEW.md

Then: git log --oneline -20   (see what just landed, don't duplicate)

What counts as polish: visual feel, UX smoothness, dead-code cleanup, missing haptics/sounds, accessibility labels, fade-ins, empty states, typography, spacing, unguarded console.log, small TODO/FIXME.

What does NOT count: new features, refactors, package installs, anything in src/engine/, anything bigger than ~50 lines changed.

Pick ONE target (priority order):
1. An open item from docs/POLISH_FOLLOWUPS.md
2. Any legacy AnimatedCharacter / CharacterAvatar usage that should be Character3DPortrait
3. A Pressable missing accessibilityLabel
4. An unguarded console.log (should be `if (__DEV__) console.log(...)`)
5. A dead import
6. A cramped empty state or missing fade-in on a recently-modified screen

Before committing, REQUIRED:
- `npx tsc --noEmit` → 0 errors
- `npx jest` → 3 tests pass

If either fails: revert your changes with `git checkout -- <file>` and mark the idea as BLOCKED in docs/POLISH_FOLLOWUPS.md, then commit only the doc change.

Commit message format: `polish: <scope> — <description>`

Include the trailer:
Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>

Push with: `git push origin main`.

HARD RULES (will break the build if violated):
- GLB files under src/assets/models/ ARE gitignored but `require('../assets/models/...')` calls ARE VALID. NEVER remove them.
- Character3D.tsx and Pet3D.tsx have critical skeleton rebinding + animation track path stripping (commit 67c3d97). Do not simplify or regress.
- Don't touch src/engine/.
- Don't install packages.
- ONE commit per run.

Begin now. Keep the run under 5 minutes of work. When done, print "DONE: <commit-sha>" or "SKIPPED: <reason>".
PROMPT
)

# Loop until the user stops us
while true; do
  if [[ -f "$STOP_FILE" ]]; then
    log "${C_YELLOW}Stop signal detected. Exiting cleanly.${C_OFF}"
    rm -f "$STOP_FILE"
    break
  fi

  ITER=$((ITER + 1))
  log "${C_GREEN}── Iteration #$ITER ──${C_OFF}"

  # Always start fresh from remote
  log "Pulling latest..."
  if ! git pull --rebase origin main >> "$LOG" 2>&1; then
    log "${C_YELLOW}Pull failed — aborting any rebase and skipping iteration.${C_OFF}"
    git rebase --abort 2>/dev/null || true
    sleep 30
    continue
  fi

  START_TIME=$(date +%s)
  BEFORE_SHA=$(git rev-parse HEAD)

  # Invoke Claude headless. You're on a Claude Max subscription (verified
  # via empty ANTHROPIC_API_KEY), so --max-budget-usd limits token-spend
  # per iteration but doesn't bill real money. Raised to $5 so iterations
  # have enough headroom to read docs + edit + tsc + jest + commit +
  # push without aborting mid-way. When you hit your plan's rate limit,
  # the CLI just errors and the loop skips iterations until it resets.
  # < /dev/null so the CLI doesn't wait for stdin.
  log "Invoking Claude (max \$5/iter token budget, subscription-billed)..."
  claude -p "$POLISH_PROMPT" \
    --permission-mode bypassPermissions \
    --max-budget-usd 5 \
    --effort medium \
    < /dev/null \
    >> "$LOG" 2>&1 || {
      log "${C_YELLOW}Claude iteration failed or exited non-zero.${C_OFF}"
    }

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  AFTER_SHA=$(git rev-parse HEAD)

  if [[ "$BEFORE_SHA" != "$AFTER_SHA" ]]; then
    COMMIT_MSG=$(git log -1 --pretty=%s)
    log "${C_GREEN}✓ Iter #$ITER committed in ${DURATION}s:${C_OFF} $COMMIT_MSG"
  else
    log "${C_YELLOW}○ Iter #$ITER produced no commit (${DURATION}s).${C_OFF}"
  fi

  # Small breather between iterations
  sleep 15
done

log "${C_GREEN}=== Polish loop exited after $ITER iterations ===${C_OFF}"
