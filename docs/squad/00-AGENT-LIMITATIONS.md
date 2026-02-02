# Agent Capabilities (Claude Code)

**Updated:** 2026-02-02
**Status:** ⚠️ PARTIAL - Verify outputs

## Summary

Subagents via `Task` tool have **variable reliability** for file writes. Simple tasks work, but complex multi-file implementations may report success without creating files. **Always verify agent outputs.**

## What Agents CAN Do Reliably

| Capability | Status |
|------------|--------|
| Read files | ✅ Reliable |
| Search/grep codebase | ✅ Reliable |
| Generate content/code | ✅ Reliable |
| Think/plan/analyze | ✅ Reliable |
| Answer questions | ✅ Reliable |
| Simple file writes | ✅ Works |

## What Needs Verification

| Capability | Status |
|------------|--------|
| Complex multi-file implementations | ⚠️ May hallucinate |
| React/frontend components | ⚠️ Project structure assumptions |
| Install packages | ⚠️ Verify package.json |
| Git commits | ⚠️ Use main Claude |

## Observed Behavior (2026-02-02)

```
Test 1: Simple file write
- Agent: general-purpose
- Task: Create single test file
- Result: ✅ File created successfully

Test 2: Complex implementation (4 agents parallel)
- Agents: designer, engineer (x2), designer
- Task: Create 20+ React components + libs
- Result: ❌ Agents reported success but files not created
- Fix: Main Claude created actual implementations
```

## Recommended Workflow

```
Research/Analysis     → Use agents (reliable)
Simple file writes    → Use agents (verify exists)
Complex multi-file    → Main Claude directly
React/frontend        → Check project type first
Backend libs          → Agents OK, verify compilation
```

## Available Agent Types

| Agent | Best For |
|-------|----------|
| `general-purpose` | Research, simple tasks |
| `Explore` | Codebase exploration |
| `Plan` | Architecture design |
| `engineer` | Code generation (verify output) |
| `designer` | UI design specs (not implementation) |
| `database` | Schema design, queries |
| `security` | Audits, vulnerability scanning |
| `cloud` | Cloudflare, GitHub Actions |
| `researcher` | Web research, analysis |
| `reviewer` | Code review (read-only) |

## Best Practices

1. **Always verify:** Check files exist after agent claims success
2. **Match project type:** Don't assume React/Next.js - check first
3. **Simple tasks:** Agents work best for focused, single-file tasks
4. **Complex work:** Use agents for design/specs, main Claude for implementation
5. **Parallel research:** Great for gathering info from multiple sources
