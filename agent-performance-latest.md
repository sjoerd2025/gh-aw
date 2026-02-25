# Agent Performance Analysis - 2026-02-25

**Run:** [§22408567616](https://github.com/github/gh-aw/actions/runs/22408567616)
**Status:** ✅ IMPROVED — AI Moderator fully recovered; Issue Monster P1 lockdown persists (no fix path)
**Analysis Period:** 2026-02-19 → 2026-02-25 (7-day focus, 14-day data)

## Executive Summary

- **Agent Quality:** 89/100 (↓ 2 from 91)
- **Agent Effectiveness:** 88/100 (↑ 1 from 87)
- **Critical Agent Issues:** 1 ongoing ❌ (Issue Monster lockdown — ALL fix paths CLOSED)
- **Non-IM Success Rate:** 96% (27/28) ↑ from 95%
- **Total Cost (today):** ~$6.14 | **Total Tokens:** ~68.8M
- **Total Runs (today):** 29 completed

## Key Metrics

| Metric | Current | Previous | Change |
|--------|---------|----------|--------|
| Agent Quality | 89/100 | 91/100 | ↓ 2 |
| Agent Effectiveness | 88/100 | 87/100 | ↑ 1 |
| Non-IM Success Rate | 96% (27/28) | 95% (20/21) | ↑ 1% |
| Critical Issues | 1 (Issue Monster) | 1 (AI Moderator) | → type changed |
| AI Moderator Score | 91/100 | 72/100 | ↑ 19 |

## ✅ RESOLVED: AI Moderator GitHub MCP Recovery

All 11 AI Moderator runs today completed successfully (was ~50% failure yesterday due to Docker MCP intermittency). `mode: remote` appears stable.

## 🔥 P0 Still Burning: Issue Monster (2/2 failures today)
ALL fix paths now CLOSED:
- #17414 (add GH_AW_GITHUB_TOKEN): CLOSED "not_planned"
- #17807 (remove lockdown:true): CLOSED "not_planned" 2026-02-25
- Manual admin intervention required

## 🆕 NEW: Semantic Function Refactoring High Cost
- $4.82/run, 469k tokens, 87 blocked firewall requests
- Created issue #18388
- Investigate blocked requests (likely Serena MCP local sockets)

## Top Performing Agents

1. **Smoke Tests Copilot/Claude/Codex (95/100):** All passing today
2. **The Great Escapi (92/100):** Security maintained, 3.5m
3. **AI Moderator (91/100):** 11/11 recovered ↑ from 72/100
4. **Agent Container Smoke Test (90/100):** Clean, 3.5m
5. **Daily Safe Outputs Conformance Checker (90/100):** 3.2m, 4 turns

## ⚠️ Monitor

- **Semantic Function Refactoring:** $4.82/run — watch for cost growth
- **Auto-Triage Issues:** 1/2 error today — may be lockdown-related
- **Smoke Claude:** 12.2m, 40 turns — highest duration smoke test

## Active Issues / Tracking

- ❌ **P0:** Issue Monster + 3 related workflows failing — lockdown token missing, NO fix path
- ✅ **RESOLVED:** AI Moderator Docker MCP degradation — remote mode stable
- 🆕 **NEW:** Semantic Function Refactoring high cost — issue #18388
- ✅ **All smoke tests:** Passing on main
