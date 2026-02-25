# Workflow Health Dashboard - 2026-02-25

## Overview
- **Total workflows**: 158 executable (100% compiled ✅)
- **Healthy**: 153 (97%)
- **Failing (P1)**: 4 workflows (3%) — lockdown token failures (ongoing, 3+ weeks)
- **Critical**: 0 (0%)
- **Compilation coverage**: 158/158 (100% ✅)
- **Outdated lock files**: 0 (sub-second timing diff only — not actually stale ✅)
- **Overall health score**: 78/100 (↓ 2 from 80 — fix path #17807 rejected)

## Status: DEGRADED — P1 Lockdown Failures, Fix Path Closed

Issue #17807 (remove lockdown:true patch) was **CLOSED as "not_planned"** on 2026-02-25 03:30.
Lockdown issue root cause (#17414) also closed "not_planned" previously.
No known fix path currently open for the 4 failing workflows.

### Health Assessment Summary

- ✅ **0 compilation failures** (all 158 executable workflows compile)
- ✅ **100% compilation coverage** (no missing lock files)
- ✅ **0 truly outdated lock files** (21 files have sub-ms timing diff — same commit, not stale)
- ❌ **P1: Lockdown token missing** — 4 workflows failing (3+ week streak)
  - Issue Monster: ~50+ failures/day (every 30 min) — run #2116 failed today
  - PR Triage Agent: failing (every 6h) — run #136 failed today
  - Daily Issues Report: failing (daily) — run #115 failed today
  - Org Health Report: failing (weekly) — run #22-#23 consecutive failures
- ✅ **Smoke Copilot main**: passing (run #2122 success)
- ✅ **Smoke Claude/Codex/Gemini**: passing
- ✅ **Metrics Collector**: 5+ consecutive successes (run #69 success)
- ⚠️ **AI Moderator**: mixed success/action_required — monitoring (yesterday had 1 failure)

## Root Cause: Lockdown Mode + Missing GH_AW_GITHUB_TOKEN

13 workflows use `lockdown: true`. Currently failing (high frequency):
- issue-monster (every 30min) — ~50 fails/day
- pr-triage-agent (every 6h) — ~4 fails/day
- daily-issues-report (daily) — 1 fail/day
- org-health-report (weekly) — 1 fail/week

**Fix path status**: CLOSED
- #17414 (add GH_AW_GITHUB_TOKEN) — CLOSED "not_planned"
- #17807 (remove lockdown:true) — CLOSED "not_planned" 2026-02-25

## Issues Tracked

- **#17387** [P1] Issue Monster failed — OPEN (165+ comments, run #2116 failed today)
- **#16801** [P1] PR Triage Agent failed — OPEN (expires Feb 26, run #136 failed today)
- **#17864** [P1] Org Health Report failed — OPEN (expires Mar 2)
- **#17414** [Root Cause] GH_AW_GITHUB_TOKEN — CLOSED "not_planned"
- **#17807** Fix: remove lockdown:true — CLOSED "not_planned" (2026-02-25)
- **#17408** No-Op Runs — OPEN (normal behavior)

## Actions Taken This Run (2026-02-25)

- Added comment to #17387 with updated status (fix path closed, lockdown ongoing)
- Updated workflow-health-latest.md and shared-alerts.md
- Health score: 78/100 (↓ 2 — fix path rejected, no new resolution path)

## Run Info
- Timestamp: 2026-02-25T07:32:00Z
- Workflow run: [§22386814001](https://github.com/github/gh-aw/actions/runs/22386814001)
- Health score: 78/100 (↓ 2 from yesterday's 80)
