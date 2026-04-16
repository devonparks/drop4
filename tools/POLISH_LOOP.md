# Drop4 Continuous Polish Loop

Runs Claude Code headless on an infinite loop on YOUR machine, using YOUR git credentials. Every iteration picks a small polish task, verifies it compiles + tests pass, commits, pushes.

**This is what you want.** Remote cron triggers can't push (no git auth). This runs locally so push works.

## Start it

Open Git Bash (or WSL / any bash shell) in the Drop4 directory:

```bash
cd ~/Desktop/Drop4
./tools/polish-loop.sh
```

It runs in the foreground and prints progress. Leave the terminal open; your PC stays on; commits roll in every 3-7 minutes.

## Stop it

**Option A:** Press `Ctrl+C` in the terminal.
**Option B:** From any other terminal, signal a clean stop:
```bash
touch ~/Desktop/Drop4/.STOP_POLISH
```

The loop checks for that file at the top of every iteration and exits cleanly.

## What it does each iteration

1. `git pull --rebase origin main` (catch any changes made elsewhere)
2. Invokes `claude -p "<polish prompt>"` in headless mode with:
   - `--permission-mode bypassPermissions` (no interactive prompts)
   - `--max-budget-usd 1.50` (hard cap per iteration — your wallet is safe)
   - `--effort low` (fast + cheap)
3. The inner Claude agent reads `docs/POLISH_CHARTER.md` and related docs, picks a task, edits, runs `npx tsc --noEmit` + `npx jest`, commits with the standard trailer, pushes
4. Loop waits 15s, checks stop signal, repeats

## Billing — subscription, not wallet

Verified: the `claude` CLI on this machine uses OAuth to your Claude Max account, not per-token API billing. Proof: `ANTHROPIC_API_KEY` is unset and `claude -p` invocations succeed. That means:

- **Every iteration counts against your Claude Max quota**, same as talking to Claude in the desktop app
- **No real dollars leave your account** from running this loop
- When you hit your plan's rate limit, the CLI errors and the loop sits idle until quota resets
- The `--max-budget-usd 5` flag in the script is a token-spend throttle per iteration (not a dollar cap), keeping any one iteration from consuming your entire daily quota

Leave it running as long as you want — the only cost is your subscription you're already paying for. When you're rate-limited, it auto-pauses.

To stop early: `Ctrl+C` in the terminal, or `touch ~/Desktop/Drop4/.STOP_POLISH` from another terminal.

## Logs

- `tools/polish-loop.log` — every iteration's full stdout/stderr
- `tail -f tools/polish-loop.log` in another terminal to watch progress
- `git log --oneline -20` to see the actual commits landing

## Tested

**Iteration #1 was verified end-to-end** before you ran this loop. Commit `ca78590` landed on `origin/main`: `polish: App.tsx — guard font-load console.warn behind __DEV__`. The pipeline works.

## Troubleshooting

**"claude: command not found"** — install Claude Code CLI first: https://claude.com/claude-code

**"No unguarded console.log found" and no commit** — the agent gave up because everything's already polished. That's a win, not a bug. It'll try a different target next iteration.

**Loop prints ○ every iteration (no commits)** — the charter might have hit all easy targets. Open `docs/POLISH_FOLLOWUPS.md` and add 5-10 concrete ideas. The agents will pick them off.

**Git push rejected** — another push happened while the agent was working. Loop script handles this via pull-rebase on the next iteration.

**Runaway costs** — kill it (`touch .STOP_POLISH`) and tighten the budget cap in `polish-loop.sh` line with `--max-budget-usd`.
