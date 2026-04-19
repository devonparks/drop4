# Callstack Incubator Package Status — 2026-04-18

Auditing which `@callstackincubator/*` and Callstack-ecosystem packages from `amg-tech-stack.md` actually exist on npm right now vs. which are forward-looking / unreleased.

## Confirmed on npm (installable today)

| Package | Status | Used in Drop4? |
|---|---|---|
| `react-native-legal` | ✅ v1.6.2, published 2026-03-09 | ✅ Installed `041cce1`, wired into Settings |
| `@callstack/licenses` | ✅ v0.3.1, published 2026-03-09 | No — same team as react-native-legal, could use standalone for Node projects |

## Referenced in tech-stack but NOT found on npm

| Package | Note |
|---|---|
| `@callstackincubator/agent-skills` | Not found via npm search. The "Agent Skills" concept exists (agentskills.io) but this specific npm package doesn't resolve. Likely installed via Claude Code plugin marketplace, not npm. |
| `@callstackincubator/agent-device` | Not found. Sprint prompt called this out as an alternative to Argent for iOS Simulator driving. Argent (`@swmansion/argent`) is the real option. |
| `@callstackincubator/agent-react-devtools` | **Not found.** Sprint Task 4 depended on this. Blocked until published. |
| `@callstackincubator/ai` | Not found. On-device LLM for RPS+ v1.1. Blocked. |
| `@callstackincubator/voltra` | Not found. Live Activities / Dynamic Island library. Blocked. |

## Recommendation

Update `amg-tech-stack.md` to mark the unreleased ones as **STATUS: UPSTREAM PENDING** so we don't lose time chasing them in future sessions. The real infrastructure gains come from:

- **Argent** (`@swmansion/argent`) — published, drives iOS Simulator from Claude Code. Needs macOS.
- **react-native-legal** — published, shipped in Drop4 as of this session.
- **Reanimated 4 + worklets** (already in Drop4 at Reanimated 3.x tier, upgrade pending).
- **LegendList** (`@legendapp/list`) — published, useful for MatchHistory if it grows.

Check back on the missing packages in 4-6 weeks when the Callstack ecosystem catches up to their docs.

## What this means for Drop4's sprint

- **Task 4 (DevTools MCP) is blocked** — skip for now, unblock when the package ships.
- Sprint otherwise proceeds as-written with Tasks 2, 5, 6.
